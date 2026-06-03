"use client";

import { useState } from "react";

export function EmergencyBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100]">
      <div className="border-b-2 border-black bg-white px-4 py-3 text-center shadow-lg sm:py-4">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-6">
          <p className="text-sm font-black tracking-wider text-black sm:text-base">
            🚨 官方防失联通知
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <a
              href="https://www.krzacg.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-black text-white shadow transition hover:bg-red-700 sm:text-base"
            >
              🌟 主站 krzacg.com
            </a>

            <a
              href="https://t.me/krzacgk"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white shadow transition hover:bg-blue-700 sm:text-base"
            >
              ✈️ TG 频道
            </a>
          </div>

          <button
            onClick={() => setDismissed(true)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-xl font-bold text-black/50 transition hover:bg-black/10 hover:text-black sm:right-4"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
