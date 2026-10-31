/**
 * 每日增量生成「中性作品介绍」。
 *
 * 为什么要有这个：主站每篇帖子已经有一份结构化正文（游戏介绍 / 剧情 / 特点 /
 * 资源信息），但里面混着成人向表述。卫星站的目标是做成可被搜索引擎正常收录的
 * 作品资料页，所以要把同一份内容改写成中性表述 —— 不是重新创作，是改写。
 *
 * 三条硬约束：
 *   1. 只能使用输入里出现的信息。数字（时长/体积/版本号）必须能在输入里找到出处，
 *      这是最容易露馅的编造点，用脚本卡死。
 *   2. 不得出现成人向词与主观评价。
 *   3. 每天只跑一小批（默认 20 条）。一是 Cloudflare 免费额度有限，二是
 *      「站点每天都有新内容」本身就是给爬虫的更新信号，一次跑完反而浪费。
 */

/** 成人向词与主观评价，命中即判不合格。与 lib/content-clean.ts 保持同源语义。 */
const REJECT_PATTERN =
  /(绅士|成人向|r18|nsfw|hentai|h-games|porn|巨乳|爆乳|贫乳|后宫|ntr|寝取|触手|内射|中出|精液|射精|口交|足交|自慰|乱交|露出|调教|催眠|人妻|熟女|御姐|萝莉|正太|异种|兽交|淫|痴|乳首|巨根|无码|无修正|强暴|步兵|骑兵|亲密描写|耳舐め|色情|肛|エロ|偷拍|捆绑|舔|造人|性福|成熟向|bbc|bdsm|神作|必玩|强烈推荐|值得一玩|不容错过|年度最佳)/iu;

const MIN_INTRO_LENGTH = 60;
const MAX_INTRO_LENGTH = 420;

const SYSTEM_PROMPT = `你是游戏资料库的编辑。把给定记录改写成一段中性作品介绍。

硬性规则（违反任一即不合格）：
1. 只能使用输入里出现的信息。禁止补充开发商、评分、评价、剧情细节、角色名、具体情节。
2. 禁止任何性描写、露骨词汇、成人向表述。
3. 禁止主观评价（神作/必玩/强烈推荐/佳作等）。
4. 平实说明文，120-220 字。信息不足就写短，不要凑字数。
5. 只输出 JSON，不要任何解释：{"intro":"...","points":["...","..."]}
   points 为 2-4 条客观特征，每条 12-28 字。`;

function buildUserPrompt(game) {
  return [
    `标题：${game.title}`,
    `类型标签：${game.tags || "（无）"}`,
    "原始正文（含需剔除的表述，只能从这里取事实）：",
    String(game.summary || "").slice(0, 1400),
  ].join("\n");
}

/** 模型偶尔会把 JSON 截断，这里做一次容错解析。 */
function parseModelOutput(text) {
  const start = text.indexOf("{");
  if (start < 0) return null;
  const raw = text.slice(start);
  try {
    return JSON.parse(raw);
  } catch {
    const introMatch = raw.match(/"intro"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (!introMatch) return null;
    const points = [...raw.matchAll(/"((?:[^"\\]|\\.){12,80})"/g)]
      .map((m) => {
        try {
          return JSON.parse(`"${m[1]}"`);
        } catch {
          return null;
        }
      })
      .filter((s) => typeof s === "string" && s.length >= 12);
    let intro = introMatch[1];
    try {
      intro = JSON.parse(`"${introMatch[1]}"`);
    } catch {
      /* 保留原文 */
    }
    return { intro, points: points.slice(0, 4) };
  }
}

/**
 * 校验生成结果。返回 null 表示通过，否则返回拒绝原因。
 *
 * 数字校验是这里最有价值的一条：模型最容易编造的就是时长、体积、版本号，
 * 而这三个恰好都能在原文里逐个比对。
 */
function validateResult(result, game) {
  const intro = String(result?.intro ?? "").trim();
  if (intro.length < MIN_INTRO_LENGTH) return `intro 过短(${intro.length})`;
  if (intro.length > MAX_INTRO_LENGTH) return `intro 过长(${intro.length})`;

  const points = Array.isArray(result?.points)
    ? result.points.map((p) => String(p).trim()).filter(Boolean).slice(0, 4)
    : [];
  if (points.length < 2) return "points 少于 2 条";

  const full = [intro, ...points].join(" ");
  if (REJECT_PATTERN.test(full)) return `命中禁用词：${full.match(REJECT_PATTERN)[0]}`;

  // 数字必须能在输入里找到出处
  const source = `${game.title}\n${game.tags ?? ""}\n${game.summary ?? ""}`;
  const numbers = full.match(/\d+(?:\.\d+)?/g) ?? [];
  for (const n of numbers) {
    if (!source.includes(n)) return `编造数字：${n}`;
  }

  return null;
}

