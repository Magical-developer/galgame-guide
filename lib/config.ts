// 部署平台会提供生产域名（VERCEL_PROJECT_PRODUCTION_URL）与本次部署域名（VERCEL_URL）。
// 没有显式配置时用它们兜底，避免构建产物里出现 http://localhost:3000 的 canonical / sitemap / robots。
const vercelHost =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? "";
const defaultSiteUrl = vercelHost ? `https://${vercelHost}` : "http://localhost:3000";

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const siteConfig = {
  name: "Galgame Guide",
  description:
    "Galgame Guide 是一个独立的视觉小说与 Galgame 作品索引，提供站内检索、标签筛选、作品概览和相似条目发现。",
  siteUrl: stripTrailingSlash(
    process.env.NEXT_PUBLIC_SITE_URL ?? defaultSiteUrl
  ),
  mainSiteUrl: stripTrailingSlash(
    process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.krzacg.com"
  ),
  // 主站已删除 /api/posts/hot-feed；公开契约暂无 posts 端点，过渡期用 latest。
  sourceApiUrl: stripTrailingSlash(
    process.env.CONTENT_SOURCE_API_URL ??
      "https://service.krzacg.com/api/posts/latest"
  ),
  cronSecret: process.env.CRON_SECRET ?? "",
};

export const absoluteUrl = (pathname: string) =>
  new URL(pathname, siteConfig.siteUrl).toString();

/**
 * Umami 自建统计（umami.krzacg.com）。
 *
 * 卫星站在 Umami 里是独立的 website，ID 和主站不同，两边数据不要混。
 * 只用来回答一个问题：作品页的主按钮到底有没有人点。
 */
export const analytics = {
  scriptSrc:
    process.env.NEXT_PUBLIC_UMAMI_SRC ?? "https://umami.krzacg.com/script.js",
  websiteId:
    process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID ??
    "e81c63f4-11b4-4e43-b1d6-781b96664946",
};

export const buildMainSiteFriendUrl = () => {
  const url = new URL(siteConfig.mainSiteUrl);
  url.searchParams.set("utm_source", "guide");
  url.searchParams.set("utm_medium", "referral");
  url.searchParams.set("utm_campaign", "friend_link");
  return url.toString();
};

/**
 * 作品页的主行动链接：直接落到主站对应的帖子详情，而不是首页。
 *
 * 2026-10-31 改：此前所有作品页的「查看资源」都指向主站首页，用户从
 * Bing 搜「某作品名」进来、点按钮又回到首页要重搜一遍，等于白走一趟。
 * sourceId 就是主站帖子的 _id，实测抽样 8/8 都能打开。
 */
export const buildMainSiteGameUrl = (sourceId: string) => {
  if (!sourceId) return buildMainSiteFriendUrl();
  const url = new URL(`/post/${encodeURIComponent(sourceId)}`, siteConfig.mainSiteUrl);
  url.searchParams.set("utm_source", "guide");
  url.searchParams.set("utm_medium", "referral");
  // 和页脚友链分开计，否则两类流量在统计里完全混在一起
  url.searchParams.set("utm_campaign", "game_deeplink");
  return url.toString();
};
