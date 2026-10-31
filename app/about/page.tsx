import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "关于我们",
  description: "Galgame Guide 收录什么、怎么用，以及本站不提供什么。",
};

export default function AboutPage() {
  return (
    <main className="shell">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-10 px-5 py-16 sm:px-8">
        <header className="space-y-4">
          <span className="eyebrow">关于</span>
          <h1 className="font-display text-5xl text-ink-strong">关于 Galgame Guide</h1>
        </header>

        <section className="prose prose-invert space-y-6 text-ink-soft">
          <p>
            Galgame Guide 是一个 Galgame 与视觉小说作品库。想找哪部游戏，先在这儿看清楚
            它是什么、什么类型、什么版本，再去下载。
          </p>

          <h2 className="text-2xl font-bold text-ink-strong">这里有什么</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>作品资料</strong>：简介、类型标签、平台、语言、版本和更新时间。</li>
            <li><strong>查找</strong>：按作品名、题材或平台搜，也能按热度或更新时间排序。</li>
            <li><strong>下载入口</strong>：每部作品页都有「查看该作品资源」，点进去就是下载页面。</li>
          </ul>

          <h2 className="text-2xl font-bold text-ink-strong">这里没有什么</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>不存游戏文件</strong>：本站不托管、不上传、不提供任何游戏本体。</li>
            <li><strong>不编攻略</strong>：没有可靠来源的路线、存档、兼容信息，我们不写。</li>
          </ul>

          <h2 className="text-2xl font-bold text-ink-strong">内容声明</h2>
          <p>
            作品名称、简介等资料来自公开数据源，版权归原始开发商或发行方所有。
            本站不存储、不分发任何游戏文件，页面上的外部链接指向第三方站点。
          </p>
        </section>
      </div>
    </main>
  );
}
