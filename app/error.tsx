"use client";

import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="shell">
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center gap-6 px-5 py-16 text-center">
        <span className="eyebrow">出错了</span>
        <h1 className="font-display text-4xl text-ink-strong sm:text-5xl">
          这一页没打开
        </h1>
        <p className="max-w-xl text-base leading-8 text-ink-soft">
          可能是网络抖了一下。点下面重试，或者回首页重新搜一次。
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold tracking-[0.12em] text-black transition hover:bg-accent-strong"
          >
            重试一次
          </button>
          <Link
            href="/"
            className="rounded-full border border-white/15 px-6 py-3 text-sm text-ink-strong transition hover:border-accent/60 hover:text-accent"
          >
            回到首页
          </Link>
        </div>
        {error.digest ? (
          <p className="text-xs text-white/35">错误编号：{error.digest}</p>
        ) : null}
      </div>
    </main>
  );
}
