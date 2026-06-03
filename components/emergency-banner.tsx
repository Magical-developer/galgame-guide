"use client";

import { useState } from "react";

export function EmergencyBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="relative z-[60] bg-[--accent] px-4 py-2 text-center text-xs font-semibold tracking-wide text-black sm:text-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 sm:gap-6">
        <span className="hidden sm:inline">🔥</span>
        <span>
          为防止失联，请收藏主站{" "}
          <a
            href="https://www.krzacg.com/"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 transition hover:text-white"
          >
            krzacg.com
          </a>
          ，关注 TG 频道{" "}
          <a
            href="https://t.me/krzacgk"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 transition hover:text-white"
          >
            @krzacgk
          </a>
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="ml-2 shrink-0 rounded-full p-1 transition hover:bg-black/10"
          aria-label="关闭"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
