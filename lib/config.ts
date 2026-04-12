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
  name: "次元绅士指南 - 绅游推荐与 Galgame 全结局攻略索引",
  headline: "提供最全的绅游推荐、Galgame 全结局攻略及全CG 存档指南。",
  description:
    "次元绅士指南是专业的绅游推荐与 Galgame 攻略站。深耕视觉小说领域，为您提供详尽的绅士游戏剧情解析、全结局路线指南、回想场景解锁条件及存档路径说明。助您达成每一个真结局。",
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
