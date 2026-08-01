import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/config";
import { getAllSlugs, getGamesCount } from "@/lib/games";

const ARCHIVE_PAGE_SIZE = 48;

// Regenerate at runtime so the sitemap self-heals even if the build-time
// database connection failed (otherwise it would ship with zero game URLs).
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, totalGames] = await Promise.all([getAllSlugs(), getGamesCount()]);
  const now = new Date();
  const archivePages = Math.max(1, Math.ceil(totalGames / ARCHIVE_PAGE_SIZE));

  const staticPages = [
    { path: "/", priority: 1.0, freq: "daily" as const },
    { path: "/archive", priority: 0.9, freq: "daily" as const },
    { path: "/about", priority: 0.3, freq: "monthly" as const },
    { path: "/contact", priority: 0.3, freq: "monthly" as const },
    { path: "/privacy", priority: 0.3, freq: "monthly" as const },
    { path: "/terms", priority: 0.3, freq: "monthly" as const },
  ];

  return [
    ...staticPages.map((p) => ({
      url: absoluteUrl(p.path),
      lastModified: now,
      changeFrequency: p.freq,
      priority: p.priority,
    })),
    ...(archivePages > 1
      ? Array.from({ length: archivePages - 1 }, (_, i) => ({
          url: absoluteUrl(`/archive?page=${i + 2}`),
          lastModified: now,
          changeFrequency: "daily" as const,
          priority: 0.7,
        }))
      : []),
    ...slugs.map((slug) => ({
      url: absoluteUrl(`/${slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
