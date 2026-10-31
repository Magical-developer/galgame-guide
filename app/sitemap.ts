import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/config";
import { getAllGames } from "@/lib/games";

// Regenerate at runtime so the sitemap self-heals even if the build-time
// database connection failed (otherwise it would ship with zero game URLs).
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages = [
    { path: "/", priority: 1.0, freq: "daily" as const },
    { path: "/archive", priority: 0.8, freq: "daily" as const },
    { path: "/about", priority: 0.3, freq: "monthly" as const },
    { path: "/contact", priority: 0.3, freq: "monthly" as const },
    { path: "/privacy", priority: 0.3, freq: "monthly" as const },
    { path: "/terms", priority: 0.3, freq: "monthly" as const },
  ];

  // 2026-10-31 恢复全量作品页：站点定位从「攻略站」改为「作品资料库」后，
  // 作品页就是它唯一的内容资产，不进 sitemap 等于没有承接入口。
  // 单文件上限 50,000 条，当前 3,876 条远未触顶，不需要分片。
  const games = await getAllGames();
  const gameEntries: MetadataRoute.Sitemap = games.map((game) => ({
    url: absoluteUrl(`/${game.slug}`),
    lastModified: game.updatedAt ? new Date(game.updatedAt) : now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [
    ...staticPages.map((page) => ({
      url: absoluteUrl(page.path),
      lastModified: now,
      changeFrequency: page.freq,
      priority: page.priority,
    })),
    ...gameEntries,
  ];
}
