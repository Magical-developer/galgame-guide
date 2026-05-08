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

【必须包含的章节 - 每章都要详细展开】

## 游戏剧情简介
根据标题和标签推测游戏背景设定。写出具体的世界观、主角设定、核心冲突。不要一两句带过。

## 核心推荐理由
为什么值得玩？从画风、声优、系统、剧情深度、特殊机制等维度分析。结合标签说明卖点。

## 角色路线与分歧选项
详细说明关键分歧点：第几个选项开始分线、哪些选项影响好感度、如何避免BE、各角色路线解锁条件。

## 完美攻略全流程
按周目给出具体建议：一周目做什么、二周目做什么、哪几个节点必须存档。给出5-8个关键选项的推荐选择。

## 全CG与回想场景解锁
说明回想/图鉴的开启条件：是否需要通关全线、是否有隐藏回想、是否需要特定补丁或DLC。

## 存档管理与安装说明
存档位置（Windows常见路径）、不同版本存档兼容性、云存档是否支持、汉化版存档注意事项。

## 常见问题 FAQ
写4-6个三级标题FAQ，每个问题回答2-3句话。问题要具体，比如"官中版和个人汉化版有什么区别？"、"存档消失了怎么办？"

## 类似题材作品推荐
基于标签推荐2-3部同类佳作，简要说明为什么同好会喜欢。
`;

const buildFallbackContent = (game) =>
  `## 游戏剧情简介\n${game.title} 是一款以${game.tags.slice(0, 3).join("、")}为核心元素的视觉小说。本作在剧情编排与角色塑造上均有独到之处，适合喜欢该类型作品的玩家深入体验。\n\n## 核心推荐理由\n如果你偏好${game.tags.slice(0, 2).join("、")}题材，那么${game.title}绝对值得加入你的待玩清单。\n\n## 角色路线与分歧选项\n建议在关键选项前保留独立存档，优先推进主线以确认各角色路线开启条件。\n\n## 完美攻略全流程\n一周目建议体验共通线，二周目起开始回收各角色结局。关键分歧点通常在第3-5个选项处出现。\n\n## 全CG与回想场景解锁\n本作的全CG解锁依赖于全结局达成。部分特殊回想可能需要通关全线后开启。\n\n## 存档管理与安装说明\nPC版存档通常位于用户文档目录下的游戏厂商文件夹内。使用汉化版时请注意备份原始存档。\n\n## 常见问题 FAQ\n### 如何快速达成真结局？\n确保所有前置事件均已触发，并参考路线分歧指南选择正确选项。\n\n## 类似题材作品推荐\n如果你喜欢本作的画风与剧情逻辑，可以继续探索带有${game.tags.slice(0, 2).join("、")}标签的同类作品。`;

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

async function getPendingCount() {
  const result = await db.execute({
    sql: `
      SELECT COUNT(*) AS cnt FROM games g
      LEFT JOIN guides gd ON g.slug = gd.slug
      WHERE gd.slug IS NULL
         OR gd.markdown IS NULL
         OR LENGTH(TRIM(gd.markdown)) < 500
         OR gd.provider IN ('pending', 'local-import', '')
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
      WHERE gd.slug IS NULL
         OR gd.markdown IS NULL
         OR LENGTH(TRIM(gd.markdown)) < 500
         OR gd.provider IN ('pending', 'local-import', '')
      ORDER BY g.views DESC
      LIMIT ?
    `,
    args: [limit],
  });
  return result.rows;
}

async function main() {
  const totalPending = await getPendingCount();
  console.log(`\n============================================`);
  console.log(`[AI] 待生成攻略的文章总数: ${totalPending}`);
  console.log(`[AI] 本轮处理: ${config.batchSize} 条`);
  console.log(`[AI] 预计还需: ${Math.ceil(totalPending / config.batchSize)} 轮`);
  console.log(`============================================\n`);

  if (totalPending === 0) {
    console.log("[AI] ✅ 所有文章都有高质量AI攻略了！");
    return;
  }

  const pending = await getPendingBatch(config.batchSize);
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
        args: [row.slug, markdown, config.aiBaseUrl, config.aiModel],
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
