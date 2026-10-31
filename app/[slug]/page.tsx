import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RelatedGames } from "@/components/related-games";
import { buildMainSiteGameUrl, siteConfig } from "@/lib/config";
import { getAllGames, getGameBySlug } from "@/lib/games";
import { getRelatedGames } from "@/lib/related-games";
import {
  buildCanonicalPath,
  buildGameDescription,
  buildGameKeywords,
  buildGameTitle,
} from "@/lib/seo";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);

  // 必须在这里 notFound：页面进入流式渲染后再调用，响应头已经发出 200，
  // 只能渲染 404 内容（软 404）。metadata 阶段抛 404 才能给出真正的状态码。
  if (!game) notFound();

  const title = buildGameTitle(game);
  const description = buildGameDescription(game);
  const canonical = buildCanonicalPath(game.slug);

  return {
    title,
    description,
    keywords: buildGameKeywords(game),
    alternates: { canonical },
    // 2026-10-31 放开收录：这个站点是 Bing 侧唯一的自然搜索入口，
    // 作品页必须可索引才有承接价值。干净化在 lib/content-clean.ts 里做，
    // 页面不再输出任何图片，避免被判定为成人内容站。
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "未提供" : date.toLocaleDateString("zh-CN");
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [game, allGames] = await Promise.all([
    getGameBySlug(slug),
    getAllGames(),
  ]);

  if (!game) notFound();

  const relatedGames = getRelatedGames(game, allGames);
  const canonical = `${siteConfig.siteUrl}/${game.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: game.title,
    description: game.summary,
    genre: game.tags,
    dateModified: game.updatedAt || undefined,
    mainEntityOfPage: canonical,
    isPartOf: {
      "@type": "CollectionPage",
      name: siteConfig.name,
      url: siteConfig.siteUrl,
    },
  };

  return (
    <main className="shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-5 py-8 sm:px-8 lg:px-12">
        <nav className="flex flex-wrap items-center gap-3 text-sm text-white/55">
          <Link href="/" className="transition hover:text-ink-strong">
            首页
          </Link>
          <span>/</span>
          <Link href="/archive" className="transition hover:text-ink-strong">
            作品索引
          </Link>
          <span>/</span>
          <span className="line-clamp-1 text-ink-strong">{game.title}</span>
        </nav>

        <article className="rounded-[2.5rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.35)] sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="eyebrow">作品资料</span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50">
              数据来自公开数据源，未经逐条人工核验
            </span>
          </div>

          <h1 className="mt-6 font-display text-3xl leading-tight text-ink-strong sm:text-4xl lg:text-5xl">
            {game.title}
          </h1>

          <p className="mt-5 text-base leading-8 text-ink-soft sm:text-lg">
            {game.aiIntro ?? game.summary}
          </p>

          {game.aiPoints.length > 0 && (
            <ul className="mt-5 space-y-2 text-sm leading-7 text-ink-soft">
              {game.aiPoints.map((point) => (
                <li key={point} className="flex gap-2.5">
                  <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}

          {game.tags.length > 0 && (
            <div className="mt-7 flex flex-wrap gap-2">
              {game.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/archive?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs tracking-[0.12em] text-white/75 transition hover:border-accent/55 hover:text-accent"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}

          <dl className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ["热度", game.views.toLocaleString()],
              ["首次收录", formatDate(game.createdAt)],
              ["资料更新", formatDate(game.updatedAt)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-3xl border border-white/10 bg-black/20 p-4"
              >
                <dt className="text-xs uppercase tracking-[0.2em] text-white/45">
                  {label}
                </dt>
                <dd className="mt-2 text-sm text-ink-strong">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 space-y-3 border-t border-white/10 pt-8">
            <a
              href={buildMainSiteGameUrl(game.sourceId)}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              // 全站唯一要回答的问题：这个按钮到底有没有人点。
              // Umami 的 data-umami-event-* 会作为事件属性一起上报，能按作品归因。
              data-umami-event="guide-deeplink"
              data-umami-event-post-id={game.sourceId}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-accent px-6 py-4 text-sm font-semibold tracking-[0.12em] text-black transition hover:bg-accent-strong"
            >
              查看该作品资源 ↗
            </a>
            <p className="text-center text-xs leading-6 text-white/40">
              将跳转到资源站中与《{game.title}》对应的页面。本站只整理作品资料，不托管任何文件。
            </p>
          </div>
        </article>

        <RelatedGames games={relatedGames} />
      </div>
    </main>
  );
}
