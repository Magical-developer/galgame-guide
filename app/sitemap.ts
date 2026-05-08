import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/config";
import { getAllGames } from "@/lib/games";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const games = await getAllGames();
  const now = new Date();

  const staticPages = [
    { path: "/", priority: 1.0, freq: "daily" as const },
    { path: "/archive", priority: 0.9, freq: "daily" as const },
    { path: "/about", priority: 0.3, freq: "monthly" as const },
    { path: "/contact", priority: 0.3, freq: "monthly" as const },
    { path: "/privacy", priority: 0.3, freq: "monthly" as const },
  ];

  return [
    ...staticPages.map((p) => ({
      url: absoluteUrl(p.path),
      lastModified: now,
      changeFrequency: p.freq,
      priority: p.priority,
    })),
    ...games.map((game) => ({
      url: absoluteUrl(`/${game.slug}`),
      lastModified: game.updatedAt ? new Date(game.updatedAt) : now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
