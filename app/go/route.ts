import { NextResponse } from "next/server";

import { buildMainSiteFriendUrl, buildMainSiteGameUrl } from "@/lib/config";

/**
 * 出站跳转。主站域名不进 HTML。
 *
 * 这个卫星站存在的意义就是「干净」：搜索引擎看到的必须是 galgame 资料，
 * 而不是它和成人主站之间的链接关系。原来每个页面的 HTML 里都直接写着
 * `https://www.krzacg.com/post/xxx`，等于在 3,138 个页面上反复声明
 * 「我和那个成人站是一伙的」—— 这正是要被连坐的地方。
 *
 * 现在 HTML 里只有同源的 `/go?to=xxx`。robots.txt 把 /go 设为 disallow，
 * 爬虫不会来请求，也就永远看不到 302 的目标；就算跟过来了，响应头也带
 * X-Robots-Tag: noindex, nofollow。
 *
 * 这不是对用户隐藏：按钮上写的就是「去下载页」，点了就跳，人和爬虫看到的
 * 跳转目标完全一致 —— 只是 URL 没有印在 HTML 里。
 */
export const dynamic = "force-dynamic";

/** 主站帖子 _id 是 Mongo ObjectId，别的一律不认，避免这个端点变成开放跳转。 */
const OBJECT_ID = /^[a-f0-9]{24}$/i;

export function GET(request: Request) {
  const to = new URL(request.url).searchParams.get("to") ?? "";

  let target: string | null = null;
  if (to === "site") target = buildMainSiteFriendUrl();
  else if (OBJECT_ID.test(to)) target = buildMainSiteGameUrl(to);

  if (!target) {
    return NextResponse.json({ error: "invalid target" }, { status: 400 });
  }

  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: target,
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store, max-age=0",
      // 别把卫星站地址当 Referer 带给对方站点
      "Referrer-Policy": "no-referrer",
    },
  });
}
