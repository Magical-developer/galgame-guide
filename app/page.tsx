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
      "KRZACG",
      "GalGame",
      "黄油",
      "绅士游戏",
      "游戏攻略",
      "全CG",
      "存档",
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
            <span className="eyebrow">热门攻略</span>
            <div className="space-y-5">
              <h1 className="max-w-4xl font-display text-5xl leading-none text-[--ink-strong] sm:text-6xl lg:text-7xl">
                KRZACG、GalGame、黄油、绅士游戏攻略都在这。
                <span className="block text-[--accent]">
                  想找全CG和存档，先从热门作品开始看。
                </span>
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[--ink-soft] sm:text-lg">
                这里会整理 KRZACG 常见题材下的 GalGame、黄油、绅士游戏攻略信息，
                包括路线重点、全CG
                回收、存档安排、下载方式和常见问题。准备开坑之前先翻一眼，能少走不少弯路。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="#hot-list"
                className="rounded-full bg-[--accent] px-6 py-3 text-sm font-semibold tracking-[0.16em] text-black transition hover:bg-[--accent-strong]"
              >
                查看热门攻略
              </Link>
              <a
                href={siteConfig.mainSiteUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/12 px-6 py-3 text-sm tracking-[0.16em] text-white/75 transition hover:border-[--accent]/60 hover:text-[--ink-strong]"
              >
                进入主站
              </a>
            </div>
          </div>

          <aside className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {[
              ["收录作品", `${allGames.length}+`],
              ["热门分类", "GalGame / 黄油 / 绅士游戏"],
              ["常看内容", "攻略 / 全CG / 存档"],
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
            <span className="eyebrow">怎么用这个站</span>
            <h2 className="font-display text-4xl text-[--ink-strong]">
              找 GalGame 攻略或黄油存档，从这里比搜索引擎快
            </h2>
            <p className="text-base leading-8 text-[--ink-soft]">
              每个攻略页都把简介、分支路线、全CG 触发条件、存档建议和同类推荐放在显眼位置，方便一边玩一边对照，不用反复搜索。
            </p>
          </div>

          <div className="grid gap-4">
            {[
              {
                title: "想判断一作值不值得开坑",
                body: "看简介和题材标签就够了。每个页面都提前放好了游戏类型和玩法风格描述，翻十秒就能决定要不要继续。",
              },
              {
                title: "想快速解锁全CG或补完结局",
                body: "攻略里会整理各分支的触发条件和 CG 解锁顺序，标出推荐的存档节点，不用自己盲跳，省去大量重复流程。",
              },
              {
                title: "想顺着一部继续找同类型",
                body: "每个页面底部都会推荐题材相近的作品，3D、官中、剧情向、动态CG 各有分类，找续坑或换口味都方便。",
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
              <span className="eyebrow">热门列表</span>
              <h2 className="font-display text-4xl text-[--ink-strong]">
                热门游戏攻略页
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-white/55">
              每张卡片都会进入单独攻略页，里面会整理简介、攻略要点、FAQ、
              全CG、存档和类似游戏推荐，方便直接对照查看。
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
