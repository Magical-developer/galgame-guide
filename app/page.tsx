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
      "次元绅士指南",
      "绅游推荐",
      "绅士游戏攻略",
      "Galgame攻略",
      "全CG存档",
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
            <span className="eyebrow">绅游攻略索引</span>
            <div className="space-y-5">
              <h1 className="max-w-4xl font-display text-5xl leading-none text-[--ink-strong] sm:text-6xl lg:text-7xl">
                绅游推荐、Galgame 全结局达成指南。
                <span className="block text-[--accent]">
                  为您拆解剧情分歧，快速解锁回想与全图存档。
                </span>
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[--ink-soft] sm:text-lg">
                次元绅士指南致力于为您提供深度的视觉小说（Visual Novel）与绅士游戏攻略。
                无论您是在寻找核心角色路线的分歧点，还是需要全CG 存档的安装路径，
                本站的结构化指南都能助您在最短时间内达成完美通关。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="#hot-list"
                className="rounded-full bg-[--accent] px-6 py-3 text-sm font-semibold tracking-[0.16em] text-black transition hover:bg-[--accent-strong]"
              >
                查阅绅士指南
              </Link>
              <a
                href={siteConfig.mainSiteUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/12 px-6 py-3 text-sm tracking-[0.16em] text-white/75 transition hover:border-[--accent]/60 hover:text-[--ink-strong]"
              >
                前往主站获取资源
              </a>
            </div>
          </div>

          <aside className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {[
              ["收录作品", `${allGames.length}+`],
              ["内容分类", "绅游推荐 / Galgame / 绅士向"],
              ["核心指南", "结局路线 / 全CG解锁 / 存档索引"],
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
            <span className="eyebrow">专业绅游解析</span>
            <h2 className="font-display text-4xl text-[--ink-strong]">
              不止是推荐，更是每一位绅士的游戏必备手册
            </h2>
            <p className="text-base leading-8 text-[--ink-soft]">
              我们深知玩家对全收集的执着。本站所有的攻略文章均经过系统重构，重点突出关键分歧点与回想触发逻辑。
            </p>
          </div>

          <div className="grid gap-4">
            {[
              {
                title: "多维度的绅游路线解析",
                body: "通过详细的选项权重分析，我们为您标注了每一条角色路线的开启条件，确保您可以精准避开无谓的重复流程。",
              },
              {
                title: "回想场景与全CG收集条件",
                body: "不再需要盲目探索。针对每一张特殊CG，我们都提供了明确的触发节点说明，包括多周目才能解锁的隐藏回想。",
              },
              {
                title: "存档位置与兼容性安装说明",
                body: "整理了各版本绅士游戏的存档路径，特别针对汉化版游戏的存档读写问题提供了专业的技术指导。",
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
              <span className="eyebrow">最新推荐</span>
              <h2 className="font-display text-4xl text-[--ink-strong]">
                绅游与 Galgame 攻略新作
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-white/55">
              以下是次元绅士指南近期收录的高质量攻略索引。点击进入详情页，开启您的完美绅士之旅。
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
