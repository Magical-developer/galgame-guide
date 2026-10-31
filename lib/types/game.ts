export interface SourcePostTag {
  _id: string;
  name: string;
  heat?: number;
}

export interface SourcePostResource {
  url: string;
  platform?: string;
  extract_code?: string;
  unzip_psw?: string;
}

export interface SourcePost {
  _id: string;
  title: string;
  views: number;
  tags: SourcePostTag[];
  content: string;
  cover: string;
  created_at: string;
  updated_at: string;
  resources?: SourcePostResource[];
  download_platforms?: string[];
}

export interface GameRecord {
  sourceId: string;
  slug: string;
  title: string;
  tags: string[];
  summary: string;
  /**
   * 站点不展示任何图片，所以这里不携带封面地址。
   *
   * 2026-10-31 定：上游封面是主站 CDN 上的成人向图片，直接挂在 Bing 索引页上
   * 会让整个站点被判为 NSFW —— 主站就是这么丢掉 Bing 收录的。类型里删掉这个字段，
   * 任何还想渲染封面的地方都会编译失败，而不是悄悄漏出去。
   */
  views: number;
  createdAt: string;
  updatedAt: string;
  sourceHash: string;
  /**
   * AI 改写的「中性作品介绍」。为空时页面回退到清洗后的原始简介。
   *
   * 由 lib/intro/engine.mjs 每天增量生成，只改写上游已有的事实，
   * 不允许引入输入里没有的信息（数字会被脚本逐个比对出处）。
   */
  aiIntro: string | null;
  /** 客观特征短句，2-4 条 */
  aiPoints: string[];
  /** 生成时间，用作 sitemap 的 lastModified，让爬虫看到「每天在更新」 */
  aiGeneratedAt: string | null;
}
