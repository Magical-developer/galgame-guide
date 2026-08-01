import nextEnv from "@next/env";
import { createClient } from "@libsql/client";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const config = {
  aiBaseUrl: process.env.AI_BASE_URL ?? "",
  aiApiKey: process.env.AI_API_KEY ?? "",
  aiModel: process.env.AI_MODEL ?? "",
  dbUrl: process.env.TURSO_DATABASE_URL,
  dbToken: process.env.TURSO_AUTH_TOKEN,
  batchSize: Math.max(1, Number(process.env.AI_BATCH_SIZE ?? 20)),
  delayMs: Math.max(0, Number(process.env.AI_DELAY_MS ?? 300)),
  forceRegenerate: process.env.AI_FORCE_REGENERATE === "1",
  topN: Math.max(0, Number(process.env.AI_TOP_N ?? 0)),
};

if (!config.dbUrl || !config.aiBaseUrl || !config.aiApiKey || !config.aiModel) {
  console.error("[AI] Missing env vars: TURSO_DATABASE_URL, AI_BASE_URL, AI_API_KEY, AI_MODEL");
  process.exit(1);
}

const db = createClient({ url: config.dbUrl, authToken: config.dbToken });

const buildPrompt = (game) => `
你是一名资深Galgame与绅游攻略编辑，请为以下游戏撰写一篇深度攻略指南。

【游戏信息】
标题：${game.title}
标签：${game.tags.join("、")}
原始简介：${game.summary}

【写作要求 - 严格遵循】
1. 字数：1500-2500字之间。必须充实具体，每段不少于3-4句话，禁止空洞概括。
2. 风格：像资深玩家写给新手的硬核攻略，专业、懂行、有细节。不要出现"本攻略站"、"我们平台"等第三方口吻。
3. SEO关键词自然融入（不要堆砌，要自然）：绅游推荐、Galgame攻略教程、绅士游戏全CG存档、汉化补丁下载说明、完美全结局路线、真结局达成条件、回想内容解锁、存档路径说明、分歧选项、视觉小说全图、Galgame汉化版、绅游资源、黄油攻略、全结局回收、回想场景触发。
4. 合规：成人内容用"回想场景"、"特殊事件"、"动态CG"、"解锁特定路线"等术语。严禁露骨淫秽词汇。
5. 格式：纯Markdown，只输出正文，不要前言和结语。

【核心要求 - 每篇攻略都必须与任何其他篇不同】
1. **内容必须基于事实**：从"原始简介"和"标题"中提取这款游戏独有的信息——具体机制、角色、平台（STEAM/DLsite等）、版本号、汉化组、题材设定——并写进对应章节。简介里提到的具体信息必须被引用和展开。
2. **严禁使用万能套话**：以下表述出现即视为不合格：
   - "存档点A/B/C"、"第3-5个选项处保留存档"、"共通线/二周目回收结局"等不基于本游戏信息的通用结构
   - "建议关注官方公告或汉化组动态"、"回想要素需要通关全线"等无信息量的回答
   - 与游戏无关的笼统说辞（如"多数游戏存档在AppData"）
3. **FAQ 必须只属于这款游戏**：写4-6个从标题/标签/简介中挖掘出的具体问题，例如根据标题版本写"STEAM版和DLsite版存档互通吗？"、根据标签题材写"这款XX题材游戏的剧情侧重是什么？"、根据简介机制写具体问题。严禁使用"有官方中文吗？"、"存档消失了怎么办？"、"如何快速达成真结局？"、"回想场景解锁不了怎么办？"这类与游戏无关的通用问题。
4. **按标签调整侧重**：纯爱→情感路线与角色细节；调教/重口→特殊事件解锁条件与偏好设置；SLG→养成与策略要点；RPG→角色培养与队伍搭配；ACT→操作与关卡要点；像素→画面风格与氛围评价。
5. **信息不足时如实说明**：若简介信息不足以支撑某个章节的具体细节，明确写"根据现有资料推测"，严禁编造具体角色名、选项文字或剧情情节。

【必须包含的章节 - 每章都要详细展开】

## 游戏剧情简介
根据标题、标签和简介总结世界观、主角设定、核心冲突。有简介就引用简介事实展开。

## 核心推荐理由
从画风、声优、系统、剧情深度、特殊机制等维度分析。结合标签说明卖点，用这款游戏独有的特点说话。

## 角色路线与分歧选项
说明分歧结构：结合简介中可确认的信息给出路线开启逻辑。如果无法确认具体选项，写明"以下为通用思路"并给出普适的存档/读档策略，不得编造具体选项。

## 完美攻略全流程
按周目给出建议：一周目做什么、二周目做什么、哪些节点建议存档。结合本游戏的机制特点写，避免所有游戏雷同的流水账。

## 全CG与回想场景解锁
说明回想/图鉴的开启条件：是否需要通关全线、是否有隐藏回想、是否需要特定补丁或DLC。不确定的部分用推测语气。

## 存档管理与安装说明
结合标题中的版本信息（汉化版/STEAM版/版本号）说明存档兼容性、常见存档位置、云存档与汉化补丁的注意事项。

## 常见问题 FAQ
写4-6个三级标题FAQ，每个问题回答2-3句话。问题必须针对这款游戏的标题、标签、简介提出，禁止通用问题模板。

## 类似题材作品推荐
基于标签推荐2-3部同类佳作，简要说明为什么同好会喜欢。推荐作品要真实存在、广为人知。
`;

