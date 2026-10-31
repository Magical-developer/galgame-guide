import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "免责声明",
  description: "Galgame Guide 的免责声明与内容使用说明。",
};

export default function ContactPage() {
  return (
    <main className="shell">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-10 px-5 py-16 sm:px-8">
        <header className="space-y-4">
          <span className="eyebrow">法律合规</span>
          <h1 className="font-display text-5xl text-ink-strong">免责声明</h1>
        </header>

        <section className="prose prose-invert space-y-8 text-ink-soft">
          <div className="space-y-4 rounded-3xl border border-white/10 bg-black/20 p-8">
            <h2 className="m-0 text-xl font-bold text-ink-strong">免责声明 (Disclaimer)</h2>
            <p className="m-0">
              1. <strong>内容性质</strong>：Galgame Guide（以下简称“本站”）提供游戏作品的资料与索引，不对具体版本、兼容性或可玩性作出承诺。
            </p>
            <p className="m-0">
              2. <strong>资源链接</strong>：本站不存储、不上传任何游戏文件。页面上的外部链接（网盘、下载页等）指向互联网公开内容，其内容与可用性不受本站控制。
            </p>
            <p className="m-0">
              3. <strong>版权归属</strong>：所有游戏作品的版权归原始开发商或发行方所有。若权利方认为本站收录的内容侵犯了其权益，请通过下方邮箱告知，核实后 24 小时内移除。
            </p>
            <p className="m-0">
              4. <strong>使用风险</strong>：访问外部链接时，请自行核对来源、版本与安全性。本站对第三方内容不作保证。
            </p>
          </div>

        </section>
      </div>
    </main>
  );
}
