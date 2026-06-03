"use client";

import { useState } from "react";

export function EmergencyBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100]">
      {/* 脉冲光效背景 */}
      <div className="absolute inset-0 animate-pulse bg-[--accent]/20" />

      <div className="relative border-b-2 border-[--accent] bg-gradient-to-r from-[--accent] via-[#ff6b35] to-[--accent] px-3 py-2.5 text-center text-black shadow-[0_4px_30px_rgba(252,177,93,0.5)] sm:py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 sm:gap-4">
          {/* 闪烁图标 */}
          <span className="inline-flex h-6 w-6 shrink-0 animate-bounce items-center justify-center rounded-full bg-black/20 text-sm sm:h-7 sm:w-7">
            🔔
          </span>

          <p className="text-xs font-bold leading-snug tracking-wide sm:text-sm sm:font-extrabold">
            <span className="hidden sm:inline">【防失联】</span>
            请立即收藏主站{" "}
            <a
              href="https://www.krzacg.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded bg-black px-1.5 py-0.5 text-[--accent] underline decoration-2 underline-offset-2 transition hover:bg-black/80 hover:text-white sm:px-2"
            >
              www.krzacg.com
            </a>
            {" "}· 关注 TG{" "}
            <a
              href="https://t.me/krzacgk"
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded bg-black px-1.5 py-0.5 text-[--accent] underline decoration-2 underline-offset-2 transition hover:bg-black/80 hover:text-white sm:px-2"
            >
              @krzacgk
            </a>
          </p>

          {/* 关闭按钮 */}
          <button
            onClick={() => setDismissed(true)}
            className="ml-1 shrink-0 rounded-full p-1 transition hover:bg-black/20"
            aria-label="关闭"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2L14 14M2 14L14 2" stroke="currentColor" strokeWidth="2.2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
