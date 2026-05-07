import crypto from "node:crypto";
import { createClient } from "@libsql/client";

interface SyncOptions {
  skipAi?: boolean;
  pageSize?: number;
  maxPages?: number;
}

function getConfig() {
  return {
    sourceApiUrl: process.env.CONTENT_SOURCE_API_URL ?? "https://service.krzacg.com/api/posts/hot-feed",
    pageSize: Math.min(Number(process.env.CONTENT_SYNC_PAGE_SIZE ?? 50), 50),
    maxPages: Number(process.env.CONTENT_SYNC_MAX_PAGES ?? 2),
    aiBaseUrl: process.env.AI_BASE_URL ?? "",
    aiApiKey: process.env.AI_API_KEY ?? "",
    aiModel: process.env.AI_MODEL ?? "",
    dbUrl: process.env.TURSO_DATABASE_URL!,
    dbToken: process.env.TURSO_AUTH_TOKEN,
  };
}

function createDb() {
  const cfg = getConfig();
  return createClient({ url: cfg.dbUrl, authToken: cfg.dbToken });
}

export async function initDatabase(db = createDb()) {
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
  return db;
}

export const slugify = (value: string, id?: string) => {
  const latin = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const base = latin ? latin.slice(0, 50) : "game";
  const suffix = id ? id.slice(-8) : crypto.randomUUID().slice(0, 8);
  return `${base}-${suffix}`;
};

