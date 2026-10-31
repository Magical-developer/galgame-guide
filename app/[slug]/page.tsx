import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { RelatedGames } from "@/components/related-games";
import { buildMainSiteGameUrl } from "@/lib/config";
import { getAllGames, getAllSlugs, getGameBySlug } from "@/lib/games";
import { getRelatedGames } from "@/lib/related-games";
import {
  buildCanonicalPath,
  buildGameDescription,
  buildGameKeywords,
  buildGameStructuredData,
  buildGameTitle,
} from "@/lib/seo";

export const revalidate = 86400;

/**
 * 预渲染最近 500 个作品页。
 *
 * 没有 generateStaticParams 时 `[slug]` 是纯动态路由：`revalidate` 完全不生效，
 * 每个请求都重新 SSR，响应头是 `private, no-store`，Vercel CDN 一律不缓存。
 * 给出参数后路由变成 ISR —— 预渲染的走 CDN，其余参数首次访问后同样被缓存。
 *
 * 只预渲染 500 个而不是全部 3,876 个：构建时长和产物体积都可控，长尾页面
 * 第一次被访问时生成并缓存，对爬虫和用户的效果一样。
 */
const PRERENDER_LIMIT = 500;

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.slice(0, PRERENDER_LIMIT).map((slug) => ({ slug }));
}

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
    // absolute 绕开 layout 的 `%s | Galgame Guide` 模板：作品名长度不可控，
    // 交给 buildGameTitle 自己决定要不要带品牌后缀，才能保证不超过 70 字符。
    title: { absolute: title },
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

/**
 * 页内小节标题。爬虫靠 h2 理解「这一页由哪几块内容组成」，
 * 之前整页只有 h1 和「相似条目」一个 h2，中间的信息块对爬虫是不可分的。
 */
function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-2 w-2 rounded-full bg-accent" />
      <h2 className="font-display text-xl tracking-[0.08em] text-ink-strong">
        {children}
      </h2>
    </div>
  );
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
  const jsonLd = buildGameStructuredData(game);

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

          <section className="mt-8">
            <SectionHeading>作品简介</SectionHeading>

            <p className="mt-4 text-base leading-8 text-ink-soft sm:text-lg">
              {game.aiIntro ?? game.summary}
            </p>

            {game.aiPoints.length > 0 && (
              <ul className="mt-4 space-y-2 text-sm leading-7 text-ink-soft">
                {game.aiPoints.map((point) => (
                  <li key={point} className="flex gap-2.5">
                    <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {game.tags.length > 0 && (
            <section className="mt-8">
              <SectionHeading>类型标签</SectionHeading>

              <div className="mt-4 flex flex-wrap gap-2">
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
            </section>
          )}

          <section className="mt-8">
            <SectionHeading>收录信息</SectionHeading>

            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
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
          </section>

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
