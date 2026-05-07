import crypto from "node:crypto";
import nextEnv from "@next/env";
import { createClient } from "@libsql/client";

const { loadEnvConfig } = nextEnv;
const projectRoot = process.cwd();
loadEnvConfig(projectRoot);

const config = {
  aiBaseUrl: process.env.AI_BASE_URL ?? "",
  aiApiKey: process.env.AI_API_KEY ?? "",
  aiModel: process.env.AI_MODEL ?? "",
  dbUrl: process.env.TURSO_DATABASE_URL,
  dbToken: process.env.TURSO_AUTH_TOKEN,
  batchSize: Number(process.env.AI_BATCH_SIZE ?? 10),
};

if (!config.dbUrl || !config.aiBaseUrl || !config.aiApiKey || !config.aiModel) {
  console.error("[AI] Missing required env vars: TURSO_DATABASE_URL, AI_BASE_URL, AI_API_KEY, AI_MODEL");
  process.exit(1);
}

const db = createClient({
  url: config.dbUrl,
  authToken: config.dbToken,
});

const buildPrompt = (game) => `
你是一名资深视觉小说（Visual Novel）与绅士游戏攻略索引编辑，你所在的项目叫"次元绅士指南"，你的职责是根据提供的游戏基础信息，输出一篇专业、硬核且对搜索引擎优化（SEO）友好的中文攻略指南。

【游戏基础信息】
标题：${game.title}
标签：${game.tags.join("、")}
原始简介：${game.summary}

【内容要求】
1. **风格定位**：文字要专业、懂行。禁止出现"开发者自白"、"项目说明"或"由于是部署在Vercel..."等废话。
2. **详细程度**：全文控制在 800-1200 字之间。
3. **SEO 关键词**：绅游推荐、Galgame攻略教程、绅士游戏全CG存档、汉化补丁下载说明、完美全结局路线、真结局达成条件、回想内容解锁、存档路径说明、分歧选项。
4. **合规提示**：使用"回想场景"、"特殊事件"、"动态CG"、"解锁特定路线"等行业术语，严禁露骨淫秽词语。
5. **格式规范**：只能输出 Markdown 格式的正文内容。

【必须包含的二级标题】
## 游戏剧情简介
## 核心推荐理由
## 完美攻略全流程
## 全CG与回想场景解锁
## 存档管理与安装说明
## 常见问题 FAQ
## 类似题材作品推荐
`;

const buildFallbackContent = (game) => `## 游戏剧情简介
${game.title} 是一款深度融合了 ${game.tags.join("、")} 元素的精品作。本作以其独特的叙事风格和精美的原画设计，在视觉小说领域获得了极高的关注度。

## 核心推荐理由
如果你偏好 ${game.tags.slice(0, 2).join("、")} 题材，那么本作绝对是不容错过的佳作。

## 完美攻略全流程
建议在进入分歧点前保留独立存档。优先推进主线剧情，确认核心女主角的情感倾向。

## 全CG与回想场景解锁
本作的全CG 解锁主要依赖于全结局的达成。建议玩家在完成一周目后，利用快进功能回收剩余的分支场景。

## 常见问题 FAQ
### 如何快速达成真结局？
建议参考本站整理的完美路线图，确保所有前置事件均已正确触发。

## 类似题材作品推荐
如果你喜欢本作的画风，可以继续探索同类带有 ${game.tags.slice(0, 2).join("、")} 标签的作品。`;

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
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: "你是一名资深 Galgame 攻略编辑。你编写的内容是技术性的游戏指南，侧重于系统逻辑、路线分歧、存档路径和全CG收集，严禁使用过于露骨的淫秽词语。",
        },
        {
          role: "user",
          content: buildPrompt(game),
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error(`[AI] API error for "${game.title}": ${response.status}`);
    return null;
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content?.trim();
  return content || null;
}

async function main() {
  // Find guides that don't have AI-generated content yet
  const result = await db.execute({
    sql: `
      SELECT g.slug, g.title, g.summary, g.tags
      FROM games g
      LEFT JOIN guides gd ON g.slug = gd.slug
      WHERE gd.slug IS NULL 
         OR gd.provider IS NULL 
         OR gd.provider = '' 
         OR gd.provider = 'local-import'
         OR gd.markdown IS NULL
         OR LENGTH(gd.markdown) < 200
      LIMIT ?
    `,
    args: [config.batchSize],
  });

  const pending = result.rows;
  console.log(`[AI] Found ${pending.length} guides needing AI generation (limit=${config.batchSize}).`);

  if (pending.length === 0) {
    console.log("[AI] All guides are already AI-generated. Nothing to do.");
    return;
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i++) {
    const row = pending[i];
    const game = {
      title: row.title,
      summary: row.summary || row.title,
      tags: JSON.parse(row.tags || "[]"),
    };

    console.log(`[AI] [${i + 1}/${pending.length}] Generating for "${game.title}"...`);

    try {
      const markdown = await requestAiMarkdown(game);
      if (!markdown) {
        console.log(`[AI] ⚠️ Empty response for "${game.title}", skipping.`);
        failed++;
        continue;
      }

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

      console.log(`[AI] ✅ Saved AI guide for "${game.title}"`);
      success++;

      // Small delay to avoid rate limiting
      if (i < pending.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (err) {
      console.error(`[AI] ❌ Failed for "${game.title}":`, err.message);
      failed++;
    }
  }

  console.log(`\n[AI] Batch complete. Success: ${success}, Failed: ${failed}`);
}

main().catch(console.error);
