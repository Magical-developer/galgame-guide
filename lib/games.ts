import { cache } from "react";
import { db } from "./db";
import type { GameRecord, GuideDocument } from "@/lib/types/game";

type RawRow = Record<string, unknown>;

// Helper to map DB row to GameRecord
const mapRowToGame = (row: RawRow): GameRecord => ({
  sourceId: String(row.source_id || ""),
  slug: String(row.slug || ""),
  title: String(row.title || ""),
  tags: JSON.parse(String(row.tags || "[]")),
  summary: String(row.summary || ""),
  cover: String(row.cover || ""),
  download: String(row.download || ""),
  downloadLabel: String(row.download_label || ""),
  views: Number(row.views || 0),
  createdAt: String(row.created_at || ""),
  updatedAt: String(row.updated_at || ""),
  sourceHash: String(row.source_hash || ""),
});

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

const safeQuery = async <T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> => {
  try {
    return await fn();
  } catch (err) {
    console.error(`[DB] ${label} failed:`, (err as Error).message);
    return fallback;
  }
};

export const getAllGames = cache(async (): Promise<GameRecord[]> => {
  return safeQuery(
    async () => {
      const result = await db.execute("SELECT * FROM games ORDER BY published_at DESC");
      const games = result.rows.map(mapRowToGame);
      return dedupeBySourceId(games);
    },
    [],
    "getAllGames"
  );
});

export const getRecentSlugs = cache(async (limit = 200): Promise<string[]> => {
  return safeQuery(
    async () => {
      const result = await db.execute({
        sql: "SELECT slug, source_id, updated_at, created_at FROM games ORDER BY published_at DESC",
        args: [],
      });
      const games = result.rows.map(mapRowToGame);
      return dedupeBySourceId(games)
        .slice(0, limit)
        .map((game) => game.slug);
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
        const result = await db.execute({
          sql: "SELECT * FROM games ORDER BY published_at DESC",
          args: [],
        });
        const games = result.rows.map(mapRowToGame);
        const deduped = dedupeBySourceId(games);
        const offset = (page - 1) * pageSize;
        return deduped.slice(offset, offset + pageSize);
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

export const getFeaturedGames = cache(async (limit = 9): Promise<GameRecord[]> => {
  return safeQuery(
    async () => {
      const result = await db.execute({
        sql: "SELECT * FROM games ORDER BY views DESC",
        args: [],
      });
      const games = result.rows.map(mapRowToGame);
      return dedupeBySourceId(games).slice(0, limit);
    },
    [],
    "getFeaturedGames"
  );
});

export const getGameBySlug = cache(async (slug: string): Promise<GameRecord | null> => {
  return safeQuery(
    async () => {
      const result = await db.execute({
        sql: "SELECT * FROM games WHERE slug = ?",
        args: [slug],
      });
      if (result.rows.length === 0) return null;
      return mapRowToGame(result.rows[0]);
    },
    null,
    `getGameBySlug(${slug})`
  );
});

export const getGuideBySlug = cache(async (slug: string): Promise<GuideDocument | null> => {
  return safeQuery(
    async () => {
      const result = await db.execute({
        sql: "SELECT * FROM guides WHERE slug = ?",
        args: [slug],
      });
      if (result.rows.length === 0) return null;
      const row = result.rows[0] as RawRow;
      return {
        slug: String(row.slug),
        title: "",
        markdown: String(row.markdown || ""),
        generatedAt: String(row.generated_at || ""),
        sourceHash: "",
        provider: String(row.provider || ""),
        model: String(row.model || ""),
      };
    },
    null,
    `getGuideBySlug(${slug})`
  );
});
