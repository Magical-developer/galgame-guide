import Link from "next/link";

import { CoverImage } from "@/components/cover-image";
import type { GameRecord } from "@/lib/types/game";

export function GameCard({ game, priority = false }: { game: GameRecord; priority?: boolean }) {
  return (
    <Link
      href={`/${game.slug}`}
      className="group overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] shadow-[0_35px_80px_rgba(0,0,0,0.25)] transition duration-300 hover:-translate-y-1 hover:border-[--accent]/60"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <CoverImage
          src={game.cover}
          alt={`${game.title} 封面`}
          priority={priority}
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(8,10,14,0.9))]" />
        <div className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/45 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/80">
          {game.views.toLocaleString()} views
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="space-y-2">
          <h2 className="line-clamp-2 font-display text-xl leading-tight text-[--ink-strong]">
            {game.title}
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {game.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 px-3 py-1 text-xs tracking-[0.12em] text-white/75"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