export const cleanTitle = (value: string) => {
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

const buildFallbackContent = (game: { title: string; tags: string[] }) =>
  `## 游戏剧情简介\n${game.title} 是一款深度融合了 ${game.tags.join("、")} 元素的精品作。\n\n## 核心推荐理由\n如果你偏好 ${game.tags.slice(0, 2).join("、")} 题材，那么本作绝对是不容错过的佳作。\n\n## 完美攻略全流程\n建议在进入分歧点前保留独立存档。优先推进主线剧情。\n\n## 全CG与回想场景解锁\n本作的全CG 解锁主要依赖于全结局的达成。建议玩家在完成一周目后，利用快进功能回收剩余的分支场景。\n\n## 常见问题 FAQ\n### 如何快速达成真结局？\n建议参考本站整理的完美路线图，确保所有前置事件均已正确触发。\n\n## 类似题材作品推荐\n如果你喜欢本作的画风，可以继续探索同类带有 ${game.tags.slice(0, 2).join("、")} 标签的作品。`;

const buildPrompt = (game: { title: string; tags: string[]; summary: string }) =>
  `你是一名资深视觉小说（Visual Novel）与绅士游戏攻略索引编辑，你所在的项目叫"次元绅士指南"，你的职责是根据提供的游戏基础信息，输出一篇专业、硬核且对搜索引擎优化（SEO）友好的中文攻略指南。\n\n【游戏基础信息】\n标题：${game.title}\n标签：${game.tags.join("、")}\n原始简介：${game.summary}\n\n【内容要求】\n1. 风格定位：文字要专业、懂行。禁止出现"开发者自白"、"项目说明"或"由于是部署在Vercel..."等废话。\n2. 详细程度：全文控制在 800-1200 字之间。\n3. SEO 关键词：绅游推荐、Galgame攻略教程、绅士游戏全CG存档、汉化补丁下载说明、完美全结局路线、真结局达成条件、回想内容解锁、存档路径说明、分歧选项。\n4. 合规提示：使用"回想场景"、"特殊事件"、"动态CG"、"解锁特定路线"等行业术语，严禁露骨淫秽词语。\n5. 格式规范：只能输出 Markdown 格式的正文内容。\n\n【必须包含的二级标题】\n## 游戏剧情简介\n## 核心推荐理由\n## 完美攻略全流程\n## 全CG与回想场景解锁\n## 存档管理与安装说明\n## 常见问题 FAQ\n## 类似题材作品推荐`;

async function requestAiMarkdown(
  game: { title: string; tags: string[]; summary: string },
  skipAi: boolean
) {
  const cfg = getConfig();
  if (skipAi || !cfg.aiBaseUrl || !cfg.aiApiKey || !cfg.aiModel) {
    return buildFallbackContent(game);
  }

  const endpoint = new URL("/v1/chat/completions", cfg.aiBaseUrl).toString();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.aiApiKey}`,
    },
    body: JSON.stringify({
      model: cfg.aiModel,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "你是一名资深 Galgame 攻略编辑。你编写的内容是技术性的游戏指南，侧重于系统逻辑、路线分歧、存档路径和全CG收集，严禁使用过于露骨的淫秽词语。",
        },
        { role: "user", content: buildPrompt(game) },
      ],
    }),
  });

  if (!response.ok) return buildFallbackContent(game);
  const payload = (await response.json()) as any;
  return payload?.choices?.[0]?.message?.content?.trim() || buildFallbackContent(game);
}

export async function fetchSourcePosts(options?: { pageSize?: number; maxPages?: number }) {
  const cfg = getConfig();
  const pageSize = Math.min(options?.pageSize ?? cfg.pageSize, 50);
  const maxPages = options?.maxPages ?? cfg.maxPages;
  const items: any[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const url = new URL(cfg.sourceApiUrl);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(pageSize));
    url.searchParams.set("sort", "views");

    console.log(`[Sync] Fetching page ${page}: ${url.toString()}`);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "application/json",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          Referer: "https://krzacg.com/",
          Origin: "https://krzacg.com",
        },
      });
      if (!response.ok) {
        console.error(`[Sync] API error on page ${page}: ${response.status} ${response.statusText}`);
        break;
      }
      const payload = await response.json();
      const batch = Array.isArray((payload as any)?.data) ? (payload as any).data : [];
      console.log(
        `[Sync] Page ${page} returned ${batch.length} items (total: ${(payload as any)?.total ?? "unknown"})`
      );
      if (batch.length === 0) break;
      items.push(...batch);
    } catch (err: any) {
      console.error(`[Sync] Failed to fetch page ${page}:`, err.message);
      break;
    }
  }
  console.log(`[Sync] Total posts fetched from API: ${items.length}`);
  return items;
}

export async function syncContent(opts: SyncOptions = {}) {
  const cfg = getConfig();
  const db = createDb();
  const skipAi = opts.skipAi ?? process.env.SKIP_AI_GUIDE_GENERATION === "true";

  await initDatabase(db);

  if (skipAi) {
    console.log("[Sync] ⚡ FAST MODE: AI will not be called.");
  } else {
    console.log("[Sync] 🤖 FULL MODE: AI generation enabled.");
  }

  const posts = await fetchSourcePosts({ pageSize: opts.pageSize, maxPages: opts.maxPages });
  console.log(`[Sync] Found ${posts.length} posts.`);

  for (const post of posts) {
    const tags = Array.isArray(post.tags)
      ? post.tags.map((t: any) => t.name).filter(Boolean)
      : [];
    const cleanedTitle = cleanTitle(post.title);
    const slug = slugify(post.title, post._id);
    const sourceHash = crypto
      .createHash("sha1")
      .update([post._id, post.updated_at].join("|"))
      .digest("hex");

    const existing = await db.execute({
      sql: "SELECT source_hash FROM games WHERE slug = ?",
      args: [slug],
    });

    if ((existing.rows[0] as any)?.source_hash === sourceHash) {
      console.log(`[Sync] Skipping "${cleanedTitle}" (already up to date)`);
      continue;
    }

    console.log(`[Sync] Processing "${cleanedTitle}"...`);
    const markdown = await requestAiMarkdown(
      { title: cleanedTitle, tags, summary: post.title },
      skipAi
    );

    await db.execute({
      sql: `INSERT INTO games (id, slug, title, summary, cover, tags, download, download_label, views, source_id, source_hash, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(slug) DO UPDATE SET
              title=excluded.title, summary=excluded.summary, cover=excluded.cover,
              tags=excluded.tags, download=excluded.download, views=excluded.views,
              source_hash=excluded.source_hash, updated_at=CURRENT_TIMESTAMP`,
      args: [
        crypto.randomUUID(),
        slug,
        `${cleanedTitle} 攻略解析 | 全结局路线 | 全CG回想解锁`,
        post.title,
        post.cover,
        JSON.stringify(tags),
        post.resources?.[0]?.url || "",
        post.resources?.[0]?.platform || "资源链接",
        post.views || 0,
        post._id,
        sourceHash,
      ],
    });

    await db.execute({
      sql: `INSERT INTO guides (slug, markdown, provider, model, generated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(slug) DO UPDATE SET
              markdown=excluded.markdown, generated_at=CURRENT_TIMESTAMP`,
      args: [slug, markdown, cfg.aiBaseUrl, cfg.aiModel],
    });
  }

  console.log("[Sync] Content synchronization complete.");
  console.log(`[Sync] Summary: ${posts.length} posts fetched, processed with upserts.`);
  return { totalFetched: posts.length };
}
