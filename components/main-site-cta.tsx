import { buildGoPath } from "@/lib/config";

/**
 * 作品页的主行动按钮 —— 整站唯一真正要用户点的东西。
 *
 * 两件事必须同时成立：
 *   1. 用户一眼看到、知道点了会发生什么；
 *   2. HTML 里不出现主站域名。
 * 第 2 点靠 `/go?to=<id>` 这个同源跳转实现，理由见 app/go/route.ts。
 *
 * 位置从「收录信息之后」提到了「作品简介之后」：从搜索结果落地的人，
 * 十有八九只看到标题和前两段就走了，按钮原来在页面最底部，等于没放。
 */

const LINK_CLASS =
  "flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 text-center font-semibold text-black transition hover:bg-accent-strong";

export function MainSiteCta({ sourceId, title }: { sourceId: string; title: string }) {
  return (
    <section className="mt-8 rounded-[1.75rem] border border-accent/35 bg-accent/[0.07] p-5 sm:p-6">
      <p className="text-xs font-semibold tracking-[0.2em] text-accent/85">
        资源下载
      </p>

      <a
        href={buildGoPath(sourceId)}
        target="_blank"
        rel="nofollow noopener noreferrer"
        referrerPolicy="no-referrer"
        // 全站唯一要回答的问题：这个按钮到底有没有人点。
        data-umami-event="guide-deeplink"
        data-umami-event-post-id={sourceId}
        className={`${LINK_CLASS} mt-3 py-4 text-base sm:text-lg`}
      >
        去下载页
        <span aria-hidden="true">→</span>
      </a>

      <p className="mt-3 text-center text-xs leading-6 text-white/45">
        跳到《{title}》的资源页面 · 本站不存游戏文件
      </p>
    </section>
  );
}

/** 手机端的常驻底栏。手机上按钮很容易被划出屏幕，钉在底部是唯一稳的做法。 */
export function MobileStickyCta({ sourceId }: { sourceId: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/85 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
      <a
        href={buildGoPath(sourceId)}
        target="_blank"
        rel="nofollow noopener noreferrer"
        referrerPolicy="no-referrer"
        data-umami-event="guide-deeplink-sticky"
        data-umami-event-post-id={sourceId}
        className={`${LINK_CLASS} py-3.5 text-sm`}
      >
        去下载页
        <span aria-hidden="true">→</span>
      </a>
    </div>
  );
}
