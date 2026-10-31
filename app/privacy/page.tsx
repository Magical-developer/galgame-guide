import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "隐私政策",
  description: "Galgame Guide 会收集哪些数据、怎么用、怎么关。",
};

export default function PrivacyPage() {
  return (
    <main className="shell">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-10 px-5 py-16 sm:px-8">
        <header className="space-y-4">
          <span className="eyebrow">用户保护</span>
          <h1 className="font-display text-5xl text-ink-strong">隐私政策</h1>
        </header>

        <section className="prose prose-invert space-y-6 text-ink-soft">
          <p>Galgame Guide 尊重并致力于保护您的个人隐私。本协议旨在说明我们如何收集、使用及保护您的数据。</p>

          <h2 className="text-2xl font-bold text-ink-strong">1. 信息收集</h2>
          <p>
            本站不需要注册。我们只通过服务器日志和自建的 Umami 统计了解访问量，记录的是访问了哪些页面、用什么设备，不收集姓名、邮箱等能识别到个人的信息。
          </p>

          <h2 className="text-2xl font-bold text-ink-strong">2. Cookie 的使用</h2>
          <p>
            本站不使用广告 Cookie，也不做跨站追踪。您可以在浏览器里随时禁用 Cookie，不影响正常浏览。
          </p>

          <h2 className="text-2xl font-bold text-ink-strong">3. 第三方内容</h2>
          <p>
            本站包含指向外部资源的链接。这些第三方平台拥有独立的隐私政策，本站对这些平台的内容和活动不承担任何责任。
          </p>

          <h2 className="text-2xl font-bold text-ink-strong">4. 分析与广告</h2>
          <p>
            本站不加载弹窗广告、Popunder 或广告联盟脚本。若未来引入，会在此处说明数据用途和关闭方式。
          </p>

          <h2 className="text-2xl font-bold text-ink-strong">5. 政策更新</h2>
          <p>本站保留随时修改本隐私政策的权利，任何更改都将发布在此页面上。</p>
        </section>
      </div>
    </main>
  );
}
