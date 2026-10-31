import { siteConfig } from "@/lib/config";

/**
 * IndexNow 的归属校验文件。
 *
 * key 不是密钥（IndexNow 协议本来就要求把它公开在站点上），放这里而不是 public/
 * 是为了让 key 只有 lib/config.ts 一个来源——否则轮换时要在两个地方同步改。
 */
export const dynamic = "force-static";

export function GET() {
  return new Response(siteConfig.indexNowKey, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
