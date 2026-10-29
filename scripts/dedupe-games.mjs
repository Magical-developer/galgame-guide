#!/usr/bin/env node
/**
 * 合并重复作品行（一个 source_id 只保留一行）。
 *
 * 背景：旧版 sync 把 slug 当冲突键且 SELECT 没有 ORDER BY，同一作品每次源数据
 * 变化就会插入一行新记录。实测 7,616 行里只有 3,820 个 distinct source_id，
 * 单组最多 25 行，并由此派生出大量重定向链。
 *
 * 策略：
 *   - 每组保留的必须是 lib/games.ts 认定的 canonical 行（优先 ASCII slug，再比
 *     updated_at），否则清理后保留的 slug 与线上 sitemap 不一致，作品页会集体 404；
 *   - 用组内最新一行的内容字段覆盖保留行（内容取最新，但不改 updated_at）；
 *   - 指向被删 slug 的重定向改指保留 slug；指向保留 slug 的自指重定向删除；
 *   - 删除多余行；全部完成后加 UNIQUE(source_id) 索引，从结构上防止复发。
 *
 * 用法：
 *   node scripts/dedupe-games.mjs           # 只读预演（默认）
 *   node scripts/dedupe-games.mjs --apply   # 真正执行
 */

import nextEnv from "@next/env";
import { createClient } from "@libsql/client";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const APPLY = process.argv.includes("--apply");
const GROUP_CHUNK = 50;

const dbUrl = process.env.TURSO_DATABASE_URL;
const dbToken = process.env.TURSO_AUTH_TOKEN;
if (!dbUrl) {
  console.error("[Dedupe] TURSO_DATABASE_URL is not set. Aborted.");
  process.exit(1);
}

const db = createClient({ url: dbUrl, authToken: dbToken });

const CONTENT_COLUMNS = [
  "title",
  "summary",
  "cover",
  "tags",
  "download",
  "download_label",
  "views",
  "source_hash",
];

