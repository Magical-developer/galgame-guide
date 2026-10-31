import Link from "next/link";

import type { GameRecord } from "@/lib/types/game";

/**
 * 作品卡片（纯文字）。
 *
 * 2026-10-31：封面全部移除。上游封面是主站 CDN 上的成人向图片，
 * 挂在 Bing 索引页上会让整站被判为 NSFW，主站就是这么丢掉 Bing 收录的。
 * 卡片改为「标题 + 简介摘要 + 类型标签」，文字量反而比原来多。
 */
export function GameCard({ game }: { game: GameRecord }) {
  return (
    <Link
      href={`/${game.slug}`}
      className="group flex flex-col rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-[0_35px_80px_rgba(0,0,0,0.25)] transition duration-300 hover:-translate-y-1 hover:border-accent/60"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow">作品资料</span>
        <span className="text-[11px] uppercase tracking-[0.2em] text-white/40">
          {game.views.toLocaleString()} 热度
        </span>
      </div>

      <h2 className="mt-4 line-clamp-2 font-display text-xl leading-tight text-ink-strong group-hover:text-accent">
        {game.title}
      </h2>

      {game.summary ? (
        <p className="mt-3 line-clamp-3 text-sm leading-7 text-ink-soft">
          {game.summary}
        </p>
      ) : null}

      {game.tags.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-2 pt-5">
          {game.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 px-3 py-1 text-xs tracking-[0.12em] text-white/75"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
