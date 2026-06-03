import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
import { createClient } from "@libsql/client";

const { loadEnvConfig } = nextEnv;
const projectRoot = process.cwd();
loadEnvConfig(projectRoot);

const config = {
  sourceApiUrl: process.env.CONTENT_SOURCE_API_URL ?? "https://service.krzacg.com/api/posts/hot-feed",
  categorySlugs: process.env.CONTENT_SYNC_CATEGORY_SLUGS ?? "hentai,game",
  excludeKeywords: (process.env.CONTENT_SYNC_EXCLUDE_KEYWORDS ?? "mmd,vam,virt-a-mate").toLowerCase().split(",").map(s => s.trim()).filter(Boolean),
  imageCdnBase: process.env.CONTENT_SYNC_IMAGE_CDN ?? "https://upload-cdn.b-cdn.net",
  pageSize: Math.min(Number(process.env.CONTENT_SYNC_PAGE_SIZE ?? 50), 50),
  maxPages: Number(process.env.CONTENT_SYNC_MAX_PAGES ?? 2),
  dbUrl: process.env.TURSO_DATABASE_URL,
  dbToken: process.env.TURSO_AUTH_TOKEN,
};

if (!config.dbUrl) {
  console.error("[Sync] TURSO_DATABASE_URL is not set. Sync aborted.");
  process.exit(1);
}

const db = createClient({ url: config.dbUrl, authToken: config.dbToken });

// ─── Helpers ───────────────────────────────────────────────────────────────

