import type { Metadata } from "next";
import Link from "next/link";

import { BookmarkHint } from "@/components/bookmark-hint";
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
      "Galgame 作品库",
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
            <span className="eyebrow">Galgame · 视觉小说</span>
            <div className="space-y-5">
              <h1 className="max-w-4xl font-display text-5xl leading-none text-ink-strong sm:text-6xl lg:text-7xl">
                {allGames.length} 部 Galgame 和视觉小说，
                <span className="block text-accent">
                  想玩哪部，先在这儿查清楚。
                </span>
              </h1>
              <p className="max-w-2xl text-base leading-8 text-ink-soft sm:text-lg">
                搜作品名、题材或平台，能看到简介、类型标签、版本和更新时间。
                找到想玩的，一键跳到下载页。
              </p>
            </div>

            <form action="/archive" method="get" className="flex max-w-2xl flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="home-grid-search">搜索作品</label>
              <input
                id="home-grid-search"
                name="q"
                placeholder="搜作品名、题材或平台"
                className="min-w-0 flex-1 rounded-full border border-white/12 bg-black/25 px-5 py-3 text-sm text-ink-strong outline-none placeholder:text-white/35 focus:border-accent/70"
              />
              <button className="rounded-full bg-accent px-6 py-3 text-sm font-semibold tracking-[0.12em] text-black transition hover:bg-accent-strong">
                搜作品
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
              [`${allGames.length}`, "部作品"],
              ["每天", "有新作品进来"],
              ["免费", "不用注册"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5"
              >
                <p className="font-display text-3xl text-ink-strong">{value}</p>
                <p className="mt-2 text-xs tracking-[0.18em] text-white/45">
                  {label}
                </p>
              </div>
            ))}
          </aside>
        </header>

        <section id="hot-list" className="space-y-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <span className="eyebrow">热门</span>
              <h2 className="font-display text-4xl text-ink-strong">
                大家都在看
              </h2>
            </div>
            <Link
              href="/archive"
              className="text-sm font-semibold tracking-[0.1em] text-accent hover:underline"
            >
              看全部作品 →
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
              <span className="eyebrow">新收录</span>
              <h2 className="font-display text-4xl text-ink-strong">
                最近收录
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-white/55">
              每天同步新作品，刚进来的会排在这里。
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
            <span className="eyebrow">怎么用</span>
            <h2 className="font-display text-4xl text-ink-strong">
              三步找到想玩的
            </h2>
            <p className="text-base leading-8 text-ink-soft">
              这里只放作品资料和下载入口，不放游戏文件。查资料、看类型、去下载，一条线走完。
            </p>
          </div>

          <div className="grid gap-4">
            {[
              {
                title: "搜作品名",
                body: "中文名、日文名、英文名都能搜。名字记不全也没关系，打几个字就能翻到。",
              },
              {
                title: "看简介和标签",
                body: "什么类型、哪个平台、什么版本、多久更新过，都写在页面上。",
              },
              {
                title: "去下载页",
                body: "点「查看该作品资源」跳到下载页面。本站不存游戏文件。",
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

        <BookmarkHint />
      </div>
    </main>
  );
}
