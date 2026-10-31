import { absoluteUrl, siteConfig } from "@/lib/config";
import type { GameRecord } from "@/lib/types/game";

const sharedKeywords = [
  "Galgame",
  "视觉小说",
  "Galgame 作品库",
  "视觉小说作品",
  "游戏类型",
  "游戏版本",
];

/**
 * `<title>` 的硬上限。Bing Webmaster 把「标题超过 70 字符」列为 High severity，
 * 2026-11-01 实测本站 3,876 个作品页里 1,192 个命中（Bing 后台报的是 1.3K）。
 */
const TITLE_MAX = 70;

const BRAND_SUFFIX = " | Galgame Guide";

const KANA = /[\u3040-\u309f\u30a0-\u30ff]/;
const HAN = /[\u4e00-\u9fff]/;
const LATIN = /[A-Za-z]/;

const charLength = (value: string) => [...value].length;

/**
 * 判断一个空格分隔的片段属于哪种文字。
 *
 * 顺序有讲究：假名优先。`淫紋憑きのマザー・アリシア` 里同时有汉字和假名，
 * 但它是日文原名而不是中文名，所以只要命中假名就判为 jp。
 */
const classifySegment = (segment: string): "jp" | "zh" | "en" | "other" => {
  if (KANA.test(segment)) return "jp";
  if (HAN.test(segment)) return "zh";
  if (LATIN.test(segment)) return "en";
  return "other";
};

const truncateTitle = (value: string, limit: number) => {
  const chars = [...value];
  if (chars.length <= limit) return value;

  let cut = chars.slice(0, limit - 1).join("");
  const lastSpace = cut.lastIndexOf(" ");
  // 只有空格够靠后时才按词边界切，否则会为了对齐单词丢掉大半个标题
  if (lastSpace > cut.length * 0.6) cut = cut.slice(0, lastSpace);
  return `${cut.replace(/[\s,、/／|｜~～・:：;；\-—]+$/u, "")}…`;
};

/**
 * 去掉标题里的日文原名段，保留中文和英文。
 *
 * 前提是**首段为中文**。上游标题的典型结构是「中文名 日文原名 English Name 标签…」，
 * 中文读者搜的是中文名，日文原名对收录没有增益，腾出来的位置留给英文名更值。
 *
 * 这个前提是踩过的坑：像 `アライバルキッス！… Arrival Kiss! … 官方中文版 SLG RPG 3D PC`
 * 这种首段是日文的标题，无脑去日文后只剩 `官方中文版` 一个标签词，比截断还糟。
 */
const dropJapaneseSegments = (title: string) => {
  const segments = title.split(/\s+/).filter(Boolean);
  if (segments.length < 2) return title;
  if (classifySegment(segments[0]) !== "zh") return title;

  const kept = segments.filter((segment) => classifySegment(segment) !== "jp");
  const result = kept.join(" ").trim();
  return result || title;
};

/**
 * 作品页 `<title>`。
 *
 * 2026-11-01 改：此前是 `${title}｜作品档案与标签 | Galgame Guide`，24 个字符的固定
 * 后缀压在所有页面上，加上上游标题本身就长，三分之一的页面超过 70 字符被 Bing 判问题。
 * 现在按「能放下就带品牌，放不下就只留作品名」处理，并去掉「作品档案与标签」这个
 * 没人会搜的填充后缀——它只是在挤占作品名的位置。
 */
export const buildGameTitle = (game: GameRecord) => {
  const raw = game.title;
  const brandLength = charLength(BRAND_SUFFIX);

  if (charLength(raw) + brandLength <= TITLE_MAX) return `${raw}${BRAND_SUFFIX}`;
  if (charLength(raw) <= TITLE_MAX) return raw;

  const compressed = dropJapaneseSegments(raw);
  if (charLength(compressed) + brandLength <= TITLE_MAX) {
    return `${compressed}${BRAND_SUFFIX}`;
  }
  if (charLength(compressed) <= TITLE_MAX) return compressed;
  return truncateTitle(compressed, TITLE_MAX);
};

/** 不带品牌后缀的标题，结构化数据的 `WebPage.name` 用它。 */
export const buildGameHeadline = (game: GameRecord) => {
  const title = buildGameTitle(game);
  return title.endsWith(BRAND_SUFFIX)
    ? title.slice(0, title.length - BRAND_SUFFIX.length)
    : title;
};

