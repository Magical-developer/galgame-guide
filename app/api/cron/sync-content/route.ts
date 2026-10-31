import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { siteConfig } from "@/lib/config";
import { db } from "@/lib/db";
import { submitSlugs } from "@/lib/indexnow.mjs";
import { runCatalogSync } from "@/lib/sync/engine.mjs";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// 每天只抓最新几页就够：主站日均新增约 20–40 篇，2 页（100 条）足够覆盖，
// 也不会把函数执行时间拖长。要补历史用 `pnpm content:sync --full`。
const INCREMENTAL_MAX_PAGES = Number(process.env.CRON_SYNC_MAX_PAGES ?? 2);

function isAuthorized(authorization: string | null, userAgent: string | null) {
  // 配置了 CRON_SECRET 就只认 Bearer。旧实现允许 UA 含 "vercel-cron" 直接放行，
  // 而 UA 可以随意伪造，等于密钥配了也不生效。
  if (siteConfig.cronSecret) {
    return authorization === `Bearer ${siteConfig.cronSecret}`;
  }
  // 未配置密钥时保留 Vercel Cron 的 UA 识别，避免直接打断计划任务。
  return Boolean(userAgent?.includes("vercel-cron"));
}

export async function GET(request: Request) {
  const requestHeaders = await headers();
  const authorization = requestHeaders.get("authorization");
  const userAgent = requestHeaders.get("user-agent");

  if (!siteConfig.cronSecret) {
    console.warn(
      "[Cron] CRON_SECRET is not configured; falling back to User-Agent check. Set CRON_SECRET to enforce bearer auth."
    );
  }

  if (!isAuthorized(authorization, userAgent)) {
    console.error("[Cron] Unauthorized access attempt.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  // 带 ?dry_run=1 时只统计不写库，用于上线后验证连通性。
  const dryRun = new URL(request.url).searchParams.get("dry_run") === "1";

  try {
    const stats = await runCatalogSync({
      db,
      sourceApiUrl: siteConfig.sourceApiUrl,
      maxPages: INCREMENTAL_MAX_PAGES,
      categorySlugs: process.env.CONTENT_SYNC_CATEGORY_SLUGS ?? "hentai,game",
      excludeKeywords: process.env.CONTENT_SYNC_EXCLUDE_KEYWORDS ?? undefined,
      imageCdnBase: process.env.CONTENT_SYNC_IMAGE_CDN ?? undefined,
      dryRun,
      log: (message) => console.log(message),
    });

    // 数据变了就让发现面立即重建，不必等 1h 的 ISR 窗口。
    if (!dryRun) {
      revalidatePath("/");
      revalidatePath("/archive");

      // 新增/更新过的作品页主动推给 Bing。只推本次真写库的 slug ——
      // 重复提交未变更的 URL 会被 IndexNow 判滥用。
      await submitSlugs({
        siteUrl: siteConfig.siteUrl,
        key: siteConfig.indexNowKey,
        slugs: stats.changedSlugs,
        log: (message) => console.log(message),
      });
    }

    const durationMs = Date.now() - startedAt;
    console.log("[Cron] sync done:", { ...stats, durationMs });

    return NextResponse.json({
      ok: true,
      ...stats,
      durationMs,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Cron] sync failed:", message);
    return NextResponse.json(
      { ok: false, message, durationMs: Date.now() - startedAt },
      { status: 502 }
    );
  }
}