async function callModel({ accountId, apiToken, model }, userPrompt, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          // gpt-oss 是推理模型：token 预算给小了会被思考过程吃光、content 返回空串。
          // 实测 1200 时约 45% 空响应，1600 + reasoning_effort=low 后 8/8 正常。
          max_tokens: 1600,
          reasoning_effort: "low",
        }),
        signal: controller.signal,
      },
    );
    if (!res.ok) {
      const body = (await res.text()).slice(0, 200);
      throw new Error(`HTTP ${res.status}: ${body}`);
    }
    const json = await res.json();
    return json.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 每天增量生成一批中性作品介绍。
 *
 * @param {object} opts
 * @param {import("@libsql/client").Client} opts.db
 * @param {number} [opts.limit]
 * @param {string} opts.accountId
 * @param {string} opts.apiToken
 * @param {string} [opts.model]
 * @param {number} [opts.concurrency]
 * @param {boolean} [opts.dryRun]
 * @param {number} [opts.timeoutMs]
 * @param {(message: string) => void} [opts.log]
 * @returns {Promise<{picked: number, written: number, rejected: number, failed: number}>}
 */
export async function runIntroGeneration({
  db,
  limit = 20,
  accountId,
  apiToken,
  model = "@cf/openai/gpt-oss-20b",
  concurrency = 4,
  dryRun = false,
  timeoutMs = 30000,
  log = () => {},
}) {
  if (!accountId || !apiToken) {
    throw new Error("缺少 CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_AI_API_TOKEN");
  }

  const candidates = await db.execute({
    sql: `SELECT slug, title, tags, summary FROM games
          WHERE ai_intro IS NULL
          ORDER BY views DESC
          LIMIT ?`,
    args: [limit],
  });

  const stats = { picked: candidates.rows.length, written: 0, rejected: 0, failed: 0 };
  if (stats.picked === 0) return stats;

  // 并发跑：Vercel 函数默认 60s 上限，串行 20 条必然超时。
  let cursor = 0;
  let aborted = false;

  const worker = async () => {
    while (!aborted) {
      const index = cursor++;
      if (index >= candidates.rows.length) return;
      const game = candidates.rows[index];
      try {
        const text = await callModel(
          { accountId, apiToken, model },
          buildUserPrompt(game),
          timeoutMs,
        );
        const parsed = parseModelOutput(text);
        if (!parsed) {
          stats.failed += 1;
          log(`[intro] 解析失败 ${game.slug}`);
          continue;
        }
        const reason = validateResult(parsed, game);
        if (reason) {
          stats.rejected += 1;
          log(`[intro] 拒绝 ${game.slug}：${reason}`);
          // 校验拒绝是确定性的（词表/数字对不上），写空串标记「已处理」，
          // 否则每天都会重跑同一批，白烧免费额度。网络失败则保持 NULL 明天重试。
          if (!dryRun) {
            await db.execute({
              sql: "UPDATE games SET ai_intro = '' WHERE slug = ?",
              args: [game.slug],
            });
          }
          continue;
        }

        if (!dryRun) {
          await db.execute({
            sql: `UPDATE games SET ai_intro = ?, ai_points = ?, ai_model = ?,
                    ai_generated_at = CURRENT_TIMESTAMP WHERE slug = ?`,
            args: [
              String(parsed.intro).trim(),
              JSON.stringify(parsed.points.map((p) => String(p).trim()).slice(0, 4)),
              model,
              game.slug,
            ],
          });
        }
        stats.written += 1;
        log(`[intro] 完成 ${game.slug}`);
      } catch (error) {
        stats.failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        log(`[intro] 失败 ${game.slug}：${message}`);
        // 额度/鉴权类错误继续跑没有意义，直接中断，剩下的明天再说
        if (/HTTP (401|403|429)/.test(message)) aborted = true;
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, candidates.rows.length) }, worker),
  );

  return stats;
}
