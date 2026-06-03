"use client";

import { useState } from "react";

export function EmergencyBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="relative z-[100] border-b border-white/10 bg-[--accent] px-4 py-3 text-center">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-6">
        <p className="text-sm font-extrabold tracking-wide text-black">
          🚨 【官方防失联与防限速通知】
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://www.krzacg.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-sm font-bold text-[--accent] shadow-lg transition hover:bg-white hover:text-black"
          >
            🌟 krzacg.com 🌟
          </a>

          <a
            href="https://t.me/krzacgk"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#229ED9] px-3 py-1.5 text-sm font-bold text-white shadow-lg transition hover:bg-[#1a8bc2]"
          >
            ✈️ 点击加入 TG
          </a>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-black/60 transition hover:bg-black/10 hover:text-black"
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
