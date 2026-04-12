import type { GameRecord } from "@/lib/types/game";

import { siteConfig } from "@/lib/config";

const sharedKeywords = [
  "次元轨迹",
  "Galgame攻略",
  "黄油攻略",
  "绅士游戏攻略",
  "全CG存档",
  "回想解锁",
  "视觉小说",
  "汉化版攻略",
  "游戏分歧路线",
  "真结局达成",
];

export const buildGameTitle = (game: GameRecord) =>
  `${game.title}攻略｜全CG解锁条件｜存档路径说明｜次元轨迹`;

export const buildGameDescription = (game: GameRecord) =>
  `${game.title}攻略页，为您整理 ${game.tags.slice(0, 3).join(" / ")} 核心玩法、全CG解锁路线、存档位置说明、FAQ 常见问题与类似作品推荐。专业的 Galgame 与黄油指南。`;

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
  `${siteConfig.name}｜专业的 Galgame / 黄油 / 绅士游戏攻略与存档索引`;

export const buildHomeDescription = () =>
  "次元轨迹游戏攻略索引，系统整理 Galgame、黄油、绅士游戏的深度攻略、全CG解锁、存档说明与常见问题。助您快速达成全收集，体验完美剧情。";

export const buildHomeKeywords = () => [
  ...sharedKeywords,
  "次元轨迹攻略",
  "Galgame全结局",
  "黄油全CG存档",
  "绅士游戏指南",
  "视觉小说路线",
];
