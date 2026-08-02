import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
      // AI 训练/内容抓取爬虫:爬取量大且不遵守频率限制,直接屏蔽。
      // Google-Extended 不影响 Google 搜索收录。
      ...["GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-Web", "anthropic-ai", "Bytespider", "CCBot", "PerplexityBot", "Applebot-Extended", "Amazonbot", "cohere-ai", "Diffbot", "FacebookBot"].map(
        (ua) => ({
          userAgent: ua,
          disallow: "/",
        })
      ),
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
