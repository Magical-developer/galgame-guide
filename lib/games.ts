import { cache } from "react";
import { db } from "./db";
import { buildSummaryText, cleanTitle, filterTags, isBlockedTag } from "@/lib/content-clean";
import type { GameRecord } from "@/lib/types/game";

type RawRow = Record<string, unknown>;

function parseTags(raw: unknown): string[] {
  const text = String(raw ?? "[]");
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return text.split(",");
  }
}

/**
 * 标签允许集 = 全库高频词的前 300 个，再交给成人词黑名单剔除。
 *
 * 为什么还要频率门槛：全库 3,809 个 distinct 标签，纯黑名单挡不住长尾里的
 * 成人词（实测漏掉 `BBC` 这类只出现一两次的缩写）。高频词天然是类型/平台/语言
 * 这类结构化标签，长尾则多是系列名和杂项，砍掉既降风险也不损失信息。
 * 用运行时统计而不是硬编码清单：上游每天同步，词表会变。
 */
const TAG_FREQUENCY_LIMIT = 300;

function buildAllowedTags(tagLists: string[][]): Set<string> {
  const counts = new Map<string, number>();
  for (const list of tagLists) {
    for (const tag of list) {
      const key = tag.trim().toLocaleLowerCase("zh-CN");
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TAG_FREQUENCY_LIMIT)
    .map(([key]) => key);
  return new Set(top.filter((key) => !isBlockedTag(key)));
}

// 清洗放在这里而不是写库层：Vercel Cron 每天重新灌一遍上游数据，
// 在数据库里洗一次第二天就被覆盖回去了。
const mapRowToGame = (row: RawRow, allowedTags: Set<string>): GameRecord => {
  const title = cleanTitle(String(row.title || ""));
  return {
    sourceId: String(row.source_id || ""),
    slug: String(row.slug || ""),
    title,
    tags: filterTags(parseTags(row.tags), allowedTags),
    summary: buildSummaryText(title, String(row.summary || "")),
    views: Number(row.views || 0),
    createdAt: String(row.created_at || ""),
    updatedAt: String(row.updated_at || ""),
    sourceHash: String(row.source_hash || ""),
    aiIntro: parseAiIntro(row.ai_intro),
    aiPoints: parseAiPoints(row.ai_points),
    aiGeneratedAt: row.ai_generated_at ? String(row.ai_generated_at) : null,
  };
};

/**
 * 读取层再校验一次 AI 介绍。
 *
 * 生成端（lib/intro/engine.mjs）已经卡过黑名单，但那是历史某一版词表的结果；
 * 词表更新后，旧数据可能带着当时漏掉的词。这里命中就直接弃用、回退到原始简介，
 * 页面不会因为一条脏数据整页变成成人内容页。
 */
function parseAiIntro(raw: unknown): string | null {
  const text = String(raw ?? "").trim();
  if (text.length < 40) return null;
  if (isBlockedTag(text)) return null;
  return text;
}

function parseAiPoints(raw: unknown): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0 && !isBlockedTag(item))
      .slice(0, 4);
  } catch {
    return [];
  }
}

const ASCII_REGEX = /^[\x00-\x7F]+$/;

function isAsciiSlug(slug: string): boolean {
  return ASCII_REGEX.test(slug);
}

function pickCanonicalGame(games: GameRecord[]): GameRecord {
  // Prefer ASCII slugs, then latest updatedAt, then latest createdAt.
  const sorted = [...games].sort((a, b) => {
    const aAscii = isAsciiSlug(a.slug) ? 1 : 0;
    const bAscii = isAsciiSlug(b.slug) ? 1 : 0;
    if (aAscii !== bAscii) return bAscii - aAscii;
    const ua = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    if (ua !== 0) return ua;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return sorted[0];
}

function dedupeBySourceId(games: GameRecord[]): GameRecord[] {
  const groups = new Map<string, GameRecord[]>();
  for (const game of games) {
    const key = game.sourceId || game.slug;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(game);
  }
  return [...groups.values()].map(pickCanonicalGame);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Turso free tier databases sleep when idle; the first connection can take
// several seconds to cold-start. Retry with backoff so build-time prerender
// (homepage, sitemap) doesn't silently render with empty data.
const safeQuery = async <T>(
  fn: () => Promise<T>,
  fallback: T,
  label: string,
  maxAttempts = 3
): Promise<T> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) {
        console.error(`[DB] ${label} failed after ${maxAttempts} attempts:`, (err as Error).message);
        return fallback;
      }
      console.warn(
        `[DB] ${label} attempt ${attempt}/${maxAttempts} failed: ${(err as Error).message}. Retrying in ${attempt}s...`
      );
      await sleep(attempt * 1000);
    }
  }
  return fallback;
};

