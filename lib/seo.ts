import type { GameRecord } from "@/lib/types/game";

const sharedKeywords = [
  "Galgame Guide",
  "Galgame 索引",
  "视觉小说目录",
  "作品标签",
  "游戏版本情报",
  "视觉小说推荐",
];

export const buildGameTitle = (game: GameRecord) =>
  `${game.title}｜作品档案与标签`;

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

  return `${unique} — 在 Galgame Guide 查看作品标签、更新时间、热度与相似条目。`;
};

export const buildGameKeywords = (game: GameRecord) => [
  game.title,
  `${game.title}作品信息`,
  `${game.title}标签`,
  ...game.tags,
  ...sharedKeywords,
];

export const buildCanonicalPath = (slug: string) => `/${slug}`;

export const buildHomeTitle = () =>
  "Galgame Guide｜视觉小说作品发现与标签索引";

export const buildHomeDescription = () =>
  "Galgame Guide 提供视觉小说与 Galgame 的站内检索、标签筛选、作品概览和相似条目发现，不根据标签推断未经核实的攻略信息。";

export const buildHomeKeywords = () => [
  ...sharedKeywords,
  "Galgame 作品目录",
  "视觉小说作品发现",
  "Galgame 标签筛选",
];
