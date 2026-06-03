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

const slugify = (value, id) => {
  let base = value
    .replace(/[^\x00-\x7F]+/g, "-")           // strip all non-ASCII (CJK, Japanese, etc.)
    .replace(/[【】\[\]（）(){}<>"'`~!@#$%^&*+=,;:?\\|/\s]+/g, "-")
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
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
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

async function fetchSourcePosts() {
  const items = [];
  for (let page = 1; page <= config.maxPages; page += 1) {
    const url = new URL(config.sourceApiUrl);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(config.pageSize));
    url.searchParams.set("sort", "views");
    if (config.categorySlugs) {
      url.searchParams.set("category_slugs", config.categorySlugs);
    }
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
      // Local filter: only keep posts that belong to hentai or game categories
      if (config.categorySlugs) {
        const allowed = config.categorySlugs.split(",").map(s => s.trim());
        batch = batch.filter(post => {
          const cats = Array.isArray(post.categories) ? post.categories : [];
          return cats.some(c => allowed.includes(c.slug));
        });
      }

      // Exclude non-galgame content by title keywords (e.g. MMD, VAM)
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

async function main() {
  await initDatabase();
  await importLocalData();

  console.log("[Sync] Fetching posts from source API...");
  const posts = await fetchSourcePosts();
  console.log(`[Sync] Found ${posts.length} posts.`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const post of posts) {
    const tags = Array.isArray(post.tags) ? post.tags.map((t) => t.name).filter(Boolean) : [];
    const cleanedTitle = cleanTitle(post.title);
    const slug = slugify(post.title, post._id);
    const sourceHash = crypto.createHash("sha1").update([post._id, post.updated_at].join("|")).digest("hex");

    const existing = await db.execute({
      sql: "SELECT source_hash FROM games WHERE slug = ?",
      args: [slug],
    });

    if (existing.rows[0]?.source_hash === sourceHash) {
      skipped++;
      continue;
    }

    const isNew = existing.rows.length === 0;
    if (isNew) {
      console.log(`[Sync] + NEW  "${cleanedTitle}"`);
      created++;
    } else {
      console.log(`[Sync] ~ UPD  "${cleanedTitle}"`);
      updated++;
    }

    const summaryText = stripHtml(post.content) || post.title || "";

    // Resolve cover URL: relative paths → CDN base, absolute URLs pass through
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

    // Only create an empty guide placeholder for NEW games.
    // Existing games keep their current guide (AI or otherwise).
    if (isNew) {
      await db.execute({
        sql: `INSERT INTO guides (slug, markdown, provider, model, generated_at)
              VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(slug) DO NOTHING`,
        args: [slug, "", "pending", ""],
      });
    }
  }

  console.log(`\n[Sync] Done. Created: ${created} | Updated: ${updated} | Skipped: ${skipped}`);
}

main().catch(console.error);
