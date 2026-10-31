import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { siteConfig } from "@/lib/config";
import { db } from "@/lib/db";
import { submitSlugs } from "@/lib/indexnow.mjs";
import { runIntroGeneration } from "@/lib/intro/engine.mjs";

// Vercel Hobby 的函数上限是 300s（Fluid Compute 之后不再是 60s），
// 见 https://vercel.com/docs/functions/limitations 。原来按 60s 排的日产量
// 只有 40 条，2,600 多条存量要跑两个多月。
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * 每天把 Cloudflare 免费额度用满。
 *
 * 配额实测：10,000 neurons/天 ÷ 20 neurons/条 ≈ 500 条/天。跑不满就是白扔。
 *
 * 吞吐实测：并发 4 时每条约 3.6s。450 条在并发 10 下约 163s，
 * 落在 300s 的函数上限内，留足余量。存量 2,600 多条约 6 天补完。
 *
 * 为什么仍然按天跑而不是一次灌完：额度是每天给的，攒着跑只会撞 429；
 * 而且「站点每天都有新内容」本身就是给爬虫的更新信号。
 */
const DAILY_LIMIT = Number(process.env.CRON_INTRO_LIMIT ?? 450);

/** 并发。抬到 10 是为了在 300s 内跑完 450 条；再高容易撞 Cloudflare 的速率限制。 */
const CONCURRENCY = Number(process.env.CRON_INTRO_CONCURRENCY ?? 10);

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
      concurrency: CONCURRENCY,
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
