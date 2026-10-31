"use client";

import { useState } from "react";

/**
 * 「收藏本站」提示。
 *
 * 为什么要有它：这个站的流量几乎全部来自 Bing 搜索结果，域名是
 * galgame-guide.vercel.app —— 搜索引擎一调算法、平台一找麻烦，站点就没了，
 * 用户下次再搜也搜不到。所以得趁用户还在页面上的时候把地址塞给他。
 *
 * 浏览器不允许网页直接加书签，能做的只有三件事：把域名写清楚、给出收藏
 * 快捷键、一键复制地址。这三件都做了，剩下的交给用户。
 */
const SITE_HOST = "galgame-guide.vercel.app";
const SITE_URL = `https://${SITE_HOST}`;

export function BookmarkHint({ variant = "inline" }: { variant?: "inline" | "footer" }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SITE_URL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // 剪贴板不可用（非 https 或用户拒绝）时不报错：域名本来就印在页面上
    }
  };

  const address = (
    <button
      type="button"
      onClick={copy}
      className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-4 py-2 font-mono text-xs text-ink-strong transition hover:border-accent/60 hover:text-accent sm:text-sm"
    >
      {SITE_HOST}
      <span className="text-[11px] tracking-[0.1em] text-white/40 group-hover:text-accent/80">
        {copied ? "已复制" : "复制"}
      </span>
    </button>
  );

  if (variant === "footer") {
    return (
      <div className="space-y-3">
        <h4 className="text-xs font-bold tracking-widest text-white/40 uppercase">
          收藏本站
        </h4>
        <p className="text-sm leading-6 text-ink-soft">
          本站的流量全靠搜索结果，哪天搜不到了就是真的没了。
        </p>
        {address}
      </div>
    );
  }

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="font-display text-xl text-ink-strong">怕下次找不到？</h2>
          <p className="text-sm leading-7 text-ink-soft">
            本站的内容全靠搜索结果显示，哪天搜不到了就是真的没了。花两秒存下来：
            按{" "}
            <kbd className="rounded border border-white/20 bg-black/40 px-1.5 py-0.5 font-mono text-xs">
              Ctrl + D
            </kbd>{" "}
            收藏（Mac 用{" "}
            <kbd className="rounded border border-white/20 bg-black/40 px-1.5 py-0.5 font-mono text-xs">
              ⌘ + D
            </kbd>
            ），或者点右边复制地址。
          </p>
        </div>
        {address}
      </div>
    </section>
  );
}
