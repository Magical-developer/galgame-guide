import type { Metadata } from "next";
import Link from "next/link";

import { GameCard } from "@/components/game-card";
import { siteConfig } from "@/lib/config";
import { getAllGames, getFeaturedGames } from "@/lib/games";
import {
  buildCanonicalPath,
  buildHomeDescription,
  buildHomeKeywords,
  buildHomeTitle,
} from "@/lib/seo";

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
  const [featuredGames, allGames] = await Promise.all([
    getFeaturedGames(6),
    getAllGames(),
  ]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: buildHomeTitle(),
    description: buildHomeDescription(),
    url: siteConfig.siteUrl,
    about: [
      "次元轨迹",
      "Galgame攻略",
      "黄油攻略",
      "绅士游戏攻略",
      "全CG存档",
      "回想解锁",
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
            <span className="eyebrow">热门攻略索引</span>
            <div className="space-y-5">
              <h1 className="max-w-4xl font-display text-5xl leading-none text-[--ink-strong] sm:text-6xl lg:text-7xl">
                Galgame、黄油、美少女游戏全结局攻略指南。
                <span className="block text-[--accent]">
                  快速解锁全CG回想与存档，助您达成完美真结局。
                </span>
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[--ink-soft] sm:text-lg">
                次元轨迹为您整理了视觉小说（Visual Novel）领域的热门作品攻略，
                涵盖了复杂的选项分歧、全CG 收集条件、存档路径说明及常见报错解决。
                在开始深度体验剧情之前，先通过本站索引掌握核心路线，提升游玩效率。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="#hot-list"
                className="rounded-full bg-[--accent] px-6 py-3 text-sm font-semibold tracking-[0.16em] text-black transition hover:bg-[--accent-strong]"
              >
                探索攻略库
              </Link>
              <a
                href={siteConfig.mainSiteUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/12 px-6 py-3 text-sm tracking-[0.16em] text-white/75 transition hover:border-[--accent]/60 hover:text-[--ink-strong]"
              >
                前往主站资源库
              </a>
            </div>
          </div>

          <aside className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {[
              ["收录作品", `${allGames.length}+`],
              ["内容分类", "Galgame / 黄油 / 剧情向"],
              ["核心指南", "结局攻略 / 全CG / 存档说明"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5"
              >
                <p className="text-xs uppercase tracking-[0.25em] text-white/45">
                  {label}
                </p>
                <p className="mt-3 font-display text-3xl text-[--ink-strong]">
                  {value}
                </p>
              </div>
            ))}
          </aside>
        </header>

        <section className="grid gap-6 rounded-[2.5rem] border border-white/10 bg-black/20 p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-5">
            <span className="eyebrow">本站特色</span>
            <h2 className="font-display text-4xl text-[--ink-strong]">
              深耕视觉小说领域，为您提供精准的剧情导航
            </h2>
            <p className="text-base leading-8 text-[--ink-soft]">
              无论您是追求全成就收集的硬核玩家，还是只想快速查看角色支线的休闲玩家，本站的结构化攻略都能满足您的需求。
            </p>
          </div>

          <div className="grid gap-4">
            {[
              {
                title: "详尽的分歧路线与选项说明",
                body: "每个攻略页都精准标注了关键的分歧选项。通过预留的存档点建议，您可以一次性达成多个结局，显著减少重复流程。",
              },
              {
                title: "全CG与回想解锁条件汇总",
                body: "不再为缺失的一张CG而苦恼。我们详细列出了每一张回想场景的触发前置，包括隐藏结局后的奖励内容说明。",
              },
              {
                title: "专业的存档管理与报错指引",
                body: "整理了不同版本的存档路径，并针对汉化补丁失效、存档损坏等常见技术问题提供快速解决方案。",
              },
            ].map((item, index) => (
              <article
                key={item.title}
                className="rounded-[1.75rem] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.18)]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[--accent]/30 bg-[--accent]/10 font-display text-lg text-[--accent]">
                    0{index + 1}
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-display text-2xl text-[--ink-strong]">
                      {item.title}
                    </h3>
                    <p className="text-sm leading-7 text-[--ink-soft] sm:text-[15px]">
                      {item.body}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="hot-list" className="space-y-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <span className="eyebrow">内容概览</span>
              <h2 className="font-display text-4xl text-[--ink-strong]">
                最新收录攻略索引
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-white/55">
              以下是次元轨迹近期更新的热门攻略列表。您可以点击进入详情页，查看该作品的详细全结局路线与回想解锁方式。
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {featuredGames.map((game, index) => (
              <GameCard key={game.slug} game={game} priority={index < 3} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
