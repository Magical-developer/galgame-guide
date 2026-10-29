import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "联系与免责声明 | Galgame Guide",
  description: "查看 Galgame Guide 的内容来源、信息边界、版权投诉与纠错渠道。",
};

export default function ContactPage() {
  return (
    <main className="shell">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-10 px-5 py-16 sm:px-8">
        <header className="space-y-4">
          <span className="eyebrow">法律合规</span>
          <h1 className="font-display text-5xl text-ink-strong">免责声明与联系方式</h1>
        </header>

        <section className="prose prose-invert space-y-8 text-ink-soft">
          <div className="space-y-4 rounded-3xl border border-white/10 bg-black/20 p-8">
            <h2 className="m-0 text-xl font-bold text-ink-strong">免责声明 (Disclaimer)</h2>
            <p className="m-0">
              1. <strong>内容性质</strong>：Galgame Guide（以下简称“本站”）提供作品发现与索引信息。未标记为“已核验”的条目不构成具体攻略或兼容性承诺。
            </p>
            <p className="m-0">
              2. <strong>资源链接</strong>：本站不直接存储、上传或提供任何受版权保护的游戏本体文件。页面中可能出现的外部链接（如网盘链接、下载链接）均为通过 API 或网络爬虫索引自互联网公开平台，链接内容不受本站控制。
            </p>
            <p className="m-0">
              3. <strong>版权归属</strong>：所有涉及的游戏作品版权均归其原始开发商或发行方所有。本站尊重并保护知识产权，若版权方认为本站索引的内容侵犯了其合法权益，请通过下方联系方式告知，我们将在核实后 24 小时内移除相关索引。
            </p>
            <p className="m-0">
              4. <strong>使用风险</strong>：用户访问外部链接或依据第三方信息采取操作时，应自行核对来源、版本与安全性。本站对第三方内容不作保证。
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-ink-strong">联系我们</h2>
            <p>如果您有任何建议、内容纠错或版权投诉，请通过以下方式与我们取得联系：</p>
            <ul className="list-disc space-y-2 pl-5">
              <li><strong>投诉/合作</strong>：<a href="mailto:dmca@krzacg.com" className="text-accent hover:underline">dmca@krzacg.com</a></li>
              <li><strong>内容反馈</strong>：请在邮件中附上条目 URL、需要纠正的字段与可核对来源。</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
