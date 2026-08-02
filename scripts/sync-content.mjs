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
  imageCdnBase: process.env.CONTENT_SYNC_IMAGE_CDN ?? "https://upload.krzacg.com",
  pageSize: Math.min(Number(process.env.CONTENT_SYNC_PAGE_SIZE ?? 50), 50),
  maxPages: Number(process.env.CONTENT_SYNC_MAX_PAGES ?? 200),
  dbUrl: process.env.TURSO_DATABASE_URL,
  dbToken: process.env.TURSO_AUTH_TOKEN,
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  indexNowKey: process.env.INDEXNOW_KEY ?? "",
  syncKey: process.env.SYNC_API_KEY ?? "",
};

if (!config.dbUrl) {
  console.error("[Sync] TURSO_DATABASE_URL is not set. Sync aborted.");
  process.exit(1);
}

const db = createClient({ url: config.dbUrl, authToken: config.dbToken });

// ─── Helpers ───────────────────────────────────────────────────────────────

const absoluteUrl = (pathname) => {
  const prefix = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${config.siteUrl}${prefix}`;
};

async function writeIndexNowKeyFile() {
  if (!config.indexNowKey) return null;
  const keyPath = path.join(projectRoot, "public", `${config.indexNowKey}.txt`);
  try {
    await fs.mkdir(path.dirname(keyPath), { recursive: true });
    await fs.writeFile(keyPath, config.indexNowKey);
    console.log(`[IndexNow] Key file written: ${config.indexNowKey}.txt`);
    return config.indexNowKey;
  } catch (err) {
    console.error("[IndexNow] Failed to write key file:", err.message);
    return null;
  }
}

async function submitIndexNow(urlList) {
  if (!config.indexNowKey || !config.siteUrl || urlList.length === 0) return;
  const host = config.siteUrl.replace(/^https?:\/\//, "");
  const keyLocation = absoluteUrl(`/${config.indexNowKey}.txt`);
  const payload = { host, key: config.indexNowKey, keyLocation, urlList };

  try {
    const response = await fetch("https://api.indexnow.org/IndexNow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      console.log(`[IndexNow] Submitted ${urlList.length} URL(s). Status: ${response.status}`);
    } else {
      const text = await response.text().catch(() => "");
      console.error(`[IndexNow] Submit failed: ${response.status} ${text}`);
    }
  } catch (err) {
    console.error("[IndexNow] Submit error:", err.message);
  }
}

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
  await db.execute(`
    CREATE TABLE IF NOT EXISTS slug_redirects (
      old_slug TEXT PRIMARY KEY,
      new_slug TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_slug_redirects_new ON slug_redirects(new_slug)`);
}

async function recordSlugRedirect(oldSlug, newSlug) {
  if (!oldSlug || !newSlug || oldSlug === newSlug) return;
  try {
    await db.execute({
      sql: `INSERT INTO slug_redirects (old_slug, new_slug) VALUES (?, ?)
            ON CONFLICT(old_slug) DO UPDATE SET new_slug = excluded.new_slug`,
      args: [oldSlug, newSlug],
    });
  } catch (err) {
    console.error(`[Sync] Failed to record redirect ${oldSlug} -> ${newSlug}:`, err.message);
  }
}

async function uniqueSlug(baseSlug) {
  let candidate = baseSlug;
  let suffix = 1;
  while (true) {
    const existing = await db.execute({
      sql: "SELECT 1 FROM games WHERE slug = ? LIMIT 1",
      args: [candidate],
    });
    if (existing.rows.length === 0) return candidate;
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
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
  // 全量同步：按发布时间倒序遍历所有页。已存在的文章（source_hash 未变）会被
  // 后续 main() 跳过；连续累计 skip 阈值后提前终止，避免每次都扫全量。
  let consecutiveExisting = 0;
  const stopThreshold = Number(process.env.CONTENT_SYNC_STOP_THRESHOLD ?? 100);
  const seenIds = new Set();

  for (let page = 1; page <= config.maxPages; page += 1) {
    const url = new URL(config.sourceApiUrl);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(config.pageSize));
    url.searchParams.set("sort", "created_at");
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
          ...(config.syncKey ? { "X-Sync-Key": config.syncKey } : {}),
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

      // 增量提前停止：这一页里有多少文章已经在 DB 里且 source_hash 没变。
      // 连续累计超过阈值就停，说明已经追上历史数据。
      let batchExisting = 0;
      for (const post of batch) {
        const sourceHash = crypto
          .createHash("sha1")
          .update([post._id, post.updated_at].join("|"))
          .digest("hex");
        const existing = await db.execute({
          sql: "SELECT source_hash FROM games WHERE source_id = ? LIMIT 1",
          args: [post._id],
        });
        if (existing.rows.length > 0 && existing.rows[0].source_hash === sourceHash) {
          batchExisting++;
        }
        // 去重（同一批里可能重复出现）
        if (!seenIds.has(post._id)) {
          seenIds.add(post._id);
          items.push(post);
        }
      }

      consecutiveExisting = batchExisting === batch.length ? consecutiveExisting + batchExisting : 0;
      console.log(`[Sync] Page ${page}: ${batchExisting}/${batch.length} already up-to-date. Consecutive: ${consecutiveExisting}`);

      if (consecutiveExisting >= stopThreshold) {
        console.log(`[Sync] Reached ${consecutiveExisting} consecutive existing items (threshold: ${stopThreshold}). Stopping early.`);
        break;
      }
    } catch (err) {
      console.error(`[Sync] Failed to fetch page ${page}:`, err.message);
      break;
    }
  }
  console.log(`[Sync] Total posts fetched from API: ${items.length}`);
  return items;
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
  const changedSlugs = [];

  for (const post of posts) {
    const tags = Array.isArray(post.tags) ? post.tags.map((t) => t.name).filter(Boolean) : [];
    const cleanedTitle = cleanTitle(post.title);
    const slug = slugify(post.title, post._id);
    const sourceHash = crypto.createHash("sha1").update([post._id, post.updated_at].join("|")).digest("hex");

    const existingBySource = await db.execute({
      sql: "SELECT slug, source_hash FROM games WHERE source_id = ? LIMIT 1",
      args: [post._id],
    });

    let finalSlug = slug;
    const existingRow = existingBySource.rows[0];

    if (existingRow) {
      // Existing game with this source_id.
      if (existingRow.source_hash === sourceHash) {
        skipped++;
        continue;
      }

      finalSlug = existingRow.slug === slug ? slug : await uniqueSlug(slug);

      if (existingRow.slug !== finalSlug) {
        await recordSlugRedirect(existingRow.slug, finalSlug);
        // If a guide already exists under the old slug, move it to the new slug.
        try {
          await db.execute({
            sql: "UPDATE guides SET slug = ? WHERE slug = ?",
            args: [finalSlug, existingRow.slug],
          });
        } catch {
          // Guide may already exist under new slug; ignore.
        }
      }

      updated++;
      changedSlugs.push(finalSlug);
      console.log(`[Sync] ~ UPD  "${cleanedTitle}"`);
    } else {
      // Brand new game.
      finalSlug = await uniqueSlug(slug);
      created++;
      changedSlugs.push(finalSlug);
      console.log(`[Sync] + NEW  "${cleanedTitle}"`);
    }

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
              source_id=excluded.source_id, source_hash=excluded.source_hash, updated_at=CURRENT_TIMESTAMP`,
      args: [
        crypto.randomUUID(), finalSlug, cleanedTitle, summaryText, coverUrl,
        JSON.stringify(tags), post.resources?.[0]?.url || "",
        post.resources?.[0]?.platform || "资源链接", post.views || 0, post._id, sourceHash,
      ],
    });

  }
  console.log(`[Sync] Done. Created: ${created} | Updated: ${updated} | Skipped: ${skipped}`);

  // Synced records remain catalog data until an editor adds sourced and
  // reviewed material through a separate editorial workflow.
  console.log("\n========== Editorial generation disabled ==========");

  // Step 4: notify search engines via IndexNow
  console.log("\n========== Step 4: IndexNow submission ==========");
  await writeIndexNowKeyFile();
  if (changedSlugs.length > 0) {
    const urlsToSubmit = [
      absoluteUrl("/"),
      absoluteUrl("/archive"),
    ];
    await submitIndexNow(urlsToSubmit);
  } else {
    console.log("[IndexNow] No new or updated pages to submit.");
  }

  console.log("\n========== All done ==========");
}

main().catch(console.error);
