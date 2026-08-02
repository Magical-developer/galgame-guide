import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CoverImage } from "@/components/cover-image";
import { RelatedGames } from "@/components/related-games";
import { buildMainSiteFriendUrl, siteConfig } from "@/lib/config";
import { getAllGames, getGameBySlug } from "@/lib/games";
import { getRelatedGames } from "@/lib/related-games";
import {
  buildCanonicalPath,
  buildGameDescription,
  buildGameKeywords,
  buildGameTitle,
  buildTwitterMeta,
} from "@/lib/seo";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);

  if (!game) return {};

  const title = buildGameTitle(game);
  const description = buildGameDescription(game);
  const canonical = buildCanonicalPath(game.slug);

  return {
    title,
    description,
    keywords: buildGameKeywords(game),
    alternates: { canonical },
    // 当前条目来自合作数据源，尚未经过逐条人工核验；保留给用户浏览与站内发现，
    // 但不把镜像档案作为独立编辑内容提交搜索索引。
    robots: { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: game.cover
        ? [{ url: game.cover, alt: `${game.title} 封面` }]
        : undefined,
    },
    twitter: buildTwitterMeta({
      title,
      description,
      image: game.cover,
    }),
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
    image: game.cover || undefined,
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
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 py-8 sm:px-8 lg:px-12">
        <nav className="flex flex-wrap items-center gap-3 text-sm text-white/55">
          <Link href="/" className="transition hover:text-[--ink-strong]">
            首页
          </Link>
          <span>/</span>
          <Link href="/archive" className="transition hover:text-[--ink-strong]">
            作品索引
          </Link>
          <span>/</span>
          <span className="line-clamp-1 text-[--ink-strong]">{game.title}</span>
        </nav>

        <section className="grid gap-8 rounded-[2.5rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.35)] lg:grid-cols-[0.82fr_1.18fr] lg:p-8">
          <div className="relative overflow-hidden rounded-4xl border border-white/10 bg-black/30">
            <div className="relative aspect-4/5">
              <CoverImage
                src={game.cover}
                alt={`${game.title} 封面`}
                priority
                sizes="(max-width: 1024px) 100vw, 38vw"
                className="object-cover"
              />
            </div>
          </div>

          <div className="flex flex-col gap-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="eyebrow">Record / {game.sourceId.slice(-8)}</span>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50">
                未经逐条人工核验
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="font-display text-4xl leading-tight text-[--ink-strong] sm:text-5xl lg:text-6xl">
                {game.title}
              </h1>
              <p className="text-base leading-8 text-[--ink-soft] sm:text-lg">
                {game.summary || "来源记录没有提供可展示的作品概览。"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {game.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/archive?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs tracking-[0.12em] text-white/75 transition hover:border-[--accent]/55 hover:text-[--accent]"
                >
                  {tag}
                </Link>
              ))}
            </div>

            <dl className="grid gap-4 sm:grid-cols-2">
              {[
                ["热度", game.views.toLocaleString()],
                ["首次收录", formatDate(game.createdAt)],
                ["记录更新", formatDate(game.updatedAt)],
                ["标签数量", String(game.tags.length)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <dt className="text-xs uppercase tracking-[0.2em] text-white/45">{label}</dt>
                  <dd className="mt-2 text-sm text-[--ink-strong]">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="space-y-2 pt-1">
              <a
                href={buildMainSiteFriendUrl()}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-[--accent] px-6 py-4 text-sm font-semibold tracking-[0.12em] text-black transition hover:bg-[--accent-strong]"
              >
                前往主站查看资源 ↗
              </a>
              <p className="text-center text-xs text-white/40">
                普通合作链接，不弹广告，不创建隐藏跳转。
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-4xl border border-white/10 bg-white/4 p-6 shadow-[0_25px_70px_rgba(0,0,0,0.2)] sm:p-8">
            <p className="eyebrow">What this record contains</p>
            <h2 className="mt-4 font-display text-3xl text-[--ink-strong]">作品档案，不是自动攻略</h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-[--ink-soft] sm:text-base">
              <p>
                本页只整理来源记录中已经存在的标题、概览、标签、热度和时间字段，用于站内检索、比较和发现相似作品。
              </p>
              <p>
                路线选择、结局条件、CG 解锁、补丁兼容和存档位置都需要具体版本与实测证据。在没有来源和人工复核前，Galgame Guide 不会根据题材标签自动生成这些结论。
              </p>
            </div>
          </article>

          <aside className="rounded-4xl border border-[--accent]/25 bg-[linear-gradient(180deg,rgba(252,177,93,0.12),rgba(255,255,255,0.03))] p-6 sm:p-8">
            <p className="eyebrow">Quality gate</p>
            <h2 className="mt-4 font-display text-2xl text-[--ink-strong]">编辑内容的发布条件</h2>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-[--ink-soft]">
              <li>明确对应的作品版本和运行平台</li>
              <li>能够追溯的信息来源或实测记录</li>
              <li>作者与复核时间清晰可见</li>
              <li>未知信息保持未知，不用模板补齐</li>
            </ul>
          </aside>
        </section>

        <RelatedGames games={relatedGames} />
      </div>
    </main>
  );
}
