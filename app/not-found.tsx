import Link from "next/link";

export const metadata = {
  title: "页面未找到 | Galgame Guide",
};

export default function NotFound() {
  return (
    <main className="shell flex min-h-screen items-center justify-center px-5">
      <div className="flex flex-col items-center gap-8 text-center">
        <div className="font-display text-8xl text-accent">404</div>
        <h1 className="font-display text-3xl text-ink-strong">
          页面走丢了
        </h1>
        <p className="max-w-md text-ink-soft">
          你访问的作品条目暂时无法找到。可能是链接已更新，或者该记录已经移出索引。
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold tracking-[0.16em] text-black transition hover:bg-accent-strong"
          >
            返回首页
          </Link>
          <Link
            href="/archive"
            className="rounded-full border border-white/12 px-6 py-3 text-sm tracking-[0.16em] text-white/75 transition hover:border-accent/60 hover:text-ink-strong"
          >
            浏览作品索引
          </Link>
        </div>
      </div>
    </main>
  );
}
