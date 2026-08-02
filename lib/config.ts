const numberFromEnv = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const siteConfig = {
  name: "Galgame Guide",
  headline: "用作品、标签和更新时间建立一份可检索的 Galgame 发现指南。",
  description:
    "Galgame Guide 是一个独立的视觉小说与 Galgame 作品索引，提供站内检索、标签筛选、作品概览和相似条目发现。",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  mainSiteUrl: process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "http://localhost:3000",
  sourceApiUrl: process.env.CONTENT_SOURCE_API_URL ?? "http://localhost:3000",
  sourceAssetBaseUrl:
    process.env.CONTENT_SOURCE_ASSET_BASE_URL ?? "http://localhost:3000",
  cronSecret: process.env.CRON_SECRET ?? "",
  syncPageSize: numberFromEnv(process.env.CONTENT_SYNC_PAGE_SIZE, 10),
  syncMaxPages: numberFromEnv(process.env.CONTENT_SYNC_MAX_PAGES, 3),
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