async function loadDuplicateGroups() {
  const result = await db.execute({
    sql: `SELECT id, slug, source_id, created_at, updated_at, ${CONTENT_COLUMNS.join(", ")}
            FROM games
           WHERE source_id IN (
             SELECT source_id FROM games
              WHERE source_id IS NOT NULL AND source_id <> ''
           GROUP BY source_id
             HAVING COUNT(*) > 1)
        ORDER BY source_id ASC, created_at ASC, id ASC`,
    args: [],
  });

  const groups = new Map();
  for (const row of result.rows) {
    const key = String(row.source_id);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return groups;
}

async function loadRedirects() {
  const result = await db.execute({
    sql: "SELECT old_slug, new_slug FROM slug_redirects",
    args: [],
  });
  const map = new Map();
  for (const row of result.rows) {
    map.set(String(row.old_slug), String(row.new_slug));
  }
  return map;
}

const ASCII_REGEX = /^[\x00-\x7F]+$/;

// 必须和 lib/games.ts 的 pickCanonicalGame 完全一致：优先 ASCII slug，再比
// updated_at / created_at。否则清理后保留的 slug 与线上 sitemap 里的 URL 不一致，
// 3,820 条作品页会集体 404。
function pickKeep(rows) {
  return [...rows].sort((a, b) => {
    const aAscii = ASCII_REGEX.test(String(a.slug)) ? 1 : 0;
    const bAscii = ASCII_REGEX.test(String(b.slug)) ? 1 : 0;
    if (aAscii !== bAscii) return bAscii - aAscii;
    const updated =
      new Date(String(b.updated_at)).getTime() -
      new Date(String(a.updated_at)).getTime();
    if (updated !== 0) return updated;
    return (
      new Date(String(b.created_at)).getTime() -
      new Date(String(a.created_at)).getTime()
    );
  })[0];
}

function planGroup(rows, redirects, keepSlugSet) {
  const keep = pickKeep(rows);
  const extras = rows.filter((row) => row.id !== keep.id);
  const newest = [...rows].sort(
    (a, b) =>
      new Date(String(b.updated_at)).getTime() -
      new Date(String(a.updated_at)).getTime()
  )[0];
  const keepSlug = String(keep.slug);
  const extraSlugs = new Set(extras.map((row) => String(row.slug)));

  const repoint = [];

  for (const [oldSlug, newSlug] of redirects) {
    // 规范页自身不能被重定向走；这类重定向在全局集合里统一删除，避免重复计数。
    if (keepSlugSet.has(oldSlug)) continue;
    if (extraSlugs.has(newSlug)) {
      repoint.push({ oldSlug, newSlug: keepSlug });
    }
  }

  return { keep, extras, newest, keepSlug, extraSlugs, repoint };
}

function buildStatements(plan) {
  const { keep, extras, newest, keepSlug, repoint } = plan;
  const statements = [];

  // 内容取组内最新一版；updated_at 保持原值，避免把「清理」伪装成「内容更新」。
  statements.push({
    sql: `UPDATE games SET ${CONTENT_COLUMNS.map((col) => `${col} = ?`).join(", ")}
           WHERE id = ?`,
    args: [...CONTENT_COLUMNS.map((col) => newest[col] ?? null), keep.id],
  });

  for (const item of repoint) {
    statements.push({
      sql: `INSERT INTO slug_redirects (old_slug, new_slug) VALUES (?, ?)
            ON CONFLICT(old_slug) DO UPDATE SET new_slug = excluded.new_slug`,
      args: [item.oldSlug, keepSlug],
    });
  }

  statements.push({
    sql: `DELETE FROM games WHERE id IN (${extras.map(() => "?").join(", ")})`,
    args: extras.map((row) => row.id),
  });

  return statements;
}

async function main() {
  console.log(`[Dedupe] Mode: ${APPLY ? "APPLY（会写库）" : "DRY-RUN（只读）"}`);

  const before = await db.execute("SELECT COUNT(*) AS n FROM games");
  const groups = await loadDuplicateGroups();
  const redirects = await loadRedirects();

  const keepSlugSet = new Set();
  for (const rows of groups.values()) {
    keepSlugSet.add(String(pickKeep(rows).slug));
  }

  // 规范页自身被重定向走的记录：全局只处理一次（逐组处理会重复计数 1664 倍）。
  const removeRedirects = [...redirects.keys()].filter((oldSlug) =>
    keepSlugSet.has(oldSlug)
  );

  let totalExtras = 0;
  let totalRepoint = 0;
  const samples = [];
  const plans = [];

  for (const [sourceId, rows] of groups) {
    const plan = planGroup(rows, redirects, keepSlugSet);
    plans.push({ sourceId, plan });
    totalExtras += plan.extras.length;
    totalRepoint += plan.repoint.length;
    if (samples.length < 5) {
      samples.push({
        source_id: sourceId,
        rows: rows.length,
        keep: plan.keepSlug,
        delete: [...plan.extraSlugs].slice(0, 3),
        repoint: plan.repoint.length,
      });
    }
  }

  console.log(`[Dedupe] games 行数: ${before.rows[0].n}`);
  console.log(`[Dedupe] 重复 source_id 组: ${groups.size}`);
  console.log(`[Dedupe] 待删除多余行: ${totalExtras}`);
  console.log(
    `[Dedupe] 待改指重定向: ${totalRepoint} | 待删除"规范页被重定向"记录: ${removeRedirects.length}`
  );
  console.log("[Dedupe] 样例（最多 5 组）:");
  for (const item of samples) console.log("  ", JSON.stringify(item));

  if (!APPLY) {
    console.log(
      "\n[Dedupe] 预演结束，未写入任何数据。确认无误后运行：node scripts/dedupe-games.mjs --apply"
    );
    return;
  }

  // 分批写：每批一个事务，批内任一句失败整批回滚，不会留下半合并状态。
  const removeStatements = removeRedirects.map((oldSlug) => ({
    sql: "DELETE FROM slug_redirects WHERE old_slug = ?",
    args: [oldSlug],
  }));

  let applied = 0;
  for (let i = 0; i < plans.length; i += GROUP_CHUNK) {
    const chunk = plans.slice(i, i + GROUP_CHUNK);
    const statements = chunk.flatMap(({ plan }) => buildStatements(plan));
    if (i === 0) statements.unshift(...removeStatements);
    await db.batch(statements, "write");
    applied += chunk.length;
    if (applied % 250 === 0 || applied === plans.length) {
      console.log(`[Dedupe] 已处理 ${applied}/${plans.length} 组`);
    }
  }

  const remaining = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM (
            SELECT source_id FROM games
             WHERE source_id IS NOT NULL AND source_id <> ''
          GROUP BY source_id HAVING COUNT(*) > 1)`,
    args: [],
  });
  const after = await db.execute("SELECT COUNT(*) AS n FROM games");
  console.log(`[Dedupe] 清理后 games 行数: ${after.rows[0].n}`);
  console.log(`[Dedupe] 剩余重复组: ${remaining.rows[0].n}`);

  if (Number(remaining.rows[0].n) === 0) {
    await db.execute(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_games_source_id ON games(source_id)"
    );
    console.log("[Dedupe] 已创建 UNIQUE INDEX idx_games_source_id。");
  } else {
    console.warn("[Dedupe] 仍有重复组，跳过唯一索引创建。");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[Dedupe] Fatal:", error.message);
  process.exitCode = 1;
});
