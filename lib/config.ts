const numberFromEnv = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const replaceTemplateToken = (
  template: string,
  token: string,
  value: string
) => template.replaceAll(`{${token}}`, encodeURIComponent(value));

export const siteConfig = {
  name: "KRZ Galgame 攻略索引库",
  headline: "提供最新 Galgame 攻略、全CG 存档及全结局路线指南。",
  description:
    "专业 Galgame 攻略平台，涵盖热门黄油全CG解锁、全结局路线、存档路径及汉化资源索引。为您提供详尽的剧情分歧点说明与关键选项指南，助力达成完美真结局。",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  mainSiteUrl: process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.krzacg.com",
  mainSiteGameUrlTemplate:
    process.env.MAIN_SITE_GAME_URL_TEMPLATE ?? "/?from=guide&slug={slug}",
  sourceApiUrl:
    process.env.CONTENT_SOURCE_API_URL ??
    "https://service.krzacg.com/api/posts/hot-feed",
  sourceAssetBaseUrl:
    process.env.CONTENT_SOURCE_ASSET_BASE_URL ?? "https://upload.krzacg.com",
  aiBaseUrl: process.env.AI_BASE_URL ?? "",
  aiApiKey: process.env.AI_API_KEY ?? "",
  aiModel: process.env.AI_MODEL ?? "",
  cronSecret: process.env.CRON_SECRET ?? "",
  syncPageSize: numberFromEnv(process.env.CONTENT_SYNC_PAGE_SIZE, 10),
  syncMaxPages: numberFromEnv(process.env.CONTENT_SYNC_MAX_PAGES, 3),
};

export const hasAiConfig = Boolean(
  siteConfig.aiBaseUrl && siteConfig.aiApiKey && siteConfig.aiModel
);

export const absoluteUrl = (pathname: string) =>
  new URL(pathname, siteConfig.siteUrl).toString();

export const buildMainSiteGameUrl = (game: {
  slug: string;
  sourceId: string;
  title: string;
}) => {
  const templated = replaceTemplateToken(
    replaceTemplateToken(
      replaceTemplateToken(
        siteConfig.mainSiteGameUrlTemplate,
        "slug",
        game.slug
      ),
      "sourceId",
      game.sourceId
    ),
    "title",
    game.title
  );

  return new URL(templated, siteConfig.mainSiteUrl).toString();
};
