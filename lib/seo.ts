import type { GameRecord } from "@/lib/types/game";

import { siteConfig } from "@/lib/config";

const sharedKeywords = [
  "KRZACG",
  "KrzACG",
  "GalGame",
  "黄油",
  "绅士游戏",
  "游戏攻略",
  "全CG",
  "存档",
];

export const buildGameTitle = (game: GameRecord) =>
  `${game.title}攻略｜全CG解锁｜存档｜KRZACG GalGame`;

export const buildGameDescription = (game: GameRecord) =>
  `${game.title}攻略页，整理 ${game.tags.slice(0, 3).join(" / ")} 玩法重点、全CG解锁路线、存档说明、FAQ 与相似作品推荐，适合查找 KRZACG、GalGame、黄油、绅士游戏相关内容的玩家。`;

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
  `${siteConfig.name}｜KRZACG / GalGame / 黄油 / 绅士游戏攻略与存档`;

export const buildHomeDescription = () =>
  "KRZACG 游戏攻略库，整理 GalGame、黄油、绅士游戏的攻略、全CG、存档与常见问题，适合按题材和作品快速查找。";

export const buildHomeKeywords = () => [
  ...sharedKeywords,
  "KRZACG攻略",
  "GalGame攻略",
  "黄油攻略",
  "绅士游戏攻略",
  "黄油存档",
  "GalGame存档",
];
