/**
 * 展示层清洗。
 *
 * 上游数据是主站的帖子镜像，带着三类脏东西：
 *   1. 标题被旧的 AI 链路追加过「攻略解析 | 全结局路线 | 全CG回想解锁」后缀；
 *   2. 简介里混着网盘说明（「【度盘/1.2G】」），属于上游的分发信息，不该出现在资料页；
 *   3. 标签里混着成人向词（巨乳/步兵/NTR/成人向/R18…）。
 *
 * 清洗放在读取层而不是写库层：Vercel Cron 每天会重新灌一遍上游数据，
 * 只在数据库里洗一次，第二天就被覆盖回去了。
 */

/**
 * 成人向标签黑名单。
 *
 * 为什么用黑名单而不是白名单：实测每篇中位数 7 个标签、全库 3,809 个 distinct 值，
 * 白名单（约 40 个类型词）会把绝大多数条目筛成 0~1 个标签，页面反而更空。
 * 黑名单只针对明确的成人词，其余类型/平台/语言标签原样保留。
 */
const BLOCKED_TAG_PATTERN =
  /(绅士|成人|r18|nsfw|hentai|h-games|porn|巨乳|爆乳|贫乳|后宫|ntr|寝取|触手|内射|中出|精液|射精|口交|口爆|足交|乳交|自慰|乱交|露出|调教|催眠|人妻|熟女|御姐|萝莉|正太|异种|兽交|淫|痴|乳首|巨根|无码|无修正|强暴|强奸|輪姦|轮奸|步兵|骑兵|亲密描写|耳舐め|色情|肛|エロ|偷拍|捆绑|舔|造人|性福|成熟向|bbc|bdsm|后入|後入|女上位|男上位|颜射|顔射|潮吹|3p|双飞|双飛|火车便当|火車便當|发情|発情|绝顶|絶頂|肉便器|受精|孕ませ|妊娠|奸|娼|援交|卖春|売春|风俗|風俗|监禁|監禁|凌辱|孕腹|痴汉|痴漢|淫乱|淫亂|拔作|里番|裏番|工口|エッチ|性交|性爱|性愛|手交)/iu;

/** 常见标签的大小写/别名归一，避免同一篇里出现 SLG 和 slg 两个。 */
const TAG_ALIASES: Record<string, string> = {
  slg: "SLG",
  rpg: "RPG",
  adv: "ADV",
  avg: "AVG",
  act: "ACT",
  sim: "SIM",
  pc: "PC",
  "pc游戏": "PC",
  windows: "PC",
  android: "安卓",
  安卓: "安卓",
  官中: "官方中文",
  汉化版: "汉化",
  中文版: "中文",
  "live2d": "Live2D",
  "2d": "2D",
  "3d": "3D",
  mmd: "MMD",
  cv: "CV",
};

const MAX_TAGS = 8;
const MAX_TAG_LENGTH = 24;

/** 成人向标签判定。也用于计算允许集时剔除高频成人词。 */
export function isBlockedTag(tag: string): boolean {
  return BLOCKED_TAG_PATTERN.test(tag);
}

/**
 * 按允许集过滤标签并归一别名，去重后最多 8 个。
 * 允许集由 lib/games.ts 按全库词频算出来，已经排除成人词。
 */
export function filterTags(tags: string[], allowed: Set<string>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const trimmed = String(raw ?? "").trim();
    if (!trimmed || trimmed.length > MAX_TAG_LENGTH) continue;
    if (isBlockedTag(trimmed)) continue;

    const key = trimmed.toLocaleLowerCase("zh-CN");
    if (!allowed.has(key)) continue;

    const display = TAG_ALIASES[key] ?? trimmed;
    if (seen.has(display)) continue;
    seen.add(display);
    result.push(display);
    if (result.length >= MAX_TAGS) break;
  }
  return result;
}

/**
 * 去掉旧链路追加的假后缀，以及标题里的成人向词。
 *
 * 只匹配「攻略解析」这类模板尾巴，正常标题里出现「攻略」二字不受影响。
 * 成人词做整词剔除而不是整条丢弃：实测 400 条样本里 104 条命中，
 * 剔除后没有一条短于 4 字，作品名基本都保留下来了。
 */
export function cleanTitle(title: string): string {
  const stripped = String(title ?? "")
    .replace(/\s*[|｜]?\s*攻略解析\s*[|｜].*$/u, "")
    .replace(/\s*攻略解析.*$/u, "")
    .replace(/\s*[|｜]?\s*全结局路线.*$/u, "")
    .replace(/\s*[|｜]?\s*全CG回想解锁.*$/u, "")
    .trim();

  const withoutBlocked = stripped
    .replace(new RegExp(BLOCKED_TAG_PATTERN.source, "giu"), " ")
    .replace(/\s+/g, " ")
    .trim();

  // 兜底：清洗后为空说明整条都是成人词，宁可丢这一页的标题也别把词放回去
  return withoutBlocked || "未命名作品";
}

/**
 * 去掉网盘/体积说明这类分发信息，只留作品本身的描述。
 *
 * 2026-10-31 实测：3,876 条简介里 2,227 条（57.5%）含成人向词，
 * 光清标签不够 —— 简介是页面正文，文字信号一样会把站点推进成人分类。
 * 处理顺序：先剥网盘信息，再按分隔符切句、丢掉命中黑名单的分句，
 * 最后对残留词做兜底替换，避免整段被删后页面变成空壳。
 */
export function cleanSummary(summary: string): string {
  const stripped = String(summary ?? "")
    .replace(/[【\[]\s*(?:度盘|百度云盘|百度网盘|百度|云盘|夸克|夸克网盘|迅雷)[^】\]]*[】\]]/gu, " ")
    .replace(/[【\[]\s*(?:绅士游戏|R18|成人向)\s*[】\]]/gu, " ")
    .replace(/[【\[]\s*(?:MMD|VAM)\s*[】\]]/gu, " ")
    .trim();

  const segments = stripped.split(/[/／|｜，,、;；]/u);
  const kept = segments
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && !BLOCKED_TAG_PATTERN.test(segment));

  let text = kept.join(" / ");
  // 整句都被丢掉时退化为逐词替换，至少保住作品名和版本信息
  if (text.length < 12) {
    text = stripped.replace(new RegExp(BLOCKED_TAG_PATTERN.source, "giu"), "").trim();
  }
  return text.replace(/\s+/g, " ").replace(/^[\s/／|｜]+|[\s/／|｜]+$/gu, "");
}

/**
 * 清洗后的简介。太短就返回空串，不再兜一句模板。
 *
 * 2026-11-01 改：此前不足 20 字时返回「{标题} 的作品资料条目，收录标题、类型
 * 标签与更新时间。」—— 3,876 个页面里凡是短简介的都共用这一句，等于自己给站点
 * 制造重复内容，正是搜索引擎判「薄页/门页」的特征。宁可少一段文字，也不要模板句。
 */
export function buildSummaryText(summary: string): string {
  const cleaned = cleanSummary(summary);
  return cleaned.length >= 20 ? cleaned : "";
}
