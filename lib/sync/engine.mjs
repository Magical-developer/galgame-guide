/**
 * 目录同步引擎：把主站 posts 拉成本站的 games 索引。
 *
 * 两个入口共用这一份实现，避免逻辑漂移：
 *   - scripts/sync-content.mjs   （CLI：手动全量 / 预演）
 *   - app/api/cron/sync-content  （Vercel Cron：每天增量）
 *
 * 约定：
 *   - 一个 source_id 只对应一行（数据库有 UNIQUE 索引），冲突时原地更新；
 *   - 已有行的 slug 保持稳定，只有新行才分配 slug；
 *   - source_hash 未变则跳过，不做无意义写入。
 */

import crypto from "node:crypto";

const DEFAULT_EXCLUDE_KEYWORDS = ["mmd", "vam", "virt-a-mate"];

const slugify = (value, id) => {
  let base = String(value || "")
    .replace(/[^\x00-\x7F]+/g, "-")
    .replace(/[【】\[\]（）(){}\u003c\u003e"'`~!@#$%^\u0026*+=,;:?\\|/\s]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  if (base.length > 60) base = base.slice(0, 60);
  if (!base) base = "game";
  const suffix = id ? String(id).slice(-6) : crypto.randomUUID().slice(0, 6);
  return `${base}-${suffix}`;
};

const stripHtml = (html) => {
  if (!html) return "";
  return String(html)
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
  const raw = String(value || "");
  let clean = raw;
  clean = clean.replace(/【.*?】/g, " ").replace(/\[.*?\]/g, " ");
  clean = clean.replace(/（.*?）/g, " ");
  clean = clean.replace(/\b[vV](er\.?\s?)?\d+(\.\d+)*\s*(?:beta|alpha|rc|patch|build|fix)?\b/gi, " ");
  clean = clean.replace(/\b(度盘|网盘|解压码?|大小|密码)[\/:\s]*[^\s\[【]*/gi, " ");
  clean = clean.replace(/\b\d+(\.\d+)?\s*(GB|G|MB|M)\b/gi, " ");
  clean = clean.replace(/[\/\|]+/g, " ").replace(/-+/g, " ").replace(/\s+/g, " ").trim();
  if (clean.length < 3) {
    clean = raw.replace(/【.*?】/g, " ").replace(/\[.*?\]/g, " ").replace(/（.*?）/g, " ").trim();
  }
  return clean || raw;
};

const hashPost = (post) =>
  crypto
    .createHash("sha1")
    .update([post._id, post.updated_at].join("|"))
    .digest("hex");

const normalizeList = (value, fallback = []) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return fallback;
};

/**
 * @param {object} options
 * @param {object} options.db              @libsql/client 实例
 * @param {string} options.sourceApiUrl   数据源地址
 * @param {number} [options.pageSize]     每页条数（接口上限 50）
 * @param {number} [options.maxPages]     最多抓几页（增量默认 2）
 * @param {string|string[]} [options.categorySlugs]
 * @param {string|string[]} [options.excludeKeywords]
 * @param {string} [options.imageCdnBase]
 * @param {number} [options.stopThreshold] 连续多少条已存在就提前停止
 * @param {boolean} [options.dryRun]
 * @param {(...args:any[]) => void} [options.log]
 */
export async function runCatalogSync({
  db,
  sourceApiUrl,
  pageSize = 50,
  maxPages = 2,
  categorySlugs = "hentai,game",
  excludeKeywords = DEFAULT_EXCLUDE_KEYWORDS,
  imageCdnBase = "https://upload.krzacg.com",
  stopThreshold = 100,
  dryRun = false,
  log = () => {},
}) {
  if (!db) throw new Error("runCatalogSync: db is required");
  if (!sourceApiUrl) throw new Error("runCatalogSync: sourceApiUrl is required");

  const allowedCategories = normalizeList(categorySlugs);
  const excluded = normalizeList(excludeKeywords).map((item) => item.toLowerCase());
  const cdnBase = String(imageCdnBase).replace(/\/$/, "");

  // 现有数据一次性读进内存：source_id → 行；slug 集合用于分配新 slug。
  const existingResult = await db.execute(
    "SELECT id, slug, source_hash, source_id FROM games"
  );
  const existingBySourceId = new Map();
  const knownSlugs = new Set();
  for (const row of existingResult.rows) {
    existingBySourceId.set(String(row.source_id), row);
    knownSlugs.add(String(row.slug));
  }

  const allocateSlug = (baseSlug) => {
    let candidate = baseSlug;
    let suffix = 1;
    while (knownSlugs.has(candidate)) {
      suffix += 1;
      candidate = `${baseSlug}-${suffix}`;
    }
    knownSlugs.add(candidate);
    return candidate;
  };

  const stats = {
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    pages: 0,
    stoppedEarly: false,
    dryRun,
  };

  const seenIds = new Set();
  let consecutiveExisting = 0;

  for (let page = 1; page <= maxPages; page += 1) {
    const url = new URL(sourceApiUrl);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(Math.min(pageSize, 50)));
    url.searchParams.set("sort", "created_at");

    const response = await fetch(url, {
      headers: {
        // 真实可识别 UA，不伪造浏览器身份。
        "User-Agent": "galgame-guide-sync/1.0 (+https://galgame-guide.vercel.app)",
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`source API ${response.status} on page ${page}`);
    }

    const payload = await response.json();
    let batch = Array.isArray(payload?.data) ? payload.data : [];

    if (allowedCategories.length > 0) {
      batch = batch.filter((post) => {
        const cats = Array.isArray(post.categories) ? post.categories : [];
        return cats.some((cat) => allowedCategories.includes(cat.slug));
      });
    }
    if (excluded.length > 0) {
      batch = batch.filter((post) => {
        const title = String(post.title || "").toLowerCase();
        return !excluded.some((keyword) => title.includes(keyword));
      });
    }

    if (batch.length === 0) break;

    const statements = [];
    let pageExisting = 0;

    for (const post of batch) {
      if (!post?._id || seenIds.has(post._id)) continue;
      seenIds.add(post._id);
      stats.fetched += 1;

      const sourceHash = hashPost(post);
      const existing = existingBySourceId.get(String(post._id));

      if (existing && existing.source_hash === sourceHash) {
        stats.skipped += 1;
        pageExisting += 1;
        continue;
      }

      const tags = Array.isArray(post.tags)
        ? post.tags.map((tag) => tag?.name).filter(Boolean)
        : [];
      const cleanedTitle = cleanTitle(post.title);
      const summaryText = stripHtml(post.content) || post.title || "";

      let coverUrl = post.cover || "";
      if (coverUrl && !coverUrl.startsWith("http")) {
        coverUrl = cdnBase + (coverUrl.startsWith("/") ? coverUrl : `/${coverUrl}`);
      }

      const slug = existing ? String(existing.slug) : allocateSlug(slugify(post.title, post._id));

      statements.push({
        sql: `INSERT INTO games (id, slug, title, summary, cover, tags, download, download_label, views, source_id, source_hash, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(source_id) DO UPDATE SET
                title = excluded.title,
                summary = excluded.summary,
                cover = excluded.cover,
                tags = excluded.tags,
                download = excluded.download,
                download_label = excluded.download_label,
                views = excluded.views,
                source_hash = excluded.source_hash,
                updated_at = CURRENT_TIMESTAMP`,
        args: [
          crypto.randomUUID(),
          slug,
          cleanedTitle,
          summaryText,
          coverUrl,
          JSON.stringify(tags),
          post.resources?.[0]?.url || "",
          post.resources?.[0]?.platform || "资源链接",
          post.views || 0,
          post._id,
          sourceHash,
        ],
      });

      if (existing) stats.updated += 1;
      else stats.created += 1;
    }

    if (!dryRun && statements.length > 0) {
      await db.batch(statements, "write");
    }

    stats.pages += 1;
    log(
      `[Sync] page ${page}: fetched=${stats.fetched} new=${stats.created} upd=${stats.updated} skip=${stats.skipped}`
    );

    consecutiveExisting =
      batch.length > 0 && pageExisting === batch.length ? consecutiveExisting + pageExisting : 0;
    if (consecutiveExisting >= stopThreshold) {
      stats.stoppedEarly = true;
      break;
    }
  }

  return stats;
}
