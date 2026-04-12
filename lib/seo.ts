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
  `${game.title}攻略｜全结局达成｜回想场景解锁条件｜次元绅士指南`;

export const buildGameDescription = (game: GameRecord) =>
  `${game.title}攻略页，专业的绅游指南。为您整理 ${game.tags.slice(0, 3).join(" / ")} 核心玩法、全CG解锁路线、存档位置说明、FAQ 常见问题与类似作品推荐。`;

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
  `${siteConfig.name}｜绅游玩家的深度攻略与全结局索引`;

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
