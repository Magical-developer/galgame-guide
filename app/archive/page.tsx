import type { Metadata } from "next";
import Link from "next/link";
import { GameCard } from "@/components/game-card";
import { getGamesCount, getGamesPaginated } from "@/lib/games";
import { buildCanonicalPath } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "全站攻略归档 | 次元绅士指南",
  description:
    "在这里查看次元绅士指南收录的所有 Galgame 与绅士游戏攻略索引。按时间倒序排列，助您快速定位最新解析内容。",
  alternates: {
    canonical: buildCanonicalPath("archive"),
  },
};

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const pageSize = 48;

  const [games, total] = await Promise.all([
    getGamesPaginated(page, pageSize),
    getGamesCount(),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  const pageNumbers = (() => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    let start = Math.max(2, page - 1);
    let end = Math.min(totalPages - 1, page + 1);
    if (page <= 3) {
      start = 2;
      end = Math.min(totalPages - 1, maxVisible);
    }
    if (page >= totalPages - 2) {
      start = Math.max(2, totalPages - maxVisible + 1);
      end = totalPages - 1;
    }
    if (start > 2) pages.push("...");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("...");
    pages.push(totalPages);
    return pages;
  })();

  return (
    <main className="shell">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-12 px-5 py-12 sm:px-8 lg:px-12">
        <header className="space-y-4">
          <span className="eyebrow">攻略百科索引</span>
          <h1 className="font-display text-5xl text-[--ink-strong] sm:text-6xl">
            全站攻略归档
          </h1>
          <p className="max-w-2xl text-lg text-[--ink-soft]">
            目前已累计收录 {total} 篇深度绅游解析。我们会保持每日更新，为您提供最精准的剧情分歧与全结局达成指南。
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {games.map((game, index) => (
            <GameCard key={game.slug} game={game} priority={index < 6} />
          ))}
        </div>

        {games.length === 0 && (
          <div className="rounded-[2.5rem] border border-white/10 bg-black/20 py-20 text-center">
            <p className="text-[--ink-soft]">暂无收录内容，请等待每日同步更新。</p>
          </div>
        )}

        {totalPages > 1 && (
          <nav className="flex flex-wrap items-center justify-center gap-2">
            {page > 1 && (
              <Link
                href={`/archive?page=${page - 1}`}
                className="rounded-full border border-white/12 px-5 py-2.5 text-sm tracking-[0.12em] text-white/75 transition hover:border-[--accent]/60 hover:text-[--ink-strong]"
              >
                ← 上一页
              </Link>
            )}
            {pageNumbers.map((p, i) =>
              p === "..." ? (
                <span
                  key={`ellipsis-${i}`}
                  className="px-2 text-sm text-white/40"
                >
                  ...
                </span>
              ) : (
                <Link
                  key={p}
                  href={`/archive?page=${p}`}
                  className={`rounded-full px-5 py-2.5 text-sm tracking-[0.12em] transition ${
                    p === page
                      ? "bg-[--accent] font-semibold text-black"
                      : "border border-white/12 text-white/75 hover:border-[--accent]/60 hover:text-[--ink-strong]"
                  }`}
                >
                  {p}
                </Link>
              )
            )}
            {page < totalPages && (
              <Link
                href={`/archive?page=${page + 1}`}
                className="rounded-full border border-white/12 px-5 py-2.5 text-sm tracking-[0.12em] text-white/75 transition hover:border-[--accent]/60 hover:text-[--ink-strong]"
              >
                下一页 →
              </Link>
            )}
          </nav>
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
