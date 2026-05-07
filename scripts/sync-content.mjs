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
  sourceAssetBaseUrl: process.env.CONTENT_SOURCE_ASSET_BASE_URL ?? "https://upload.krzacg.com",
  pageSize: Number(process.env.CONTENT_SYNC_PAGE_SIZE ?? 20),
  maxPages: Number(process.env.CONTENT_SYNC_MAX_PAGES ?? 5),
  aiBaseUrl: process.env.AI_BASE_URL ?? "",
  aiApiKey: process.env.AI_API_KEY ?? "",
  aiModel: process.env.AI_MODEL ?? "",
  dbUrl: process.env.TURSO_DATABASE_URL,
  dbToken: process.env.TURSO_AUTH_TOKEN,
};

if (!config.dbUrl) {
  console.error("TURSO_DATABASE_URL is not set. Sync aborted.");
  console.log("Available environment variables (keys only):", Object.keys(process.env).filter(key => !key.includes('SECRET') && !key.includes('TOKEN') && !key.includes('KEY')));
  console.log("Check if TURSO_DATABASE_URL exists in the list above.");
  process.exit(1);
}

const db = createClient({
  url: config.dbUrl,
  authToken: config.dbToken,
});

async function initDatabase() {
  console.log("[Sync] Ensuring database tables exist...");
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

async function importLocalData() {
  const gamesPath = path.join(projectRoot, "data", "generated", "games.json");
  try {
    const data = await fs.readFile(gamesPath, "utf8");
    const games = JSON.parse(data);
    console.log(`[Sync] Found ${games.length} local games in JSON. Checking for import...`);

    for (const game of games) {
      const existing = await db.execute({
        sql: "SELECT 1 FROM games WHERE slug = ? LIMIT 1",
        args: [game.slug],
      });

      if (existing.rows.length > 0) continue;

      console.log(`[Sync] Importing local game: ${game.title}`);
      
      let markdown = "";
      try {
        const contentPath = path.join(projectRoot, "data", "generated", "content", `${game.slug}.json`);
        const contentData = await fs.readFile(contentPath, "utf8");
        markdown = JSON.parse(contentData).markdown || "";
      } catch (e) {
        markdown = buildFallbackContent({ title: game.title, tags: game.tags });
      }

      await db.execute({
        sql: `INSERT INTO games (id, slug, title, summary, cover, tags, download, download_label, views, source_id, source_hash, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        args: [
          crypto.randomUUID(), game.slug, game.title, game.summary, game.cover, 
          JSON.stringify(game.tags), game.download, game.downloadLabel, 
          game.views, game.sourceId, game.sourceHash
        ],
      });

      if (markdown) {
        await db.execute({
          sql: `INSERT INTO guides (slug, markdown, provider, model, generated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          args: [game.slug, markdown, "local-import", "original"],
        });
      }
    }
  } catch (err) {
    console.log("[Sync] No local JSON data found or failed to read. Skipping import.");
  }
}

const hasAiConfig = Boolean(config.aiBaseUrl && config.aiApiKey && config.aiModel);

const slugify = (value) => {
  const latin = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (latin) return latin.slice(0, 72);
  return `game-${crypto.createHash("sha1").update(value).digest("hex").slice(0, 10)}`;
};

const cleanTitle = (value) => {
  let clean = value.replace(/[\u3010\u3011]|\[.*?\]/g, " ").trim();
  clean = clean.replace(/[vV](er\.?\s?)?\d+(\.\d+)*/g, " ");
  clean = clean.replace(/(度盘|网盘|解压|大小|GB|G|MB|M|PC|安卓|中文|官中|汉化|新作|个人|新作).*$/gi, " ");
  clean = clean.replace(/\/+/g, " ").replace(/-+/g, " ").replace(/\s+/g, " ").trim();
  if (clean.length < 2) return value.split(" ")[0];
  return clean;
};

const buildFallbackContent = (game) => `## 游戏剧情简介
${game.title} 是一款深度融合了 ${game.tags.join("、")} 元素的精品作。本作以其独特的叙事风格和精美的原画设计，在视觉小说领域获得了极高的关注度。

## 核心推荐理由
如果你偏好 ${game.tags.slice(0, 2).join("、")} 题材，那么本作绝对是不容错过的佳作。

## 完美攻略全流程
建议在进入分歧点前保留独立存档。优先推进主线剧情，确认核心女主角的情感倾向。

## 全CG与回想场景解锁
本作的全CG 解锁主要依赖于全结局的达成。建议玩家在完成一周目后，利用快进功能回收剩余的分支场景。

## 常见问题 FAQ
### 如何快速达成真结局？
建议参考本站整理的完美路线图，确保所有前置事件均已正确触发。

## 类似题材作品推荐
如果你喜欢本作的画风，可以继续探索同类带有 ${game.tags.slice(0, 2).join("、")} 标签的作品。`;

const buildPrompt = (game) => `
你是一名资深视觉小说（Visual Novel）与绅士游戏攻略索引编辑，你所在的项目叫“次元绅士指南”，你的职责是根据提供的游戏基础信息，输出一篇专业、硬核且对搜索引擎优化（SEO）友好的中文攻略指南。

【游戏基础信息】
标题：${game.title}
标签：${game.tags.join("、")}
原始简介：${game.summary}

【内容要求】
1. **风格定位**：文字要专业、懂行。禁止出现“开发者自白”、“项目说明”或“由于是部署在Vercel...”等废话。
2. **详细程度**：全文控制在 800-1200 字之间。
3. **SEO 关键词**：绅游推荐、Galgame攻略教程、绅士游戏全CG存档、汉化补丁下载说明、完美全结局路线、真结局达成条件、回想内容解锁、存档路径说明、分歧选项。
4. **合规提示**：使用“回想场景”、“特殊事件”、“动态CG”、“解锁特定路线”等行业术语，严禁露骨淫秽词语。
5. **格式规范**：只能输出 Markdown 格式的正文内容。

【必须包含的二级标题】
## 游戏剧情简介
## 核心推荐理由
## 完美攻略全流程
## 全CG与回想场景解锁
## 存档管理与安装说明
## 常见问题 FAQ
## 类似题材作品推荐
`;

async function requestAiMarkdown(game) {
  if (!hasAiConfig) return buildFallbackContent(game);

  const endpoint = new URL("/v1/chat/completions", config.aiBaseUrl).toString();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.aiApiKey}`,
    },
    body: JSON.stringify({
      model: config.aiModel,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: "你是一名资深 Galgame 攻略编辑。你编写的内容是技术性的游戏指南，侧重于系统逻辑、路线分歧、存档路径和全CG收集，严禁使用过于露骨的淫秽词语。",
        },
        {
          role: "user",
          content: buildPrompt(game),
        },
      ],
    }),
  });

  if (!response.ok) return buildFallbackContent(game);

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content?.trim();
  return content || buildFallbackContent(game);
}

async function fetchSourcePosts() {
  const items = [];
  for (let page = 1; page <= config.maxPages; page += 1) {
    const url = new URL(config.sourceApiUrl);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(config.pageSize));
    url.searchParams.set("sort", "views");

    console.log(`[Sync] Fetching page ${page}: ${url.toString()}`);

    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 Chrome/124.0.0.0 Safari/537.36" }
      });
      if (!response.ok) {
        console.error(`[Sync] API error on page ${page}: ${response.status} ${response.statusText}`);
        break;
      }
      const payload = await response.json();
      const batch = Array.isArray(payload?.data) ? payload.data : [];
      console.log(`[Sync] Page ${page} returned ${batch.length} items (total in response: ${payload?.total ?? payload?.count ?? 'unknown'})`);
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

async function main() {
  await initDatabase();
  await importLocalData();

  console.log("[Sync] Fetching posts from source API...");
  const posts = await fetchSourcePosts();
  console.log(`[Sync] Found ${posts.length} posts.`);

  for (const post of posts) {
    const tags = Array.isArray(post.tags) ? post.tags.map((t) => t.name).filter(Boolean) : [];
    const cleanedTitle = cleanTitle(post.title);
    const slug = slugify(post.title);
    const sourceHash = crypto.createHash("sha1").update([post._id, post.updated_at].join("|")).digest("hex");

    // Check if we already have this version in DB
    const existing = await db.execute({
      sql: "SELECT source_hash FROM games WHERE slug = ?",
      args: [slug],
    });

    if (existing.rows[0]?.source_hash === sourceHash) {
      console.log(`[Sync] Skipping "${cleanedTitle}" (already up to date)`);
      continue;
    }

    console.log(`[Sync] Processing "${cleanedTitle}"...`);
    const markdown = await requestAiMarkdown({ title: cleanedTitle, tags, summary: post.title });

    // UPSERT Game
    await db.execute({
      sql: `INSERT INTO games (id, slug, title, summary, cover, tags, download, download_label, views, source_id, source_hash, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(slug) DO UPDATE SET 
              title=excluded.title, summary=excluded.summary, cover=excluded.cover, 
              tags=excluded.tags, download=excluded.download, views=excluded.views, 
              source_hash=excluded.source_hash, updated_at=CURRENT_TIMESTAMP`,
      args: [
        crypto.randomUUID(), slug, `${cleanedTitle} 攻略解析 | 全结局路线 | 全CG回想解锁`, 
        post.title, post.cover, JSON.stringify(tags), post.resources?.[0]?.url || "", 
        post.resources?.[0]?.platform || "资源链接", post.views || 0, post._id, sourceHash
      ],
    });

    // UPSERT Guide
    await db.execute({
      sql: `INSERT INTO guides (slug, markdown, provider, model, generated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(slug) DO UPDATE SET 
              markdown=excluded.markdown, generated_at=CURRENT_TIMESTAMP`,
      args: [slug, markdown, config.aiBaseUrl, config.aiModel],
    });
  }

  console.log("[Sync] Content synchronization complete.");
  console.log(`[Sync] Summary: ${posts.length} posts fetched, processed with upserts.`);
}

main().catch(console.error);
