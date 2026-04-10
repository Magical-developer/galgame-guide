import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/config";
import { getAllGames } from "@/lib/games";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const games = await getAllGames();

  return [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...games.map((game) => ({
      url: absoluteUrl(`/${game.slug}`),
      lastModified: game.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
