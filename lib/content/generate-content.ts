import { siteConfig } from "@/lib/config";
import { buildGuidePrompt } from "@/lib/content/prompt";
import { requestAiMarkdown } from "@/lib/content/ai-client";
import type { GameRecord } from "@/lib/types/game";

const ensureSections = (markdown: string, game: GameRecord) => {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();

  if (normalized.includes("## 游戏剧情简介") && normalized.includes("## 常见问题 FAQ")) {
    return normalized;
  }

  return generateFallbackContent(game);
};

export const generateFallbackContent = (game: GameRecord) => `## 游戏剧情简介
${game.title} 是一款深度融合了 ${game.tags.slice(0, 3).join("、")} 元素的 Galgame 新作。本作以其独特的叙事风格和精美的原画设计，在视觉小说领域获得了极高的关注度。

## 核心推荐理由
如果你偏好 ${game.tags.slice(0, 2).join("、")} 题材，那么 ${game.title} 绝对是不容错过的佳作。本作不仅在剧情分支设计上极其考究，更在角色情感刻画与事件连锁机制上达到了行业顶尖水平。

## 完美攻略全流程
- **共通线要点**：在进入角色分歧点前，建议在第 3-5 个关键选项处保留独立存档。
- **路线切分**：优先推进主线剧情，确认核心女主角的情感倾向。
- **结局达成**：注意关键选项对好感度的影响，避免因单一选项失误进入 Bad End。

## 全CG与回想场景解锁
本作的全CG 解锁主要依赖于全结局的达成。建议玩家在完成一周目后，利用快进功能回收剩余的分支场景。部分动态 CG 可能需要特定的汉化補丁或解码补丁支持方能完整呈现。

## 存档管理与安装说明
推荐采用多栏位存档策略：公共线结束前保留 1 个全局存档，各角色分歧处分别留 1-2 个独立存档。对于非官方版本的汉化游戏，请务必确认存档路径是否包含中文字符，以免造成数据损坏。

## 常见问题 FAQ
### 这款游戏是否有官方中文？
请关注官方公告或汉化组动态。目前市面上流通的多为精修汉化版或 AI 润色版。

### 如何快速达成真结局？
建议参考本站整理的完美路线图，确保所有前置事件均已正确触发。

## 类似题材作品推荐
如果你喜欢 ${game.title} 的画风或剧情逻辑，可以优先查阅带有 ${game.tags.slice(0, 2).join("、")} 标签的其他作品，这些同类佳作往往有着极高的重合度。`;

export async function generateContent(game: GameRecord) {
  const prompt = buildGuidePrompt(game);
  const markdown = await requestAiMarkdown(prompt);
  return ensureSections(markdown, game);
}

export const buildGuideMetadata = () => ({
  provider: siteConfig.aiBaseUrl || "local-fallback",
  model: siteConfig.aiModel || "fallback-template",
});