const slugify = (value, id) => {
  let base = value
    .replace(/[^\x00-\x7F]+/g, "-")           // strip all non-ASCII (CJK, Japanese, emoji, etc.)
    .replace(/[【】\[\]（）(){}\u003c\u003e"'`~!@#$%^\u0026*+=,;:?\\|/\s]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  if (base.length > 60) base = base.slice(0, 60);
  if (!base) base = "game";
  const suffix = id ? id.slice(-6) : crypto.randomUUID().slice(0, 6);
  return `${base}-${suffix}`;
};

const stripHtml = (html) => {
  if (!html) return "";
  return html
    .replace(/\u003c[^\u003e]+\u003e/g, " ")
    .replace(/\u0026nbsp;/g, " ")
    .replace(/\u0026quot;/g, '"')
    .replace(/\u0026amp;/g, "\u0026")
    .replace(/\u0026lt;/g, "\u003c")
    .replace(/\u0026gt;/g, "\u003e")
    .replace(/\s+/g, " ")
    .trim();
};

const cleanTitle = (value) => {
  let clean = value;
  clean = clean.replace(/【.*?】/g, " ").replace(/\[.*?\]/g, " ");
  clean = clean.replace(/（.*?）/g, " ");
  clean = clean.replace(/\b[vV](er\.?\s?)?\d+(\.\d+)*\s*(?:beta|alpha|rc|patch|build|fix)?\b/gi, " ");
  clean = clean.replace(/\b(度盘|网盘|解压码?|大小|密码)[\/:\s]*[^\s\[【]*/gi, " ");
  clean = clean.replace(/\b\d+(\.\d+)?\s*(GB|G|MB|M)\b/gi, " ");
  clean = clean.replace(/[\/\|]+/g, " ").replace(/-+/g, " ").replace(/\s+/g, " ").trim();
  if (clean.length < 3) {
    clean = value.replace(/【.*?】/g, " ").replace(/\[.*?\]/g, " ").replace(/（.*?）/g, " ").trim();
  }
  return clean || value;
};

// ─── DB Schema ─────────────────────────────────────────────────────────────

async function initDatabase() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      cover TEXT,
      tags TEXT,
      download TEXT,
      download_label TEXT,
      views INTEGER DEFAULT 0,
      source_id TEXT,
      source_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      published_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_games_slug ON games(slug)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_games_views ON games(views DESC)`);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS guides (
      slug TEXT PRIMARY KEY,
      markdown TEXT,
      provider TEXT,
      model TEXT,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (slug) REFERENCES games(slug) ON DELETE CASCADE
    )
  `);
}

// ─── Import legacy local JSON (one-time) ───────────────────────────────────

async function importLocalData() {
  const gamesPath = path.join(projectRoot, "data", "generated", "games.json");
  try {
    const data = await fs.readFile(gamesPath, "utf8");
    const games = JSON.parse(data);
    console.log(`[Sync] Found ${games.length} local games in JSON. Checking for import...`);
    for (const game of games) {
      const existing = await db.execute({ sql: "SELECT 1 FROM games WHERE slug = ? LIMIT 1", args: [game.slug] });
      if (existing.rows.length > 0) continue;
      console.log(`[Sync] Importing local game: ${game.title}`);
      let markdown = "";
      try {
        const contentPath = path.join(projectRoot, "data", "generated", "content", `${game.slug}.json`);
        const contentData = await fs.readFile(contentPath, "utf8");
        markdown = JSON.parse(contentData).markdown || "";
      } catch { /* no-op */ }
      await db.execute({
        sql: `INSERT INTO games (id, slug, title, summary, cover, tags, download, download_label, views, source_id, source_hash, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        args: [crypto.randomUUID(), game.slug, game.title, game.summary, game.cover,
          JSON.stringify(game.tags), game.download, game.downloadLabel, game.views, game.sourceId, game.sourceHash],
      });
      if (markdown) {
        await db.execute({
          sql: `INSERT INTO guides (slug, markdown, provider, model, generated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          args: [game.slug, markdown, "local-import", "original"],
        });
      }
    }
  } catch { /* no-op */ }
}

// ─── Fetch from main site API ──────────────────────────────────────────────

async function fetchSourcePosts() {
  const items = [];
  for (let page = 1; page <= config.maxPages; page += 1) {
    const url = new URL(config.sourceApiUrl);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(config.pageSize));
    url.searchParams.set("sort", "views");
    if (config.categorySlugs) url.searchParams.set("category_slugs", config.categorySlugs);

    console.log(`[Sync] Fetching page ${page}: ${url.toString()}`);
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          "Referer": "https://krzacg.com/",
          "Origin": "https://krzacg.com",
        }
      });
      if (!response.ok) {
        console.error(`[Sync] API error on page ${page}: ${response.status}`);
        break;
      }
      const payload = await response.json();
      let batch = Array.isArray(payload?.data) ? payload.data : [];

      if (config.categorySlugs) {
        const allowed = config.categorySlugs.split(",").map(s => s.trim());
        batch = batch.filter(post => {
          const cats = Array.isArray(post.categories) ? post.categories : [];
          return cats.some(c => allowed.includes(c.slug));
        });
      }

      if (config.excludeKeywords.length > 0) {
        batch = batch.filter(post => {
          const lowerTitle = (post.title || "").toLowerCase();
          return !config.excludeKeywords.some(kw => lowerTitle.includes(kw));
        });
      }

      console.log(`[Sync] Page ${page} returned ${batch.length} items (total: ${payload?.total ?? "unknown"})`);
      if (batch.length === 0) break;
      items.push(...batch);
    } catch (err) {
      console.error(`[Sync] Failed to fetch page ${page}:`, err.message);
      break;
    }
  }
  console.log(`[Sync] Total posts fetched from API: ${items.length}`);
  return items;
}

// ─── Auto-migrate old Unicode slugs to ASCII ───────────────────────────────

