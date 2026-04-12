import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "关于我们 | 次元绅士指南",
  description: "了解次元绅士指南的宗旨。我们致力于为视觉小说爱好者提供高质量的绅游推荐、全结局攻略及游戏系统解析。",
};

export default function AboutPage() {
  return (
    <main className="shell">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-10 px-5 py-16 sm:px-8">
        <header className="space-y-4">
          <span className="eyebrow">了解我们</span>
          <h1 className="font-display text-5xl text-[--ink-strong]">关于次元绅士指南</h1>
        </header>

        <section className="prose prose-invert space-y-6 text-[--ink-soft]">
          <p>
            <strong>次元绅士指南</strong> 是一个由资深视觉小说（Visual Novel）爱好者共同维护的专业攻略索引平台。
            在美少女游戏与绅士向作品的世界里，错综复杂的分歧选项和关键的存档节点往往决定了玩家能否获得完整的剧情体验。
          </p>

          <h2 className="text-2xl font-bold text-[--ink-strong]">我们的初衷</h2>
          <p>
            我们发现，许多玩家在游玩过程中常因为错过一个细微的选项而不得不反复重打。
            因此，我们建立了这个“绅游指南”门户，通过 AI 辅助创作与人工逻辑梳理，将原本散落在各处的攻略信息进行结构化重组。
          </p>

          <h2 className="text-2xl font-bold text-[--ink-strong]">我们提供什么</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>深度解析</strong>：每一篇攻略都包含核心剧情简介和多维度的推荐理由。</li>
            <li><strong>路线指引</strong>：清晰标注关键分歧点，助您快速解锁全结局。</li>
            <li><strong>技术支持</strong>：整理不同版本的存档路径，解决汉化版常见的兼容性问题。</li>
            <li><strong>全CG回收</strong>：提供详细的回想场景触发条件汇总。</li>
          </ul>

          <h2 className="text-2xl font-bold text-[--ink-strong]">内容声明</h2>
          <p>
            本站仅提供游戏系统、剧情逻辑和存档管理的【技术性指南】。本站自身不存储、不分发任何受版权保护的游戏本体文件。
            所有资源链接均索引自外部合法平台，旨在方便玩家进行正版验证与攻略对照。
          </p>
        </section>
      </div>
    </main>
  );
}
