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
  batchSize: Math.max(1, Number(process.env.AI_BATCH_SIZE ?? 10)),
  delayMs: Math.max(0, Number(process.env.AI_DELAY_MS ?? 800)),
};

if (!config.dbUrl || !config.aiBaseUrl || !config.aiApiKey || !config.aiModel) {
  console.error("[AI] Missing env vars: TURSO_DATABASE_URL, AI_BASE_URL, AI_API_KEY, AI_MODEL");
  process.exit(1);
}

const db = createClient({ url: config.dbUrl, authToken: config.dbToken });

// Strip the old SEO suffix that was hard-coded by previous sync scripts
const cleanGameTitle = (rawTitle) => {
  if (!rawTitle) return "";
  const suffix = " 攻略解析 | 全结局路线 | 全CG回想解锁";
  if (rawTitle.endsWith(suffix)) {
    return rawTitle.slice(0, -suffix.length).trim();
  }
  return rawTitle.trim();
};

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

const buildFallbackContent = (game) =>
  `## 游戏剧情简介\n${game.title} 是一款深度融合了 ${game.tags.join("、")} 元素的精品作。本作以其独特的叙事风格和精美的原画设计，在视觉小说领域获得了极高的关注度。\n\n## 核心推荐理由\n如果你偏好 ${game.tags.slice(0, 2).join("、")} 题材，那么本作绝对是不容错过的佳作。\n\n## 完美攻略全流程\n建议在进入分歧点前保留独立存档。优先推进主线剧情，确认核心女主角的情感倾向。\n\n## 全CG与回想场景解锁\n本作的全CG 解锁主要依赖于全结局的达成。建议玩家在完成一周目后，利用快进功能回收剩余的分支场景。\n\n## 存档管理与安装说明\n推荐采用多栏位存档策略：公共线结束前保留 1 个全局存档，各角色分歧处分别留 1-2 个独立存档。\n\n## 常见问题 FAQ\n### 这款游戏是否有官方中文？\n请关注官方公告或汉化组动态。\n\n### 如何快速达成真结局？\n建议参考本站整理的完美路线图，确保所有前置事件均已正确触发。\n\n## 类似题材作品推荐\n如果你喜欢本作的画风，可以继续探索同类带有 ${game.tags.slice(0, 2).join("、")} 标签的作品。`;

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
          content:
            "你是一名资深 Galgame 攻略编辑。你编写的内容是技术性的游戏指南，侧重于系统逻辑、路线分歧、存档路径和全CG收集，严禁使用过于露骨的淫秽词语。",
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
      SELECT COUNT(*) AS cnt
      FROM games g
      LEFT JOIN guides gd ON g.slug = gd.slug
      WHERE gd.slug IS NULL
         OR gd.provider IS NULL
         OR gd.provider = ''
         OR gd.provider = 'local-import'
         OR gd.markdown IS NULL
         OR LENGTH(gd.markdown) < 200
    `,
  });
  return Number((result.rows[0] || {}).cnt || 0);
}

async function getPendingBatch(limit) {
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
      ORDER BY g.views DESC
      LIMIT ?
    `,
    args: [limit],
  });
  return result.rows;
}

async function main() {
  const totalPending = await getPendingCount();
  console.log(`\n[AI] ========================================`);
  console.log(`[AI] 待生成 AI 攻略的文章总数: ${totalPending}`);
  console.log(`[AI] 每批处理: ${config.batchSize} 条`);
  console.log(`[AI] 预计还需: ${Math.ceil(totalPending / config.batchSize)} 轮`);
  console.log(`[AI] ========================================\n`);

  if (totalPending === 0) {
    console.log("[AI] ✅ 所有文章都已经有 AI 攻略了，无需处理。");
    return;
  }

  const pending = await getPendingBatch(config.batchSize);
  console.log(`[AI] 本轮处理 ${pending.length} 条\n`);

  let success = 0;
  let failed = 0;
  let fallback = 0;

  for (let i = 0; i < pending.length; i++) {
    const row = pending[i];
    const rawTitle = row.title || "";
    const title = cleanGameTitle(rawTitle);
    const summary = row.summary || rawTitle;
    const tags = (() => {
      try {
        return JSON.parse(row.tags || "[]");
      } catch {
        return [];
      }
    })();

    const game = { title, summary, tags };
    const globalIndex = totalPending - pending.length + i + 1;

    // 日志显示原始标题（summary = 主站原始标题），方便辨认
    const displayTitle = summary || title || "未知";
    console.log(`[AI] [${globalIndex}/${totalPending}] ${displayTitle}`);

    let markdown = null;
    try {
      markdown = await requestAiMarkdown(game);
    } catch (err) {
      console.error(`[AI]   ↳ 网络/API 错误: ${err.message}`);
    }

    // If AI failed or returned empty, use fallback so page is never blank
    if (!markdown || markdown.length < 200) {
      console.log(`[AI]   ↳ AI 生成失败/内容过短，使用 fallback 模板`);
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
      console.log(`[AI]   ↳ ✅ 已保存\n`);
    } catch (err) {
      console.error(`[AI]   ↳ ❌ 数据库保存失败: ${err.message}\n`);
      failed++;
      if (markdown !== buildFallbackContent(game)) {
        success--;
      } else {
        fallback--;
      }
    }

    if (i < pending.length - 1 && config.delayMs > 0) {
      await new Promise((r) => setTimeout(r, config.delayMs));
    }
  }

  const remaining = totalPending - pending.length;
  console.log(`[AI] ========================================`);
  console.log(`[AI] 本轮完成: ${pending.length} 条`);
  console.log(`[AI]   AI 生成: ${success} | Fallback: ${fallback} | 失败: ${failed}`);
  console.log(`[AI] 剩余未处理: ${remaining} 条`);
  if (remaining > 0) {
    console.log(`[AI] 请再次运行: pnpm generate:ai`);
  } else {
    console.log(`[AI] ✅ 全部完成！`);
  }
  console.log(`[AI] ========================================`);
}

main().catch(console.error);
