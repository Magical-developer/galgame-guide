import { cache } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { GameRecord, GuideDocument } from "@/lib/types/game";

const generatedRoot = path.join(process.cwd(), "data", "generated");

const readJson = cache(async <T,>(filePath: string): Promise<T> => {
  const payload = await readFile(filePath, "utf8");
  return JSON.parse(payload) as T;
});

export const getAllGames = cache(async () => {
  const games = await readJson<GameRecord[]>(
    path.join(generatedRoot, "games.json")
  );

  return games.toSorted((left, right) => right.views - left.views);
});

export const getFeaturedGames = cache(async (limit = 9) => {
  const games = await getAllGames();
  return games.slice(0, limit);
});

export const getGameBySlug = cache(async (slug: string) => {
  const games = await getAllGames();
  return games.find((game) => game.slug === slug) ?? null;
});

export const getGuideBySlug = cache(async (slug: string) => {
  try {
    return await readJson<GuideDocument>(
      path.join(generatedRoot, "content", `${slug}.json`)
    );
  } catch {
    return null;
  }
});