export const buildGameDescription = (game: GameRecord) => {
  const tags = game.tags.slice(0, 4).join("、") || "视觉小说";
  let unique: string;
  if (game.summary && game.summary.length >= 80) {
    unique = game.summary.length > 100 ? game.summary.slice(0, 100) + "..." : game.summary;
  } else {
    unique = `${game.title} 是一款融合 ${tags} 元素的视觉小说作品。${game.summary || ""}`.trim();
    if (unique.length > 100) {
      unique = unique.slice(0, 100) + "...";
    }
  }

  return `${unique} — 在 Galgame Guide 查看简介、类型标签和下载入口。`;
};

export const buildGameKeywords = (game: GameRecord) => [
  game.title,
  `${game.title}作品信息`,
  `${game.title}标签`,
  ...game.tags,
  ...sharedKeywords,
];

export const buildCanonicalPath = (slug: string) => `/${slug}`;

/**
 * 上游 `updated_at` 存的是 `2026-07-28 20:11:38`，带空格、不带时区，不是合法
 * ISO 8601。原样塞进 JSON-LD 会被结构化数据校验判成无效日期。
 *
 * 只把空格换成 `T`，**不**用 `toISOString()` 换算：我们并不知道上游存的是 UTC
 * 还是北京时间，硬转会把这个时刻平移到错误的时间点。宁可少一个时区，也不要写错。
 */
const toIsoDateTime = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const iso = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  return Number.isNaN(new Date(iso).getTime()) ? null : iso;
};

export const buildHomeTitle = () =>
  "Galgame Guide｜Galgame 与视觉小说作品库";

export const buildHomeDescription = () =>
  "收录 3800 多部 Galgame 与视觉小说，可按作品名、类型、平台和语言查找。每部都有简介、类型标签、版本和更新时间，找到想玩的直接跳下载页。";

export const buildHomeKeywords = () => [
  ...sharedKeywords,
  "Galgame 大全",
  "视觉小说推荐",
  "Galgame 下载",
  "汉化游戏",
];

/**
 * 作品页的结构化数据。此前全页只有一个 `CreativeWork`。
 *
 * 为什么改成现在这样：
 * - `CreativeWork` 太泛，等于只说了「这是个作品」。`VideoGame` 能让搜索引擎把页面
 *   识别成「某个游戏作品的档案」，和站点定位对得上。
 * - `BreadcrumbList` 是这套标记里唯一 Google 明确支持出富摘要的类型：命中后 SERP 用
 *   「首页 › 作品索引 › 作品名」替换裸 URL，点击率直接受益。其余类型只是帮助理解。
 * - **不给 `VideoGame` 写 `datePublished` / `dateModified`**。库里的 `created_at` 是
 *   「我们首次收录这条记录」的时间，不是作品发行时间；写成 `datePublished` 等于对外
 *   声称该游戏在那天发行，是编造事实。页面自己的更新时间挂 `WebPage.dateModified`，
 *   那个是真的。
 */
export const buildGameStructuredData = (game: GameRecord) => {
  const pageUrl = absoluteUrl(buildCanonicalPath(game.slug));
  const homeUrl = absoluteUrl("/");
  const websiteId = `${homeUrl}#website`;
  const webpageId = `${pageUrl}#webpage`;
  const gameId = `${pageUrl}#game`;
  const breadcrumbId = `${pageUrl}#breadcrumb`;
  const description = game.aiIntro ?? game.summary;
  const dateModified = toIsoDateTime(game.updatedAt);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "VideoGame",
        "@id": gameId,
        name: game.title,
        description,
        url: pageUrl,
        inLanguage: "zh-CN",
        ...(game.tags.length > 0 ? { genre: game.tags } : {}),
        isPartOf: { "@id": websiteId },
        mainEntityOfPage: { "@id": webpageId },
      },
      {
        "@type": "WebPage",
        "@id": webpageId,
        url: pageUrl,
        name: buildGameHeadline(game),
        description,
        inLanguage: "zh-CN",
        isPartOf: { "@id": websiteId },
        mainEntity: { "@id": gameId },
        breadcrumb: { "@id": breadcrumbId },
        ...(dateModified ? { dateModified } : {}),
      },
      {
        "@type": "BreadcrumbList",
        "@id": breadcrumbId,
        // 最后一级不带 item：Google 的面包屑示例里当前页就是不给链接。
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "首页", item: homeUrl },
          {
            "@type": "ListItem",
            position: 2,
            name: "全部作品",
            item: absoluteUrl("/archive"),
          },
          { "@type": "ListItem", position: 3, name: game.title },
        ],
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: homeUrl,
        name: siteConfig.name,
        description: siteConfig.description,
        inLanguage: "zh-CN",
      },
    ],
  };
};
