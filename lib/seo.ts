import type { GameRecord } from "@/lib/types/game";

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
  const tags = game.tags.slice(0, 4).join("、") || "视觉小说";
  const shortTags = game.tags.slice(0, 3).join(" / ") || "Galgame";

  let unique: string;
  if (game.summary && game.summary.length >= 80) {
    unique = game.summary.length > 100 ? game.summary.slice(0, 100) + "..." : game.summary;
  } else {
    unique = `${game.title} 是一款融合 ${tags} 元素的视觉小说作品。${game.summary || ""}`.trim();
    if (unique.length > 100) {
      unique = unique.slice(0, 100) + "...";
    }
  }

  return `${unique} — 深度攻略，涵盖 ${shortTags} 核心玩法、全结局分歧选项、回想场景触发条件与存档位置说明。`;
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
  "次元绅士指南是专业的绅游推荐与 Galgame 攻略索引门户，提供视觉小说全结局路线、回想场景解锁条件、全 CG 存档位置与汉化版安装说明，助您高效达成真结局与完美收集。";

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
