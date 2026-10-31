import type { Metadata } from "next";
import Link from "next/link";

import { GameCard } from "@/components/game-card";
import { siteConfig } from "@/lib/config";
import { getAllGames, getFeaturedGames, getTopTags } from "@/lib/games";
import {
  buildCanonicalPath,
  buildHomeDescription,
  buildHomeKeywords,
  buildHomeTitle,
} from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: buildHomeTitle(),
  description: buildHomeDescription(),
  keywords: buildHomeKeywords(),
  alternates: {
    canonical: buildCanonicalPath(""),
  },
  openGraph: {
    title: buildHomeTitle(),
    description: buildHomeDescription(),
    type: "website",
    url: "/",
  },
};

export default async function HomePage() {
  const [featuredGames, allGames, topTags] = await Promise.all([
    getFeaturedGames(6),
    getAllGames(),
    getTopTags(10),
  ]);

  // Sort by updatedAt for recent list
  const recentGames = [...allGames]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 12);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: buildHomeTitle(),
    description: buildHomeDescription(),
    url: siteConfig.siteUrl,
    about: [
      "Galgame Guide",
      "Galgame 作品索引",
      "视觉小说目录",
      "作品标签",
      "视觉小说",
    ],
    mainEntity: {
      "@type": "ItemList",
      itemListElement: featuredGames.map((game, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteConfig.siteUrl}/${game.slug}`,
        name: game.title,
      })),
    },
  };

  return (
    <main className="shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-16 px-5 py-8 sm:px-8 lg:px-12">
        <header className="grid gap-8 rounded-[2.5rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-7 shadow-[0_40px_120px_rgba(0,0,0,0.38)] backdrop-blur lg:grid-cols-[1.25fr_0.75fr] lg:p-10">
          <div className="space-y-7">
            <span className="eyebrow">Galgame / Visual Novel Index</span>
            <div className="space-y-5">
              <h1 className="max-w-4xl font-display text-5xl leading-none text-ink-strong sm:text-6xl lg:text-7xl">
                把作品放进索引，
                <span className="block text-accent">
                  用可核对的信息做选择。
                </span>
              </h1>
              <p className="max-w-2xl text-base leading-8 text-ink-soft sm:text-lg">
                Galgame Guide 已整理 {allGames.length} 个视觉小说与 Galgame 条目。
                这里展示作品标题、原始概览、标签、热度与更新时间；没有证据的路线、存档和解锁条件不会被写成攻略。
              </p>
            </div>

            <form action="/archive" method="get" className="flex max-w-2xl flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="home-grid-search">搜索作品或标签</label>
              <input
                id="home-grid-search"
                name="q"
                placeholder="搜索作品名、平台、语言或题材"
                className="min-w-0 flex-1 rounded-full border border-white/12 bg-black/25 px-5 py-3 text-sm text-ink-strong outline-none placeholder:text-white/35 focus:border-accent/70"
              />
              <button className="rounded-full bg-accent px-6 py-3 text-sm font-semibold tracking-[0.12em] text-black transition hover:bg-accent-strong">
                搜索索引
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              {topTags.map((item) => (
                <Link
                  key={item.name}
                  href={`/archive?tag=${encodeURIComponent(item.name)}`}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/65 transition hover:border-accent/50 hover:text-accent"
                >
                  {item.name} · {item.count}
                </Link>
              ))}
            </div>
          </div>

          <aside className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {[
              ["收录作品", `${allGames.length}+`],
              ["索引方式", "标题 / 标签 / 更新时间"],
              ["内容原则", "不推断 / 可纠错"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5"
              >
                <p className="text-xs uppercase tracking-[0.25em] text-white/45">
                  {label}
                </p>
                <p className="mt-3 font-display text-3xl text-ink-strong">
                  {value}
                </p>
              </div>
            ))}
          </aside>
        </header>

        <section id="hot-list" className="space-y-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <span className="eyebrow">Popular records</span>
              <h2 className="font-display text-4xl text-ink-strong">
                热门作品档案
              </h2>
            </div>
            <Link 
              href="/archive"
              className="text-sm font-semibold tracking-[0.1em] text-accent hover:underline"
            >
              查看全部档案 →
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {featuredGames.map((game) => (
              <GameCard key={game.slug} game={game} />
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <span className="eyebrow">Recently updated</span>
              <h2 className="font-display text-4xl text-ink-strong">
                最近更新的条目
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-white/55">
              更新时间只反映来源记录发生变化，不代表作品内容或版本一定更新。
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {recentGames.map((game) => (
              <GameCard key={game.slug} game={game} />
            ))}
          </div>
        </section>

        <section className="grid gap-6 rounded-[2.5rem] border border-white/10 bg-black/20 p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-5">
            <span className="eyebrow">Information boundary</span>
            <h2 className="font-display text-4xl text-ink-strong">
              这份索引知道什么，也明确不知道什么。
            </h2>
            <p className="text-base leading-8 text-ink-soft">
              索引的职责是帮助你发现和比较作品，而不是把通用经验包装成具体攻略。未经核实的信息会留空，不会由标签自动补齐。
            </p>
          </div>

          <div className="grid gap-4">
            {[
              {
                title: "展示来源已有字段",
                body: "标题、概览、标签、热度和更新时间按原始记录展示，不把推测写成作品事实。",
              },
              {
                title: "站内完成发现任务",
                body: "搜索、标签筛选、排序和相似条目都在 Galgame Guide 内完成，不需要先跳到另一个站点。",
              },
              {
                title: "为人工核验留接口",
                body: "未来只有经过来源标注和人工复核的路线、版本或兼容信息，才会进入可索引的编辑内容。",
              },
            ].map((item, index) => (
              <article
                key={item.title}
                className="rounded-[1.75rem] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.18)]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10 font-display text-lg text-accent">
                    0{index + 1}
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-display text-2xl text-ink-strong">
                      {item.title}
                    </h3>
                    <p className="text-sm leading-7 text-ink-soft sm:text-[15px]">
                      {item.body}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
