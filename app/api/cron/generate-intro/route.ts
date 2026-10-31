import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { siteConfig } from "@/lib/config";
import { db } from "@/lib/db";
import { submitSlugs } from "@/lib/indexnow.mjs";
import { runIntroGeneration } from "@/lib/intro/engine.mjs";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * 每天补一批中性作品介绍。
 *
 * 为什么要按天而不是一次跑完：
 *   1. Cloudflare Workers AI 免费额度按天算，攒着跑会撞配额；
 *   2. 「站点每天都有新内容」本身就是给爬虫的更新信号，一次跑完等于没信号。
 *
 * 2026-11-01 实测：并发 4 时每条约 3.6s，100 条跑 90.8s、0 失败、未撞 429。
 * 40 条 ≈ 36s，留足 60s 上限的余量。存量补齐靠本地 `pnpm intro:gen --limit=N`
 * 批量跑，不受函数时限约束。
 */
const DAILY_LIMIT = Number(process.env.CRON_INTRO_LIMIT ?? 40);

function isAuthorized(authorization: string | null, userAgent: string | null) {
  if (siteConfig.cronSecret) {
    return authorization === `Bearer ${siteConfig.cronSecret}`;
  }
  return Boolean(userAgent?.includes("vercel-cron"));
}

export async function GET(request: Request) {
  const requestHeaders = await headers();
  const authorization = requestHeaders.get("authorization");
  const userAgent = requestHeaders.get("user-agent");

  if (!siteConfig.cronSecret) {
    console.warn(
      "[Cron] CRON_SECRET is not configured; falling back to User-Agent check. Set CRON_SECRET to enforce bearer auth.",
    );
  }

  if (!isAuthorized(authorization, userAgent)) {
    console.error("[Cron] Unauthorized access attempt.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_AI_API_TOKEN;
  if (!accountId || !apiToken) {
    // 不当作错误：没配 AI 凭证时站点照常跑，只是不生成新介绍。
    console.warn("[Cron] AI 凭证未配置，跳过本次生成。");
    return NextResponse.json(
      { ok: false, skipped: true, reason: "AI credentials not configured" },
      { status: 200 },
    );
  }

  const startedAt = Date.now();
  const dryRun = new URL(request.url).searchParams.get("dry_run") === "1";

  try {
    const stats = await runIntroGeneration({
      db,
      limit: DAILY_LIMIT,
      accountId,
      apiToken,
      model: process.env.CLOUDFLARE_AI_MODEL ?? "@cf/openai/gpt-oss-20b",
      dryRun,
      log: (message) => console.log(message),
    });

    if (!dryRun && stats.written > 0) {
      // 新介绍落地就让首页与索引页重建，不必等 ISR 窗口
      revalidatePath("/");
      revalidatePath("/archive");

      // 作品页是 24h 的 ISR 缓存，不逐个失效的话，新介绍要等一天才可见 ——
      // 「每天都有更新」这个信号就断了。只失效本次真改过的页面。
      for (const slug of stats.writtenSlugs) revalidatePath(`/${slug}`);

      // 介绍被重写 = 这些页面内容真的变了，主动推给 Bing，不用等它排到抓取队列。
      // submitSlugs 内部吞掉异常：推送失败不能让已经写好的数据被当成任务失败。
      await submitSlugs({
        siteUrl: siteConfig.siteUrl,
        key: siteConfig.indexNowKey,
        slugs: stats.writtenSlugs,
        log: (message) => console.log(message),
      });
    }

    const durationMs = Date.now() - startedAt;
    console.log("[Cron] intro done:", { ...stats, durationMs });
    return NextResponse.json({
      ok: true,
      ...stats,
      durationMs,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Cron] intro failed:", message);
    return NextResponse.json(
      { ok: false, message, durationMs: Date.now() - startedAt },
      { status: 502 },
    );
  }
}
