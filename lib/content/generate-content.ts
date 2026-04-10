import { siteConfig } from "@/lib/config";
import { buildGuidePrompt } from "@/lib/content/prompt";
import { requestAiMarkdown } from "@/lib/content/ai-client";
import type { GameRecord } from "@/lib/types/game";

const ensureSections = (markdown: string, game: GameRecord) => {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();

  if (normalized.includes("## 游戏简介") && normalized.includes("## FAQ")) {
    return normalized;
  }

  return generateFallbackContent(game);
};

export const generateFallbackContent = (game: GameRecord) => `## 游戏简介
${game.title} 是一部偏向 ${game.tags.slice(0, 3).join("、")} 标签的作品，适合想先弄清剧情重点、分支条件和资源入口的玩家。如果你是第一次接触这类作品，先把作品调性、主要路线和常见疑问看一遍，后面游玩时会更省时间。

## 推荐理由
这类作品的看点通常不只在剧情本身，还包括分支路线、角色事件和回收内容。先把关键节点、存档位置和补图思路整理清楚，能少走很多重复流程，也更方便判断这款游戏是不是你想继续玩的类型。

## 攻略要点
- 优先阅读开场设定和人物关系，先确认主要分支触发点。
- 涉及选项分歧时，建议在进入关键剧情前保留独立存档，避免反复重打。
- 如果你是冲着结局或全CG 来的，推荐以“主线推进 -> 分支回收 -> 事件补漏”的顺序整理路线。
- 遇到文本量较大的段落时，先记录角色事件触发条件，后续补档效率会更高。

## CG解锁说明
全CG 的核心通常集中在角色路线完成度、关键事件是否触发，以及是否进入特定结局。建议至少保留“主线前期 / 分支前 / 结局前”三组存档，这样在回收 CG 时能明显减少重复流程。若作品带有回想房或场景回顾功能，也可以先确认是否需要通关后才完整开放。

## 存档说明
推荐使用多栏位存档策略：公共线结束前保留 1 个总存档，角色分歧处分别留 1-2 个分支存档，结局前再追加 1 个安全存档。这样处理后，无论你是想补全结局还是回收缺失 CG，都能在最少重打成本下完成。

## FAQ
### 这款游戏适合什么类型玩家？
如果你偏好 ${game.tags.slice(0, 2).join("、")} 题材，又想先看清攻略重点、全CG 回收难度和存档安排，这类作品会比较对胃口。

### 需要一周目就打全吗？
通常不需要。更稳妥的方式是先正常推进主线，再利用分支存档回收结局和 CG。

### 下载前最值得确认什么？
建议先看资源平台、解压说明、语言版本和作品标签，确认是否符合你的设备和口味。

## 类似游戏推荐
如果你喜欢 ${game.title} 这类作品，后续可以优先查看同标签游戏，尤其是共享 ${game.tags.slice(0, 3).join("、")} 特征的作品。顺着这些相近题材继续看，通常更容易找到口味接近的下一部。`;

export async function generateContent(game: GameRecord) {
  const prompt = buildGuidePrompt(game);
  const markdown = await requestAiMarkdown(prompt);
  return ensureSections(markdown, game);
}

export const buildGuideMetadata = () => ({
  provider: siteConfig.aiBaseUrl || "local-fallback",
  model: siteConfig.aiModel || "fallback-template",
});
