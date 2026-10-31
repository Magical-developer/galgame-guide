/**
 * IndexNow 提交器。
 *
 * 为什么要有它：站点每天由 cron 增量写库（同步新帖子、重写 20 条作品介绍），
 * 但此前只能靠 sitemap 的 lastmod 等搜索引擎自己来抓。Bing Webmaster 明确报了
 * 「爬取容量有限」，而 IndexNow 是 Bing 官方给的推送通道——直接告诉它哪些 URL
 * 变了，不用排队等抓取。同一个协议 Yandex 也认。
 *
 * 纪律：**只推真正变了的 URL**。Bing 把「重复提交未变更 URL」算滥用，会反过来
 * 降低信任。所以调用方传进来的必须是本次写库真的动过的 slug。
 */

/**
 * 单次请求的 URL 上限。
 *
 * 协议文档写的是 10,000，但 api.indexnow.org 实测不接受那么大的请求体：
 * 2026-11-01 全量 3,876 条一次提交返回 HTTP 403（key 本身没问题，单条提交是 200），
 * 分片到 1,000 条（70KB）正常。取 500 留足余量。
 */
const MAX_URLS_PER_REQUEST = 500;

/** 分片之间稍等一下，避免把端点打成限流。 */
const CHUNK_DELAY_MS = 500;

/** IndexNow 归属校验 key。公开值，不是密钥；轮换时改这里 + 环境变量覆盖即可。 */
export const INDEXNOW_KEY = "929ff1fe0279a15916f06c8aa856df76";

/**
 * 生产域名。IndexNow 的 host 必须和 URL 的 host 一致，脚本在本地跑时
 * 拿不到 VERCEL_PROJECT_PRODUCTION_URL，所以这里给一个明确默认值。
 */
export const PRODUCTION_SITE_URL = "https://galgame-guide.vercel.app";

const ENDPOINT = "https://api.indexnow.org/indexnow";

/**
 * 提交一组 URL。
 *
 * 永远不抛异常：IndexNow 挂了不能连带把 cron 任务判失败，否则数据已经写库了，
 * 反而会被当成同步失败重跑。
 *
 * @param {object} options
 * @param {string} options.siteUrl 站点根地址，用来取 host 与拼 URL
 * @param {string} [options.key] IndexNow key，默认取 siteConfig
 * @param {string[]} options.slugs 本次变更的作品 slug
 * @param {(message: string) => void} [options.log]
 * @returns {Promise<{ok: boolean, submitted: number, status: number, message?: string}>}
 */
export async function submitSlugs({ siteUrl, key, slugs, log = () => {} }) {
  const unique = [...new Set((slugs ?? []).map((s) => String(s ?? "").trim()))].filter(Boolean);
  if (unique.length === 0) return { ok: true, submitted: 0, status: 0 };

  if (!key) {
    log("[IndexNow] 未配置 key，跳过");
    return { ok: false, submitted: 0, status: 0, message: "missing key" };
  }

  const base = String(siteUrl ?? "").replace(/\/+$/, "");
  const host = new URL(base).host;

  const payload = {
    host,
    key,
    keyLocation: `${base}/indexnow-key.txt`,
    urlList: unique.map((slug) => `${base}/${encodeURIComponent(slug)}`),
  };

  const urls = unique.map((slug) => `${base}/${encodeURIComponent(slug)}`);
  let submitted = 0;
  let lastStatus = 0;

  for (let offset = 0; offset < urls.length; offset += MAX_URLS_PER_REQUEST) {
    const chunk = urls.slice(offset, offset + MAX_URLS_PER_REQUEST);
    if (offset > 0) await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));

    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ ...payload, urlList: chunk }),
      });
      lastStatus = response.status;
      // 200 = 已接受；202 = 已接受但 key 还在校验中。其余（400/403/422/429）都算失败。
      if (response.status !== 200 && response.status !== 202) {
        log(`[IndexNow] ${chunk.length} 个 URL -> HTTP ${response.status}，中止后续分片`);
        return { ok: false, submitted, status: response.status };
      }
      submitted += chunk.length;
      log(`[IndexNow] ${chunk.length} 个 URL -> HTTP ${response.status}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`[IndexNow] 提交失败：${message}`);
      return { ok: false, submitted, status: 0, message };
    }
  }

  return { ok: true, submitted, status: lastStatus };
}
