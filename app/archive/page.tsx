import type { Metadata } from "next";
import Link from "next/link";
import { GameCard } from "@/components/game-card";
import { findGames, getTopTags, type CatalogSort } from "@/lib/games";
import { buildCanonicalPath } from "@/lib/seo";

export const revalidate = 3600;

type ArchiveSearchParams = {
  page?: string;
  q?: string;
  tag?: string;
  sort?: string;
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<ArchiveSearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const isFiltered = Boolean(params.q || params.tag || params.sort || Number(params.page) > 1);
  return {
    title: "作品索引 | Galgame Guide",
    description:
      "按关键词、标签、热度与更新时间浏览 Galgame Guide 收录的视觉小说和 Galgame 作品档案。",
    alternates: {
      canonical: buildCanonicalPath("archive"),
    },
    robots: isFiltered ? { index: false, follow: true } : undefined,
  };
}

function buildArchiveHref(
  current: { q: string; tag: string; sort: CatalogSort },
  overrides: Partial<{ q: string; tag: string; sort: CatalogSort; page: number }>,
) {
  const params = new URLSearchParams();
  const next = { ...current, ...overrides };
  if (next.q) params.set("q", next.q);
  if (next.tag) params.set("tag", next.tag);
  if (next.sort !== "latest") params.set("sort", next.sort);
  if (overrides.page && overrides.page > 1) params.set("page", String(overrides.page));
  const query = params.toString();
  return query ? `/archive?${query}` : "/archive";
}

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<ArchiveSearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const q = params.q?.trim() ?? "";
  const tag = params.tag?.trim() ?? "";
  const sort: CatalogSort = ["latest", "popular", "title"].includes(params.sort ?? "")
    ? (params.sort as CatalogSort)
    : "latest";
  const pageSize = 48;

  const [{ games, total }, topTags] = await Promise.all([
    findGames({ query: q, tag, sort, page, pageSize }),
    getTopTags(14),
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
          <span className="eyebrow">Catalog / Index view</span>
          <h1 className="font-display text-5xl text-[--ink-strong] sm:text-6xl">
            作品索引
          </h1>
          <p className="max-w-2xl text-lg text-[--ink-soft]">
            用作品名、标签、热度和更新时间缩小范围。当前条件下找到 {total} 个条目。
          </p>
        </header>

        <section className="space-y-5 rounded-[2rem] border border-white/10 bg-black/20 p-5 sm:p-7">
          <form method="get" action="/archive" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_12rem_auto]">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.18em] text-white/45">作品或标签</span>
              <input
                name="q"
                defaultValue={q}
                placeholder="输入作品名、平台、语言或题材"
                className="w-full rounded-2xl border border-white/12 bg-black/30 px-4 py-3 text-sm text-[--ink-strong] outline-none placeholder:text-white/35 focus:border-[--accent]/70"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.18em] text-white/45">排序</span>
              <select
                name="sort"
                defaultValue={sort}
                className="w-full rounded-2xl border border-white/12 bg-[#101318] px-4 py-3 text-sm text-[--ink-strong] outline-none focus:border-[--accent]/70"
              >
                <option value="latest">最近更新</option>
                <option value="popular">热度优先</option>
                <option value="title">标题顺序</option>
              </select>
            </label>
            {tag ? <input type="hidden" name="tag" value={tag} /> : null}
            <button className="self-end rounded-2xl bg-[--accent] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[--accent-strong]">
              筛选索引
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            <Link
              href={buildArchiveHref({ q, tag, sort }, { tag: "", page: 1 })}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                !tag
                  ? "border-[--accent]/60 bg-[--accent]/10 text-[--accent]"
                  : "border-white/10 text-white/60 hover:border-white/25"
              }`}
            >
              全部标签
            </Link>
            {topTags.map((item) => (
              <Link
                key={item.name}
                href={buildArchiveHref({ q, tag, sort }, { tag: item.name, page: 1 })}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  tag === item.name
                    ? "border-[--accent]/60 bg-[--accent]/10 text-[--accent]"
                    : "border-white/10 text-white/60 hover:border-white/25"
                }`}
              >
                {item.name} · {item.count}
              </Link>
            ))}
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {games.map((game, index) => (
            <GameCard key={game.slug} game={game} priority={index < 6} />
          ))}
        </div>

        {games.length === 0 && (
          <div className="rounded-[2.5rem] border border-white/10 bg-black/20 py-20 text-center">
            <p className="text-[--ink-soft]">没有匹配条目。请减少关键词，或清除标签后重试。</p>
            <Link href="/archive" className="mt-4 inline-flex text-sm text-[--accent] hover:underline">
              清除筛选
            </Link>
          </div>
        )}

        {totalPages > 1 && (
          <nav className="flex flex-wrap items-center justify-center gap-2">
            {page > 1 && (
              <Link
                href={buildArchiveHref({ q, tag, sort }, { page: page - 1 })}
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
                  href={buildArchiveHref({ q, tag, sort }, { page: Number(p) })}
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
                href={buildArchiveHref({ q, tag, sort }, { page: page + 1 })}
                className="rounded-full border border-white/12 px-5 py-2.5 text-sm tracking-[0.12em] text-white/75 transition hover:border-[--accent]/60 hover:text-[--ink-strong]"
              >
                下一页 →
              </Link>
            )}
          </nav>
        )}

        <footer className="mt-12 flex justify-center border-t border-white/10 pt-12">
          <Link
            href="/"
            className="rounded-full border border-white/12 px-8 py-4 text-sm font-semibold tracking-[0.16em] text-white/75 transition hover:border-[--accent]/60 hover:text-[--ink-strong]"
          >
            返回首页
          </Link>
        </footer>
      </div>
    </main>
  );
}
