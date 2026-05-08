import type { GameRecord } from "@/lib/types/game";

import { siteConfig } from "@/lib/config";

const sharedKeywords = [
  "次元绅士指南",
  "绅游推荐",
  "Galgame攻略",
  "绅士游戏攻略",
  "全CG存档",
  "回想解锁",
  "视觉小说解析",
  "汉化版攻略",
  "游戏分歧路线",
  "真结局达成条件",
];

export const buildGameTitle = (game: GameRecord) =>
  `${game.title} 攻略｜全结局达成路线｜回想场景解锁条件`;

export const buildGameDescription = (game: GameRecord) => {
  const tagStr = game.tags.slice(0, 3).join(" / ");
  return `${game.title} 深度攻略，涵盖 ${tagStr} 核心玩法、全结局分歧选项、回想场景触发条件与存档位置说明。次元绅士指南为您整理最完整的 FAQ 与类似作品推荐。`;
};

export const buildGameKeywords = (game: GameRecord) => [
  game.title,
  `${game.title}攻略`,
  `${game.title}全CG`,
  `${game.title}存档`,
  `${game.title}结局`,
  ...game.tags,
  ...sharedKeywords,
];

export const buildCanonicalPath = (slug: string) => `/${slug}`;

export const buildHomeTitle = () =>
  `次元绅士指南｜绅游推荐与 Galgame 全结局攻略索引`;

export const buildHomeDescription = () =>
  "次元绅士指南：专注于绅游推荐、Galgame 全结局攻略及全图存档指南。为您拆解复杂的选项分歧，助您快速解锁回想，体验最极致的游戏内容。";

export const buildHomeKeywords = () => [
  ...sharedKeywords,
  "绅游推荐大全",
  "绅士游戏指南",
  "Galgame全结局",
  "黄油全CG存档",
  "视觉小说路线解析",
];

export const buildTwitterMeta = ({
  title,
  description,
  image,
}: {
  title: string;
  description: string;
  image?: string;
}) => ({
  card: "summary_large_image" as const,
  title,
  description,
  images: image ? [image] : undefined,
});
