import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "关于我们 | Galgame Guide",
  description: "了解 Galgame Guide 的作品索引、信息边界、人工核验原则与合作数据说明。",
};

export default function AboutPage() {
  return (
    <main className="shell">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-10 px-5 py-16 sm:px-8">
        <header className="space-y-4">
          <span className="eyebrow">了解我们</span>
          <h1 className="font-display text-5xl text-[--ink-strong]">关于 Galgame Guide</h1>
        </header>

        <section className="prose prose-invert space-y-6 text-[--ink-soft]">
          <p>
            <strong>Galgame Guide</strong> 是一个视觉小说与 Galgame 作品发现索引。
            它的任务是帮助用户按标题、标签、热度和更新时间浏览条目，而不是自动生成看似完整的游戏攻略。
          </p>

          <h2 className="text-2xl font-bold text-[--ink-strong]">我们的初衷</h2>
          <p>
            大规模索引最容易犯的错误，是把标签和通用经验写成某一部作品的具体事实。
            因此本站把“作品发现”和“编辑结论”分开：来源已有字段可以进入索引，路线、版本、兼容与存档信息只有在能够追溯和复核时才会发布。
          </p>

          <h2 className="text-2xl font-bold text-[--ink-strong]">我们提供什么</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>作品检索</strong>：按作品名、题材、平台或语言标签查找条目。</li>
            <li><strong>标签筛选</strong>：在同一索引内按热度、更新时间和标签缩小范围。</li>
            <li><strong>相似发现</strong>：根据条目已有标签推荐可继续浏览的作品。</li>
            <li><strong>信息边界</strong>：未知内容保持未知，不用自动模板制造确定感。</li>
          </ul>

          <h2 className="text-2xl font-bold text-[--ink-strong]">内容声明</h2>
          <p>
            本站不存储、不分发游戏本体文件。作品名称、封面和介绍等资料可能来自合作数据源，相关版权归原始权利人所有。
            合作关系不会改变本站的索引职责，外部站点仅在友链区域列出。
          </p>
        </section>
      </div>
    </main>
  );
}
