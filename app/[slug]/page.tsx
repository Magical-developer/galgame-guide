import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleSection } from "@/components/article-section";
import { CoverImage } from "@/components/cover-image";
import { RelatedGames } from "@/components/related-games";
import { siteConfig } from "@/lib/config";
import { getAllGames, getGameBySlug, getGuideBySlug } from "@/lib/games";
import { findSection, parseFaq, parseGuideSections } from "@/lib/markdown";
import { getRelatedGames } from "@/lib/related-games";
import {
  buildCanonicalPath,
  buildGameDescription,
  buildGameKeywords,
  buildGameTitle,
} from "@/lib/seo";
import { generateFallbackContent } from "@/lib/content/generate-content";

export const dynamicParams = false;

export async function generateStaticParams() {
  const games = await getAllGames();
  return games.map((game) => ({ slug: game.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);

  if (!game) {
    return {};
  }

  const title = buildGameTitle(game);
  const description = buildGameDescription(game);
  const canonical = buildCanonicalPath(game.slug);

  return {
    title,
    description,
    keywords: buildGameKeywords(game),
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
      tags: game.tags,
      images: [
        {
          url: game.cover,
          alt: `${game.title} 封面`,
        },
      ],
    },
  };
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [game, allGames, guide] = await Promise.all([
    getGameBySlug(slug),
    getAllGames(),
    getGuideBySlug(slug),
  ]);

  if (!game) {
    notFound();
  }

  const markdown = guide?.markdown || generateFallbackContent(game);
  const sections = parseGuideSections(markdown);
  const faq = parseFaq(findSection(sections, "常见问题 FAQ"));
  const relatedGames = getRelatedGames(game, allGames);
  const canonical = `${siteConfig.siteUrl}/${game.slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "首页",
          item: siteConfig.siteUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: game.title,
          item: canonical,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: buildGameTitle(game),
      description: buildGameDescription(game),
      image: [game.cover],
      dateModified: game.updatedAt,
      datePublished: game.createdAt,
      mainEntityOfPage: canonical,
      about: [
        game.title,
        ...game.tags,
        "KRZACG",
        "GalGame",
        "黄油",
        "绅士游戏",
        "存档",
      ],
    },
    ...(faq.length > 0
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: item.answer,
              },
            })),
          },
        ]
      : []),
  ];

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
          <span className="text-[--ink-strong]">{game.title}</span>
        </nav>

        <section className="grid gap-8 rounded-[2.5rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.35)] lg:grid-cols-[0.92fr_1.08fr] lg:p-8">
          <div className="relative overflow-hidden rounded-4xl border border-white/10 bg-black/30">
            <div className="relative aspect-4/5">
              <CoverImage
                src={game.cover}
                alt={`${game.title} 封面`}
                priority
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
            </div>
          </div>

          <div className="space-y-7">
            <span className="eyebrow">Guide page</span>
            <div className="space-y-4">
              <h1 className="font-display text-4xl leading-tight text-[--ink-strong] sm:text-5xl lg:text-6xl">
                {game.title}
                <span className="block text-[--accent]">攻略 + 全CG解锁 + 存档整理</span>
              </h1>
              <p className="text-base leading-8 text-[--ink-soft] sm:text-lg">
                {game.summary}
              </p>
              <p className="text-sm leading-7 text-white/60 sm:text-base">
                适合在查找 {game.title} 攻略、全CG、存档、结局时快速对照，也方便继续顺着 KRZACG、GalGame、黄油、绅士游戏相关题材往下找。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {game.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs tracking-[0.16em] text-white/75"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["热度", game.views.toLocaleString()],
                [
                  "更新时间",
                  new Date(game.updatedAt).toLocaleDateString("zh-CN"),
                ],
                ["下载方式", game.downloadLabel],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-3xl border border-white/10 bg-black/20 p-4"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                    {label}
                  </p>
                  <p className="mt-2 text-sm text-[--ink-strong]">{value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <a
                href={`/go/${game.slug}`}
                className="group rounded-[2rem] border border-[--accent]/40 bg-[linear-gradient(135deg,rgba(252,177,93,0.95),rgba(255,209,102,0.92))] px-6 py-5 text-black shadow-[0_20px_60px_rgba(252,177,93,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_80px_rgba(252,177,93,0.34)]"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-black/65">
                      Main site access
                    </p>
                    <p className="text-xl font-semibold leading-tight sm:text-2xl">
                      前往主站获取 {game.title} 资源
                    </p>
                    <p className="text-sm leading-6 text-black/70 sm:text-base">
                      攻略先看这里，资源入口放在主站，点击后即可继续跳转。
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-black px-4 py-2 text-sm font-semibold tracking-[0.12em] text-white transition group-hover:bg-black/90">
                    立即前往 →
                  </span>
                </div>
              </a>
              <a
                href={siteConfig.mainSiteUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center rounded-[2rem] border border-white/12 px-6 py-4 text-sm tracking-[0.16em] text-white/75 transition hover:border-[--accent]/60 hover:text-[--ink-strong]"
              >
                返回主站
              </a>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <ArticleSection section={findSection(sections, "游戏剧情简介")} />
            <ArticleSection section={findSection(sections, "核心推荐理由")} />
            <ArticleSection section={findSection(sections, "完美攻略全流程")} />
            <ArticleSection
              section={findSection(sections, "全CG与回想场景解锁")}
            />
            <ArticleSection section={findSection(sections, "存档管理与安装说明")} />
            <section className="rounded-4xl border border-[--accent]/25 bg-[linear-gradient(180deg,rgba(252,177,93,0.12),rgba(255,255,255,0.03))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.24em] text-[--accent]">
                    Resource entry
                  </p>
                  <h2 className="font-display text-3xl text-[--ink-strong]">
                    看完攻略后，直接去主站拿资源
                  </h2>
                  <p className="max-w-2xl text-sm leading-7 text-[--ink-soft] sm:text-base">
                    如果你已经确认这作是自己想找的口味，现在可以直接跳到主站继续查看。
                  </p>
                </div>
                <a
                  href={`/go/${game.slug}`}
                  className="inline-flex items-center justify-center rounded-full bg-[--accent] px-7 py-3.5 text-sm font-semibold tracking-[0.16em] text-black transition hover:bg-[--accent-strong]"
                >
                  去主站继续
                </a>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="space-y-5 rounded-4xl border border-white/10 bg-white/4 p-6 shadow-[0_25px_70px_rgba(0,0,0,0.22)] backdrop-blur sm:p-8">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-[--accent]" />
                <h2 className="font-display text-2xl tracking-[0.08em] text-[--ink-strong]">
                  FAQ
                </h2>
              </div>

              <div className="space-y-4">
                {faq.map((item) => (
                  <article
                    key={item.question}
                    className="rounded-3xl border border-white/8 bg-black/20 p-4"
                  >
                    <h3 className="font-display text-lg text-[--ink-strong]">
                      {item.question}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-[--ink-soft]">
                      {item.answer}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <RelatedGames games={relatedGames} />
          </aside>
        </section>
      </div>
    </main>
  );
}
