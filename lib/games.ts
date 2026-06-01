import { cache } from "react";
import { db, type GameRow, type GuideRow } from "./db";
import type { GameRecord, GuideDocument } from "@/lib/types/game";

// Helper to map DB row to GameRecord
const mapRowToGame = (row: any): GameRecord => ({
  sourceId: row.source_id,
  slug: row.slug,
  title: row.title,
  tags: JSON.parse(row.tags || "[]"),
  summary: row.summary,
  cover: row.cover,
  download: row.download,
  downloadLabel: row.download_label,
  views: Number(row.views || 0),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  sourceHash: row.source_hash || "",
});

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
      return result.rows.map(mapRowToGame);
    },
    [],
    "getAllGames"
  );
});

export const getRecentSlugs = cache(async (limit = 200): Promise<string[]> => {
  return safeQuery(
    async () => {
      const result = await db.execute({
        sql: "SELECT slug FROM games ORDER BY published_at DESC LIMIT ?",
        args: [limit],
      });
      return result.rows.map((row) => row.slug as string);
    },
    [],
    "getRecentSlugs"
  );
});

export const getGamesPaginated = cache(
  async (page = 1, pageSize = 48): Promise<GameRecord[]> => {
    return safeQuery(
      async () => {
        const offset = (page - 1) * pageSize;
        const result = await db.execute({
          sql: "SELECT * FROM games ORDER BY published_at DESC LIMIT ? OFFSET ?",
          args: [pageSize, offset],
        });
        return result.rows.map(mapRowToGame);
      },
      [],
      "getGamesPaginated"
    );
  }
);

export const getGamesCount = cache(async (): Promise<number> => {
  return safeQuery(
    async () => {
      const result = await db.execute("SELECT COUNT(*) as count FROM games");
      return Number((result.rows[0] as any).count || 0);
    },
    0,
    "getGamesCount"
  );
});

export const getFeaturedGames = cache(async (limit = 9): Promise<GameRecord[]> => {
  return safeQuery(
    async () => {
      const result = await db.execute({
        sql: "SELECT * FROM games ORDER BY views DESC LIMIT ?",
        args: [limit],
      });
      return result.rows.map(mapRowToGame);
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
      const row = result.rows[0] as any;
      return {
        slug: row.slug,
        title: "",
        markdown: row.markdown,
        generatedAt: row.generated_at,
        sourceHash: "",
        provider: row.provider,
        model: row.model,
      };
    },
    null,
    `getGuideBySlug(${slug})`
  );
});
