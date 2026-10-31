#!/usr/bin/env node
/**
 * 手动补跑「中性作品介绍」生成。
 *
 * 日常增量由 Vercel Cron 调用 /api/cron/generate-intro 完成（同一个引擎，
 * 见 lib/intro/engine.mjs）。这里只负责本地补历史与预演。
 *
 *   pnpm intro:gen                 # 增量：20 条
 *   pnpm intro:gen --limit=50      # 指定条数
 *   pnpm intro:gen --dry-run       # 只调模型、不写库
 *
 * 需要环境变量 CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_AI_API_TOKEN。
 */

import nextEnv from "@next/env";
import { createClient } from "@libsql/client";

import { runIntroGeneration } from "../lib/intro/engine.mjs";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const args = process.argv.slice(2);
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 20;
const dryRun = args.includes("--dry-run");

const dbUrl = process.env.TURSO_DATABASE_URL;
const dbToken = process.env.TURSO_AUTH_TOKEN;
if (!dbUrl) {
  console.error("[Intro] TURSO_DATABASE_URL is not set. Aborted.");
  process.exit(1);
}

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_AI_API_TOKEN;
if (!accountId || !apiToken) {
  console.error(
    "[Intro] 缺少 CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_AI_API_TOKEN。Aborted.",
  );
  process.exit(1);
}

const db = createClient({ url: dbUrl, authToken: dbToken });

const startedAt = Date.now();
const stats = await runIntroGeneration({
  db,
  limit,
  accountId,
  apiToken,
  model: process.env.CLOUDFLARE_AI_MODEL ?? "@cf/openai/gpt-oss-20b",
  dryRun,
  log: (message) => console.log(message),
});

console.log(
  `[Intro] ${dryRun ? "预演" : "完成"}：候选 ${stats.picked}，写入 ${stats.written}，` +
    `拒绝 ${stats.rejected}，失败 ${stats.failed}，用时 ${((Date.now() - startedAt) / 1000).toFixed(1)}s`,
);