async function migrateOldSlugs() {
  const rows = await db.execute("SELECT slug FROM games ORDER BY slug");
  let migrated = 0;
  let skipped = 0;

  for (const row of rows.rows) {
    const oldSlug = row.slug;
    const newSlug = slugify(oldSlug, oldSlug); // re-process through ASCII-only slugify

    if (newSlug === oldSlug) { skipped++; continue; }

    // Ensure uniqueness
    let finalSlug = newSlug;
    let collision = await db.execute({ sql: "SELECT 1 FROM games WHERE slug = ? LIMIT 1", args: [finalSlug] });
    let suffix = 1;
    while (collision.rows.length > 0 && finalSlug !== oldSlug) {
      finalSlug = `${newSlug}-${suffix}`;
      suffix++;
      collision = await db.execute({ sql: "SELECT 1 FROM games WHERE slug = ? LIMIT 1", args: [finalSlug] });
    }

    try {
      // 1. Read existing guide (if any) so we don't lose content
      const guideRes = await db.execute({
        sql: "SELECT markdown, provider, model, generated_at FROM guides WHERE slug = ?",
        args: [oldSlug],
      });
      const guideRow = guideRes.rows[0];

      // 2. Delete old guide first (removes FK reference)
      if (guideRow) {
        await db.execute({ sql: "DELETE FROM guides WHERE slug = ?", args: [oldSlug] });
      }

      // 3. Update games slug (no dangling FK now)
      await db.execute({ sql: "UPDATE games SET slug = ? WHERE slug = ?", args: [finalSlug, oldSlug] });

      // 4. Re-insert guide with new slug
      if (guideRow) {
        await db.execute({
          sql: "INSERT INTO guides (slug, markdown, provider, model, generated_at) VALUES (?, ?, ?, ?, ?)",
          args: [finalSlug, guideRow.markdown, guideRow.provider, guideRow.model, guideRow.generated_at],
        });
      }

      migrated++;
      if (migrated <= 5 || migrated % 100 === 0) {
        console.log(`[Migrate] "${oldSlug.slice(0, 50)}..." → "${finalSlug}"`);
      }
    } catch (err) {
      console.error(`[Migrate] FAILED "${oldSlug}": ${err.message}`);
    }
  }

  console.log(`[Migrate] Done. Migrated: ${migrated} | Skipped: ${skipped}`);
  return migrated;
}

// ─── Fallback guide generator ──────────────────────────────────────────────