const buildFallbackContent = (game) => {
  const tagList = (game.tags || []).slice(0, 3).join("、") || "视觉小说";
  const summary = (game.summary || "").trim();
  const summaryExcerpt = summary.length > 220 ? `${summary.slice(0, 220)}……` : summary;

  return `## 游戏剧情简介
${game.title} 是一款以${tagList}为核心元素的游戏作品。${summaryExcerpt ? `根据现有资料：${summaryExcerpt}` : "本站将持续补充本作的剧情设定与世界观信息。"}

## 核心推荐理由
如果你偏好${tagList}题材，那么 ${game.title} 值得加入待玩清单。${summaryExcerpt ? "从现有资料来看，本作在玩法与题材结合上有其独到之处。" : "本站将根据玩家反馈持续补充本作的推荐理由。"}

## 角色路线与分歧选项
以下为通用攻略思路：建议在关键剧情选项前保留独立存档，优先推进主线以确认各角色路线的开启条件。本作的具体分歧点整理中，请以游戏内提示为准。

## 完美攻略全流程
一周目建议完整体验主线剧情，二周目起再针对特定路线做选择回收。所有可能影响结局的选择节点，都建议养成先存档再选择的习惯。

## 全CG与回想场景解锁
本作的全CG解锁通常依赖结局回收与特定事件触发。若包含隐藏回想，一般需要通关全部路线后开启。具体条件整理中。

## 存档管理与安装说明
${game.title}${(game.title || "").includes("STEAM") || (game.title || "").includes("Steam") ? "为 STEAM 平台版本，注意云存档与本地存档的同步关系。" : "为独立/汉化发行版本，注意保留原始文件备份，避免汉化补丁覆盖导致存档读写异常。"}

## 常见问题 FAQ
### ${game.title} 属于什么类型的游戏？
本作以${tagList}为核心要素，具体玩法与流程待本站完成深度解析后补充。

### 这款游戏的汉化版本情况如何？
流通版本信息请以发布页说明为准，本站解析完成后会补充汉化组与版本兼容性详情。

## 类似题材作品推荐
如果你喜欢本作的题材设定，可以继续探索带有${tagList}标签的同类作品，本站归档页已按热度与更新时间整理相关索引。
`;
};

async function requestAiMarkdown(game) {
  const endpoint = new URL("/v1/chat/completions", config.aiBaseUrl).toString();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.aiApiKey}`,
    },
    body: JSON.stringify({
      model: config.aiModel,
      temperature: 0.75,
      max_tokens: 3000,
      messages: [
        {
          role: "system",
          content: "你是一名资深Galgame攻略编辑。输出高质量、细节丰富、字数充足的markdown攻略。不要输出任何额外前言或结语。",
        },
        { role: "user", content: buildPrompt(game) },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[AI] API error ${response.status}: ${text.slice(0, 200)}`);
    return null;
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content?.trim();
  return content || null;
}

// Fallback providers created by sync-content.mjs / refill scripts. They are
// template text, not AI content — only regenerate them when explicitly asked.
const FALLBACK_PROVIDERS = "'sync-fallback', 'fallback-refill', 'fallback-batch', 'fallback-template'";

const pendingConditions = () => {
  const providers = config.forceRegenerate
    ? `gd.provider IN ('pending', 'local-import', '', ${FALLBACK_PROVIDERS})`
    : `gd.provider IN ('pending', 'local-import', '')`;
  return `
    (gd.slug IS NULL
     OR gd.markdown IS NULL
     OR LENGTH(TRIM(gd.markdown)) < 500
     OR ${providers})
  `;
};

// Canonical slug per source_id: prefer ASCII slugs, then latest update.
const CANONICAL_SLUG_SQL = `
  SELECT slug FROM (
    SELECT slug, source_id,
           ROW_NUMBER() OVER (
             PARTITION BY source_id
             ORDER BY (substr(slug, 1, 1) NOT GLOB '[a-zA-Z0-9]'), updated_at DESC, created_at DESC
           ) AS rn
    FROM games
  ) ranked
  WHERE rn = 1
`;

