import { cache } from "react";
import { db, type GameRow, type GuideRow } from "@/lib/db";
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
  sourceHash: row.source_hash || "", // Fill the missing property
});

export const getAllGames = cache(async (): Promise<GameRecord[]> => {
  const result = await db.execute("SELECT * FROM games ORDER BY published_at DESC");
  return result.rows.map(mapRowToGame);
});

export const getFeaturedGames = cache(async (limit = 9): Promise<GameRecord[]> => {
  const result = await db.execute({
    sql: "SELECT * FROM games ORDER BY views DESC LIMIT ?",
    args: [limit],
  });
  return result.rows.map(mapRowToGame);
});

export const getGameBySlug = cache(async (slug: string): Promise<GameRecord | null> => {
  const result = await db.execute({
    sql: "SELECT * FROM games WHERE slug = ?",
    args: [slug],
  });
  if (result.rows.length === 0) return null;
  return mapRowToGame(result.rows[0]);
});

export const getGuideBySlug = cache(async (slug: string): Promise<GuideDocument | null> => {
  const result = await db.execute({
    sql: "SELECT * FROM guides WHERE slug = ?",
    args: [slug],
  });
  
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0] as any;
  return {
    slug: row.slug,
    title: "", // Title is managed by the page component
    markdown: row.markdown,
    generatedAt: row.generated_at,
    sourceHash: "", // Currently empty to satisfy the type
    provider: row.provider,
    model: row.model,
  };
});