const buildFallback = (game) => {
  const tags = Array.isArray(game.tags) ? game.tags : [];
  const tagStr = tags.slice(0, 4).join("、") || "视觉小说";
  const tagPair = tags.slice(0, 2).join("、") || "Galgame";

  return `## 游戏剧情简介

${game.title} 是一款融合了 ${tagStr} 元素的视觉小说（Visual Novel）作品。本作在剧情编排、角色塑造以及画面表现上均有出色的发挥，为玩家呈现了一个充满张力的叙事世界。

${game.summary ? game.summary.slice(0, 300) : ""}

游戏整体节奏把控得当，前期铺垫与后期高潮之间的衔接流畅自然。对于喜欢 ${tagPair} 类型作品的玩家来说，本作的剧情深度和情感表达都达到了同类作品中的上乘水准。

## 核心推荐理由

**题材契合度高**：本作在 ${tagStr} 等核心元素的处理上非常成熟，剧情分支设计合理，不同路线的情感冲击力各有千秋。

**系统体验优秀**：游戏内置了完善的存档管理系统和回想模式，方便玩家在多条路线之间自由切换，无需重复体验共通线内容。

**制作水准精良**：从原画质量到配音演出，再到背景音乐的氛围营造，本作在制作层面展现了相当高的完成度，能够给玩家带来沉浸式的游玩体验。

**攻略价值突出**：本作的关键分歧点较为隐蔽，部分选项对结局走向的影响并不直观，因此参考攻略可以大幅降低重复游玩的成本，提升全收集效率。

## 角色路线与分歧选项

本作采用经典的多线分支结构，玩家在游戏过程中会遇到若干关键选项，这些选项将直接影响角色好感度的走向以及最终解锁的结局类型。

**关键分歧点提示**：

- 建议在第 3-5 个剧情选项处保留独立存档，此处通常是角色路线的第一个重要分岔口
- 部分角色的专属路线需要满足特定前置条件才能开启，建议优先完成共通线后再回头回收
- 如果某个选项看似无关紧要，实则可能悄悄影响好感度计量，建议养成每个选项前存档的习惯

**路线解锁顺序建议**：

1. **一周目**：体验共通线主线剧情，熟悉世界观和主要角色关系
2. **二周目起**：根据攻略提示选择特定角色的倾向选项，逐步解锁各角色个人结局
3. **最终周目**：回收隐藏结局或真结局，此时通常已经解锁了快速跳过已读文本的功能

## 完美攻略全流程

### 共通线要点

- 在前几个自由行动环节中，尽量平均分配与各角色的互动次数，避免因过早锁定某条路线而错过其他角色的关键事件
- 注意收集场景中的隐藏线索，部分信息会在后续周目中解锁新的对话选项

### 分歧点存档策略

- **存档点 A**：第一个重要选项前（通常是标题画面后 20-30 分钟处）
- **存档点 B**：角色路线分岔口（根据选择进入不同角色专属章节）
- **存档点 C**：各角色路线的最终章节前（用于回收 Good End / Bad End）

### 结局回收顺序

建议按照 "普通结局 → 角色 Good End → 隐藏结局 → 真结局" 的顺序进行回收。部分真结局的解锁条件较为苛刻，可能需要通关全部角色的 Good End 后才能开启。

## 全 CG 与回想场景解锁

本作的全 CG 收集与回想场景解锁主要依赖于以下条件的达成：

- **通关全结局**：包括所有角色的 Good End 和至少一个 Bad End
- **特定事件触发**：部分回想需要在特定路线中选择特定选项才能解锁
- **多周目继承**：通关后通常会解锁快速跳过和章节选择功能，方便回收遗漏内容

**回想模式说明**：

进入回想模式后，已解锁的场景会以列表形式呈现，未解锁的场景显示为锁定状态并附有解锁条件的模糊提示。建议参考本站的详细攻略来确认每个回想的具体触发条件。

## 存档管理与安装说明

### 存档位置（Windows 常见路径）

- 默认存档通常位于：\`C:\\\\Users\\\\[用户名]\\\\AppData\\\\Roaming\\\\[厂商名]\\\\[游戏名]\\\\\`
- 部分游戏使用注册表或特定目录存储存档，安装时请注意汉化补丁的说明文档

### 版本兼容性

- 官方中文版与个人汉化版的存档通常不互通，切换版本前务必备份存档文件
- 如果游戏使用了云存档功能（如 Steam 云），请注意本地存档与云端存档的同步冲突

### 安装注意事项

- 安装路径中**不要包含中文字符**，否则可能导致游戏无法正常运行或存档读写失败
- 部分汉化补丁需要覆盖原始游戏文件，建议先完整备份原始安装目录
- 如遇到黑屏或闪退，尝试以兼容模式运行或更新显卡驱动

## 常见问题 FAQ

### 这款游戏有官方中文吗？

目前市面上的流通版本多为精修汉化版。建议关注官方社交媒体或汉化组的公告，以获取最新的本地化进度信息。

### 为什么我的存档突然消失了？

最常见的原因是存档路径中包含中文或特殊字符，导致游戏无法正常读写存档文件。此外，云存档同步冲突也可能导致本地存档被覆盖。建议定期检查存档文件的备份状态。

### 如何快速达成真结局？

真结局通常需要满足多项前置条件，包括通关特定角色的路线、在关键选项中做出正确选择等。建议参考本站的完美路线攻略，按照推荐的顺序进行游玩，可以最高效地解锁真结局。

### 某些回想场景一直解锁不了怎么办？

回想解锁失败通常是因为遗漏了某个前置事件。建议对照回想列表中的提示信息，检查是否跳过了某个看似无关紧要的选项或场景。部分隐藏回想需要特定的多周目条件才能触发。

## 类似题材作品推荐

如果你喜欢 ${game.title} 所呈现的 ${tagPair} 风格，以下几部同类佳作也值得关注：

- **同类型高人气作品**：带有 ${tags[0] || "剧情向"} 标签的热门 Galgame，通常在叙事深度和角色刻画上有相似的表现力
- **同画师/同会社作品**：关注本作的原画师或开发商，他们的其他作品往往在画风和氛围上有高度的一致性
- **题材扩展作品**：尝试带有 ${tags[2] || tags[0] || "剧情互动"} 元素的相关作品，可以拓展你对这一题材的认知边界
`;
};

