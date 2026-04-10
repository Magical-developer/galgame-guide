import Link from "next/link";

import type { GameRecord } from "@/lib/types/game";

export function RelatedGames({ games }: { games: GameRecord[] }) {
  if (games.length === 0) {
    return null;
  }

  return (
    <section className="space-y-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.22)] backdrop-blur sm:p-8">
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 rounded-full bg-[--accent]" />
        <h2 className="font-display text-2xl tracking-[0.08em] text-[--ink-strong]">
          类似游戏推荐
        </h2>
      </div>

      <div className="grid gap-4">
        {games.map((game) => (
          <Link
            key={game.slug}
            href={`/${game.slug}`}
            className="group rounded-[1.5rem] border border-white/8 bg-black/20 p-4 transition hover:border-[--accent]/50 hover:bg-black/35"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <h3 className="font-display text-lg text-[--ink-strong] group-hover:text-[--accent]">
                  {game.title}
                </h3>
                <p className="line-clamp-2 text-sm leading-7 text-[--ink-soft]">
                  {game.summary}
                </p>
              </div>
              <span className="text-xs uppercase tracking-[0.18em] text-white/45">
                查看
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
