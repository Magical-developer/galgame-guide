#!/usr/bin/env node
/**
 * 一次性把全站作品页推给 IndexNow。
 *
 * 日常增量不需要跑这个：两个 cron（sync-content / generate-intro）会在写库后
 * 自动只推本次变动的 URL。这个脚本只用于「站点首次接入」或「大批量修复后重建信任」。
 *
 *   pnpm indexnow:all            # 提交全部作品页
 *   pnpm indexnow:all --dry-run  # 只统计，不发请求
 *
 * 注意：IndexNow 把「重复提交未变更的 URL」算滥用。全量提交只该做一次，
 * 之后交给 cron 的增量推送。
 */

import nextEnv from "@next/env";
import { createClient } from "@libsql/client";

import { INDEXNOW_KEY, PRODUCTION_SITE_URL, submitSlugs } from "../lib/indexnow.mjs";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const dryRun = process.argv.includes("--dry-run");
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? PRODUCTION_SITE_URL;

const dbUrl = process.env.TURSO_DATABASE_URL;
if (!dbUrl) {
  console.error("[IndexNow] TURSO_DATABASE_URL is not set. Aborted.");
  process.exit(1);
}

const db = createClient({ url: dbUrl, authToken: process.env.TURSO_AUTH_TOKEN });
const rows = (await db.execute("SELECT slug FROM games")).rows;
const slugs = rows.map((row) => String(row.slug ?? "").trim()).filter(Boolean);

console.log(`[IndexNow] ${slugs.length} 个作品页 -> ${siteUrl}`);
if (dryRun) {
  console.log("[IndexNow] dry-run，不发请求。");
  process.exit(0);
}

const result = await submitSlugs({
  siteUrl,
  key: INDEXNOW_KEY,
  slugs,
  log: (message) => console.log(message),
});

console.log("[IndexNow] 结果:", result);
if (!result.ok) process.exitCode = 1;