async function getPendingCount() {
  const result = await db.execute({
    sql: `
      SELECT COUNT(*) AS cnt FROM games g
      LEFT JOIN guides gd ON g.slug = gd.slug
      WHERE g.slug IN (${CANONICAL_SLUG_SQL})
        AND ${pendingConditions()}
    `,
  });
  return Number((result.rows[0] || {}).cnt || 0);
}

async function getPendingBatch(limit) {
  const result = await db.execute({
    sql: `
      SELECT g.slug, g.title, g.summary, g.tags, g.views
      FROM games g
      LEFT JOIN guides gd ON g.slug = gd.slug
      WHERE g.slug IN (${CANONICAL_SLUG_SQL})
        AND ${pendingConditions()}
      ORDER BY g.views DESC
      LIMIT ?
    `,
    args: [limit],
  });
  return result.rows;
}

async function main() {
  const totalPending = await getPendingCount();
  const batchLimit = config.topN > 0 ? Math.min(config.batchSize, config.topN) : config.batchSize;

  console.log(`\n============================================`);
  console.log(`[AI] 待生成攻略的文章总数: ${totalPending}`);
  console.log(`[AI] 本轮处理: ${batchLimit} 条`);
  console.log(`[AI] 强制重生成模板内容: ${config.forceRegenerate ? "是" : "否"}`);
  if (config.topN > 0) console.log(`[AI] 仅处理热度 Top ${config.topN}: 是`);
  console.log(`[AI] 预计还需: ${Math.ceil(totalPending / batchLimit)} 轮`);
  console.log(`============================================\n`);

  if (totalPending === 0) {
    console.log("[AI] ✅ 所有文章都有高质量AI攻略了！");
    return;
  }

  const pending = await getPendingBatch(batchLimit);
  console.log(`[AI] 本轮获取 ${pending.length} 条\n`);

  let success = 0;
  let failed = 0;
  let fallback = 0;

  for (let i = 0; i < pending.length; i++) {
    const row = pending[i];
    const title = (row.title || "").trim();
    const summary = (row.summary || "").trim();
    const tags = (() => {
      try { return JSON.parse(row.tags || "[]"); } catch { return []; }
    })();

    const game = { title, summary, tags };
    const globalIndex = totalPending - pending.length + i + 1;

    console.log(`[AI] [${globalIndex}/${totalPending}] ${title}`);

    let markdown = null;
    try {
      markdown = await requestAiMarkdown(game);
    } catch (err) {
      console.error(`[AI]   ↳ 网络/API 错误: ${err.message}`);
    }

    if (!markdown || markdown.length < 800) {
      console.log(`[AI]   ↳ AI 返回空/过短，使用 fallback`);
      markdown = buildFallbackContent(game);
      fallback++;
    } else {
      success++;
    }

    // Fallback content is marked with a dedicated provider so a later
    // AI_FORCE_REGENERATE=1 run can pick it up again.
    const provider = fallback > 0 ? "fallback-template" : config.aiBaseUrl;

    try {
      await db.execute({
        sql: `
          INSERT INTO guides (slug, markdown, provider, model, generated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(slug) DO UPDATE SET
            markdown = excluded.markdown,
            provider = excluded.provider,
            model = excluded.model,
            generated_at = CURRENT_TIMESTAMP
        `,
        args: [row.slug, markdown, provider, config.aiModel],
      });
      console.log(`[AI]   ↳ ✅ 已保存 (${markdown.length} 字)\n`);
    } catch (err) {
      console.error(`[AI]   ↳ ❌ DB 保存失败: ${err.message}\n`);
      failed++;
      if (markdown !== buildFallbackContent(game)) success--; else fallback--;
    }

    if (i < pending.length - 1 && config.delayMs > 0) {
      await new Promise((r) => setTimeout(r, config.delayMs));
    }
  }

  const remaining = Math.max(0, totalPending - pending.length);
  console.log(`============================================`);
  console.log(`[AI] 本轮完成: ${pending.length} 条`);
  console.log(`[AI]   AI生成: ${success} | Fallback: ${fallback} | 失败: ${failed}`);
  console.log(`[AI] 剩余未处理: ${remaining} 条`);
  if (remaining > 0) {
    console.log(`[AI] 再次运行: pnpm generate:ai`);
  } else {
    console.log(`[AI] 🎉 全部完成！`);
  }
  console.log(`============================================`);
}

main().catch(console.error);
