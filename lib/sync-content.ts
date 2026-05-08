import crypto from "node:crypto";
import { createClient } from "@libsql/client";

interface SyncOptions {
  pageSize?: number;
  maxPages?: number;
}

function getConfig() {
  return {
    sourceApiUrl: process.env.CONTENT_SOURCE_API_URL ?? "https://service.krzacg.com/api/posts/hot-feed",
    categorySlugs: process.env.CONTENT_SYNC_CATEGORY_SLUGS ?? "hentai,game",
    pageSize: Math.min(Number(process.env.CONTENT_SYNC_PAGE_SIZE ?? 50), 50),
    maxPages: Number(process.env.CONTENT_SYNC_MAX_PAGES ?? 2),
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
  let base = value
    .replace(/[【】\[\]（）(){}<>"'`~!@#$%^&*+=,;:?\\|/\s]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  if (base.length > 60) base = base.slice(0, 60);
  if (!base) base = "game";
  const suffix = id ? id.slice(-6) : crypto.randomUUID().slice(0, 6);
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
    if (cfg.categorySlugs) {
      url.searchParams.set("category_slugs", cfg.categorySlugs);
    }

    console.log(`[Sync] Fetching page ${page}: ${url.toString()}`);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
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
      let batch = Array.isArray((payload as any)?.data) ? (payload as any).data : [];
      if (cfg.categorySlugs) {
        const allowed = cfg.categorySlugs.split(",").map((s) => s.trim());
        batch = batch.filter((post: any) => {
          const cats = Array.isArray(post.categories) ? post.categories : [];
          return cats.some((c: any) => allowed.includes(c.slug));
        });
      }
      console.log(`[Sync] Page ${page} returned ${batch.length} items (total: ${(payload as any)?.total ?? "unknown"})`);
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

  await initDatabase(db);

  const posts = await fetchSourcePosts({ pageSize: opts.pageSize, maxPages: opts.maxPages });
  console.log(`[Sync] Found ${posts.length} posts.`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

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

    await db.execute({
      sql: `INSERT INTO games (id, slug, title, summary, cover, tags, download, download_label, views, source_id, source_hash, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(slug) DO UPDATE SET
              title=excluded.title, summary=excluded.summary, cover=excluded.cover,
              tags=excluded.tags, download=excluded.download, views=excluded.views,
              source_hash=excluded.source_hash, updated_at=CURRENT_TIMESTAMP`,
      args: [
        crypto.randomUUID(), slug, cleanedTitle, post.title, post.cover,
        JSON.stringify(tags), post.resources?.[0]?.url || "",
        post.resources?.[0]?.platform || "资源链接", post.views || 0, post._id, sourceHash,
      ],
    });

    if (isNew) {
      await db.execute({
        sql: `INSERT INTO guides (slug, markdown, provider, model, generated_at)
              VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(slug) DO NOTHING`,
        args: [slug, "", "pending", ""],
      });
    }
  }

  console.log(`[Sync] Done. Created: ${created} | Updated: ${updated} | Skipped: ${skipped}`);
  return { totalFetched: posts.length, created, updated, skipped };
}
