import type { Metadata } from "next";
import { GameCard } from "@/components/game-card";
import { getAllGames } from "@/lib/games";
import { buildCanonicalPath } from "@/lib/seo";

export const metadata: Metadata = {
  title: "全站攻略归档 | 次元绅士指南",
  description: "在这里查看次元绅士指南收录的所有 Galgame 与绅士游戏攻略索引。按时间倒序排列，助您快速定位最新解析内容。",
  alternates: {
    canonical: buildCanonicalPath("archive"),
  },
};

export default async function ArchivePage() {
  const allGames = await getAllGames();

  return (
    <main className="shell">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-12 px-5 py-12 sm:px-8 lg:px-12">
        <header className="space-y-4">
          <span className="eyebrow">攻略百科索引</span>
          <h1 className="font-display text-5xl text-[--ink-strong] sm:text-6xl">全站攻略归档</h1>
          <p className="max-w-2xl text-lg text-[--ink-soft]">
            目前已累计收录 {allGames.length} 篇深度绅游解析。我们会保持每日更新，为您提供最精准的剧情分歧与全结局达成指南。
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {allGames.map((game) => (
            <GameCard key={game.slug} game={game} />
          ))}
        </div>
        
        {allGames.length === 0 && (
          <div className="rounded-[2.5rem] border border-white/10 bg-black/20 py-20 text-center">
            <p className="text-[--ink-soft]">暂无收录内容，请等待每日同步更新。</p>
          </div>
        )}

        <footer className="mt-12 flex justify-center border-t border-white/10 pt-12">
          <a
            href="/"
            className="rounded-full border border-white/12 px-8 py-4 text-sm font-semibold tracking-[0.16em] text-white/75 transition hover:border-[--accent]/60 hover:text-[--ink-strong]"
          >
            返回首页
          </a>
        </footer>
      </div>
    </main>
  );
}