async function fillEmptyGuides() {
  const result = await db.execute(`
    SELECT g.slug, g.title, g.summary, g.tags, g.views
    FROM games g
    LEFT JOIN guides gd ON g.slug = gd.slug
    WHERE gd.slug IS NULL
       OR gd.markdown IS NULL
       OR LENGTH(TRIM(gd.markdown)) < 200
    ORDER BY g.views DESC
  `);

  const pending = result.rows;
  console.log(`\n[Fallback] Found ${pending.length} games without guides.`);
  if (pending.length === 0) return 0;

  let success = 0;
  for (let i = 0; i < pending.length; i++) {
    const row = pending[i];
    const title = (row.title || "").trim();
    const tags = (() => { try { return JSON.parse(row.tags || "[]"); } catch { return []; } })();
    const markdown = buildFallback({ title, summary: row.summary || "", tags });

    try {
      await db.execute({
        sql: `INSERT INTO guides (slug, markdown, provider, model, generated_at)
              VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(slug) DO UPDATE SET
                markdown = excluded.markdown,
                provider = excluded.provider,
                model = excluded.model,
                generated_at = CURRENT_TIMESTAMP`,
        args: [row.slug, markdown, "sync-fallback", "rich-template"],
      });
      success++;
      if (success <= 3 || success % 500 === 0) {
        console.log(`[Fallback] [${i + 1}/${pending.length}] ✅ ${title.slice(0, 50)}`);
      }
    } catch (err) {
      console.error(`[Fallback] [${i + 1}/${pending.length}] ❌ ${title.slice(0, 50)}: ${err.message}`);
    }
  }

  console.log(`[Fallback] Done. Filled: ${success}/${pending.length}`);
  return success;
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  await initDatabase();
  await importLocalData();

  // Step 1: sync new posts from main site
  console.log("\n========== Step 1: Sync from API ==========");
  const posts = await fetchSourcePosts();
  console.log(`[Sync] Found ${posts.length} posts from API.`);

  let created = 0, updated = 0, skipped = 0;
  for (const post of posts) {
    const tags = Array.isArray(post.tags) ? post.tags.map((t) => t.name).filter(Boolean) : [];
    const cleanedTitle = cleanTitle(post.title);
    const slug = slugify(post.title, post._id);
    const sourceHash = crypto.createHash("sha1").update([post._id, post.updated_at].join("|")).digest("hex");

    const existing = await db.execute({ sql: "SELECT source_hash FROM games WHERE slug = ?", args: [slug] });
    if (existing.rows[0]?.source_hash === sourceHash) { skipped++; continue; }

    const isNew = existing.rows.length === 0;
    isNew ? created++ : updated++;
    if (isNew) console.log(`[Sync] + NEW  "${cleanedTitle}"`);
    else console.log(`[Sync] ~ UPD  "${cleanedTitle}"`);

    const summaryText = stripHtml(post.content) || post.title || "";
    let coverUrl = post.cover || "";
    if (coverUrl && !coverUrl.startsWith("http")) {
      const base = config.imageCdnBase.replace(/\/$/, "");
      coverUrl = base + (coverUrl.startsWith("/") ? coverUrl : "/" + coverUrl);
    }

    await db.execute({
      sql: `INSERT INTO games (id, slug, title, summary, cover, tags, download, download_label, views, source_id, source_hash, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(slug) DO UPDATE SET
              title=excluded.title, summary=excluded.summary, cover=excluded.cover,
              tags=excluded.tags, download=excluded.download, views=excluded.views,
              source_hash=excluded.source_hash, updated_at=CURRENT_TIMESTAMP`,
      args: [
        crypto.randomUUID(), slug, cleanedTitle, summaryText, coverUrl,
        JSON.stringify(tags), post.resources?.[0]?.url || "",
        post.resources?.[0]?.platform || "资源链接", post.views || 0, post._id, sourceHash,
      ],
    });

    if (isNew) {
      await db.execute({
        sql: `INSERT INTO guides (slug, markdown, provider, model, generated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(slug) DO NOTHING`,
        args: [slug, "", "pending", ""],
      });
    }
  }
  console.log(`[Sync] Done. Created: ${created} | Updated: ${updated} | Skipped: ${skipped}`);

  // Step 3: fill any empty guides
  console.log("\n========== Step 3: Generate fallback guides ==========");
  await fillEmptyGuides();

  console.log("\n========== All done ==========");
}

main().catch(console.error);
