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

export const buildMainSiteFriendUrl = () => {
  const url = new URL(siteConfig.mainSiteUrl);
  url.searchParams.set("utm_source", "guide");
  url.searchParams.set("utm_medium", "referral");
  url.searchParams.set("utm_campaign", "friend_link");
  return url.toString();
};
