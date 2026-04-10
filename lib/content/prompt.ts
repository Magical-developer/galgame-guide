import type { GameRecord } from "@/lib/types/game";

export const buildGuidePrompt = (game: GameRecord) => `
你是一名资深 Galgame / 黄油攻略编辑，请围绕下面这款游戏输出一篇自然、好读、像真实攻略站正文的中文 markdown 攻略文章。

游戏标题：${game.title}
标签：${game.tags.join("、")}
简介：${game.summary}

输出要求：
1. 全文 500-1000 字。
2. 必须自然包含这些关键词：攻略、全CG、存档、结局。
3. 只能输出 markdown 正文，不要输出额外解释。
4. 严格使用下面这些二级标题：

## 游戏简介
## 推荐理由
## 攻略要点
## CG解锁说明
## 存档说明
## FAQ
## 类似游戏推荐

5. FAQ 小节内请使用三级标题表示问题，例如：
### 这款游戏有官中吗？
随后用一段话回答。
6. 内容风格要像成熟攻略站编辑写的导读，不能出现站长旁白、项目说明、运营说明或开发日志语气。
`;