export const getAllGames = cache(async (): Promise<GameRecord[]> => {
  return safeQuery(
    async () => {
      const result = await db.execute("SELECT * FROM games ORDER BY published_at DESC");
      const allowedTags = buildAllowedTags(result.rows.map((row) => parseTags(row.tags)));
      const games = result.rows.map((row) => mapRowToGame(row, allowedTags));
      return dedupeBySourceId(games);
    },
    [],
    "getAllGames"
  );
});

export const getRecentSlugs = cache(async (limit = 200): Promise<string[]> => {
  return safeQuery(
    async () => {
      const games = await getAllGames();
      return games.slice(0, limit).map((game) => game.slug);
    },
    [],
    "getRecentSlugs"
  );
});

export const getAllSlugs = cache(async (): Promise<string[]> => {
  return safeQuery(
    async () => {
      const games = await getAllGames();
      return games.map((game) => game.slug);
    },
    [],
    "getAllSlugs"
  );
});

export const getGamesPaginated = cache(
  async (page = 1, pageSize = 48): Promise<GameRecord[]> => {
    return safeQuery(
      async () => {
        const games = await getAllGames();
        const offset = (page - 1) * pageSize;
        return games.slice(offset, offset + pageSize);
      },
      [],
      "getGamesPaginated"
    );
  }
);

export const getGamesCount = cache(async (): Promise<number> => {
  return safeQuery(
    async () => {
      const games = await getAllGames();
      return games.length;
    },
    0,
    "getGamesCount"
  );
});

export type CatalogSort = "latest" | "popular" | "title";

export const findGames = cache(
  async ({
    query = "",
    tag = "",
    sort = "latest",
    page = 1,
    pageSize = 48,
  }: {
    query?: string;
    tag?: string;
    sort?: CatalogSort;
    page?: number;
    pageSize?: number;
  }): Promise<{ games: GameRecord[]; total: number }> => {
    const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
    const normalizedTag = tag.trim().toLocaleLowerCase("zh-CN");
    const allGames = await getAllGames();
    const filtered = allGames.filter((game) => {
      const tags = game.tags.map((item) => item.toLocaleLowerCase("zh-CN"));
      const matchesTag = !normalizedTag || tags.includes(normalizedTag);
      const haystack = [game.title, game.summary, ...game.tags]
        .join("\n")
        .toLocaleLowerCase("zh-CN");
      return matchesTag && (!normalizedQuery || haystack.includes(normalizedQuery));
    });

    filtered.sort((a, b) => {
      if (sort === "popular") return b.views - a.views;
      if (sort === "title") return a.title.localeCompare(b.title, "zh-CN");
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * pageSize;
    return {
      games: filtered.slice(offset, offset + pageSize),
      total: filtered.length,
    };
  },
);

export const getTopTags = cache(async (limit = 16) => {
  const counts = new Map<string, number>();
  const games = await getAllGames();
  for (const game of games) {
    for (const tag of new Set(game.tags.map((item) => item.trim()).filter(Boolean))) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
});

export const getFeaturedGames = cache(async (limit = 9): Promise<GameRecord[]> => {
  return safeQuery(
    async () => {
      const games = await getAllGames();
      return [...games].sort((a, b) => b.views - a.views).slice(0, limit);
    },
    [],
    "getFeaturedGames"
  );
});

export const getGameBySlug = cache(async (slug: string): Promise<GameRecord | null> => {
  return safeQuery(
    async () => {
      const games = await getAllGames();
      return games.find((game) => game.slug === slug) ?? null;
    },
    null,
    `getGameBySlug(${slug})`
  );
});
