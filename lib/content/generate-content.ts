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

export const generateFallbackContent = (game: GameRecord) => {
  const tagList = game.tags.slice(0, 4).join("、") || "视觉小说";
  const summary = (game.summary || "").trim();
  const summaryExcerpt = summary.length > 260 ? `${summary.slice(0, 260)}……` : summary;
  const isSteam = /steam/i.test(game.title);

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
${isSteam ? "本作为 STEAM 平台版本，注意云存档与本地存档的同步关系，切换设备时建议手动备份存档文件。" : "本作为独立/汉化发行版本，注意保留原始文件备份，避免汉化补丁覆盖导致存档读写异常。"}

## 常见问题 FAQ
### ${game.title} 属于什么类型的游戏？
本作以${tagList}为核心要素，具体玩法与流程待本站完成深度解析后补充。

### 这款游戏的汉化版本情况如何？
流通版本信息请以发布页说明为准，本站解析完成后会补充汉化组与版本兼容性详情。

## 类似题材作品推荐
如果你喜欢本作的题材设定，可以继续探索带有${tagList}标签的同类作品，本站归档页已按热度与更新时间整理相关索引。`;
};

export async function generateContent(game: GameRecord) {
  const prompt = buildGuidePrompt(game);
  const markdown = await requestAiMarkdown(prompt);
  return ensureSections(markdown, game);
}

export const buildGuideMetadata = () => ({
  provider: siteConfig.aiBaseUrl || "local-fallback",
  model: siteConfig.aiModel || "fallback-template",
});
