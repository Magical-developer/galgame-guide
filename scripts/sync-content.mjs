#!/usr/bin/env node
/**
 * 手动同步 CLI。
 *
 * 日常增量由 Vercel Cron 调用 /api/cron/sync-content 完成（同一个引擎，
 * 见 lib/sync/engine.mjs）。这里只负责手动回填与预演。
 *
 *   pnpm content:sync                 # 增量：最多 2 页（约 100 条）
 *   pnpm content:sync --full          # 全量回填：最多 200 页
 *   pnpm content:sync --dry-run       # 只统计，不写库
 *   pnpm content:sync --max-pages=10  # 指定页数
 */

import nextEnv from "@next/env";
import { createClient } from "@libsql/client";

import { runCatalogSync } from "../lib/sync/engine.mjs";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const full = args.includes("--full");
const maxPagesArg = args.find((arg) => arg.startsWith("--max-pages="));
const maxPages = maxPagesArg
  ? Number(maxPagesArg.split("=")[1])
  : full
    ? 200
    : 2;

const dbUrl = process.env.TURSO_DATABASE_URL;
const dbToken = process.env.TURSO_AUTH_TOKEN;
if (!dbUrl) {
  console.error("[Sync] TURSO_DATABASE_URL is not set. Aborted.");
  process.exit(1);
}

const db = createClient({ url: dbUrl, authToken: dbToken });

const sourceApiUrl =
  process.env.CONTENT_SOURCE_API_URL ??
  "https://service.krzacg.com/api/posts/latest";

const startedAt = Date.now();
console.log(`[Sync] mode=${dryRun ? "dry-run" : "write"} maxPages=${maxPages}`);

runCatalogSync({
  db,
  sourceApiUrl,
  pageSize: 50,
  maxPages,
  categorySlugs: process.env.CONTENT_SYNC_CATEGORY_SLUGS ?? "hentai,game",
  excludeKeywords: process.env.CONTENT_SYNC_EXCLUDE_KEYWORDS ?? undefined,
  imageCdnBase: process.env.CONTENT_SYNC_IMAGE_CDN ?? undefined,
  stopThreshold: Number(process.env.CONTENT_SYNC_STOP_THRESHOLD ?? 100),
  dryRun,
  log: console.log,
})
  .then((stats) => {
    console.log(
      `[Sync] done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s: ${JSON.stringify(stats)}`
    );
    if (stats.dryRun) {
      console.log("[Sync] dry-run：未写入任何数据。");
    }
  })
  .catch((error) => {
    console.error("[Sync] failed:", error.message);
    process.exitCode = 1;
  });
