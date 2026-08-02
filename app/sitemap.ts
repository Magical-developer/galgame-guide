import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/config";

// Regenerate at runtime so the sitemap self-heals even if the build-time
// database connection failed (otherwise it would ship with zero game URLs).
export const revalidate = 86400;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages = [
    { path: "/", priority: 1.0, freq: "daily" as const },
    { path: "/archive", priority: 0.8, freq: "daily" as const },
    { path: "/about", priority: 0.3, freq: "monthly" as const },
    { path: "/contact", priority: 0.3, freq: "monthly" as const },
    { path: "/privacy", priority: 0.3, freq: "monthly" as const },
    { path: "/terms", priority: 0.3, freq: "monthly" as const },
  ];

  return staticPages.map((page) => ({
    url: absoluteUrl(page.path),
    lastModified: now,
    changeFrequency: page.freq,
    priority: page.priority,
  }));
}
