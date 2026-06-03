"use client";

import { useState } from "react";

export function EmergencyBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] border-b-2 border-[--accent] bg-black px-3 py-2.5 text-center shadow-[0_4px_30px_rgba(252,177,93,0.35)] sm:py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 sm:gap-4">
        <span className="hidden text-lg sm:inline">🔔</span>

        <p className="text-xs font-bold leading-snug tracking-wide text-white sm:text-sm sm:font-extrabold">
          【防失联】请立即收藏主站{" "}
          <a
            href="https://www.krzacg.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-block rounded bg-[--accent] px-2 py-0.5 text-black transition hover:bg-[--accent-strong]"
          >
            www.krzacg.com
          </a>
          {" "}· 关注 TG{" "}
          <a
            href="https://t.me/krzacgk"
            target="_blank"
            rel="noreferrer"
            className="inline-block rounded bg-[#229ED9] px-2 py-0.5 text-white transition hover:bg-[#1a8bc2]"
          >
            @krzacgk
          </a>
        </p>

        <button
          onClick={() => setDismissed(true)}
          className="ml-1 shrink-0 rounded-full p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="关闭"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 2L14 14M2 14L14 2" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
