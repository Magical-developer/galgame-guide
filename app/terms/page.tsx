import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "服务条款 | 次元绅士指南",
  description: "了解使用次元绅士指南网站的服务条款与条件。请在使用本站前仔细阅读。",
};

export default function TermsPage() {
  return (
    <main className="shell">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-10 px-5 py-16 sm:px-8">
        <header className="space-y-4">
          <span className="eyebrow">法律条款</span>
          <h1 className="font-display text-5xl text-[--ink-strong]">服务条款</h1>
          <p className="text-sm text-white/50">最后更新日期：2026 年 6 月 1 日</p>
        </header>

        <section className="prose prose-invert space-y-8 text-[--ink-soft]">
          <p>
            欢迎使用次元绅士指南（以下简称"本站"）。访问和使用本网站，即表示您同意遵守以下服务条款。如果您不同意这些条款，请停止使用本站。
          </p>

          <h2 className="text-2xl font-bold text-[--ink-strong]">1. 服务说明</h2>
          <p>
            次元绅士指南是一个专注于视觉小说（Visual Novel）与 Galgame 攻略索引的内容平台。我们提供游戏剧情解析、角色路线指引、全 CG 收集条件说明及存档管理等技术性指南。
          </p>

          <h2 className="text-2xl font-bold text-[--ink-strong]">2. 使用限制</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>用户必须年满 18 周岁才能访问本站内容。</li>
            <li>禁止利用本站内容进行任何形式的非法活动。</li>
            <li>禁止对本站进行自动化抓取、爬虫攻击或 DDoS 攻击。</li>
            <li>禁止恶意篡改、复制或盗用本站原创内容。</li>
          </ul>

          <h2 className="text-2xl font-bold text-[--ink-strong]">3. 知识产权</h2>
          <p>
            本站所有原创攻略内容的版权归次元绅士指南所有。涉及的游戏作品、角色形象及相关素材的版权归其原始开发商或发行方所有。本站仅提供技术性指南，不存储或分发受版权保护的游戏本体。
          </p>

          <h2 className="text-2xl font-bold text-[--ink-strong]">4. 免责声明</h2>
          <p>
            本站内容仅供参考，不对因使用本站信息而导致的任何直接或间接损失承担责任。外部链接指向的内容由第三方平台控制，本站不对其真实性、合法性负责。
          </p>

          <h2 className="text-2xl font-bold text-[--ink-strong]">5. 第三方服务</h2>
          <p>
            本站可能包含来自第三方广告联盟的内容。这些第三方服务受其自身条款约束。我们建议选择信誉良好的广告合作伙伴，以保障用户体验。
          </p>

          <h2 className="text-2xl font-bold text-[--ink-strong]">6. 条款变更</h2>
          <p>
            我们保留随时修改本服务条款的权利。任何更改将在本页面发布后立即生效。继续使用本站即表示您接受修订后的条款。
          </p>

          <h2 className="text-2xl font-bold text-[--ink-strong]">7. 联系我们</h2>
          <p>
            如果您对本服务条款有任何疑问，请通过<a href="mailto:contact@galgame-guide.vercel.app" className="text-[--accent] hover:underline">contact@galgame-guide.vercel.app</a>联系我们。
          </p>
        </section>
      </div>
    </main>
  );
}
