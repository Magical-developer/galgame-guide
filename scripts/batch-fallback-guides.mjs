import nextEnv from "@next/env";
import { createClient } from "@libsql/client";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const config = {
  dbUrl: process.env.TURSO_DATABASE_URL,
  dbToken: process.env.TURSO_AUTH_TOKEN,
};

if (!config.dbUrl) {
  console.error("[Fallback] TURSO_DATABASE_URL is not set.");
  process.exit(1);
}

const db = createClient({ url: config.dbUrl, authToken: config.dbToken });

const buildFallback = (game) => {
  const tags = Array.isArray(game.tags) ? game.tags : [];
  const tagStr = tags.slice(0, 4).join("、") || "视觉小说";
  const tagPair = tags.slice(0, 2).join("、") || "Galgame";

  return `## 游戏剧情简介

${game.title} 是一款融合了 ${tagStr} 元素的视觉小说（Visual Novel）作品。本作在剧情编排、角色塑造以及画面表现上均有出色的发挥，为玩家呈现了一个充满张力的叙事世界。

${game.summary ? game.summary.slice(0, 300) : ""}

游戏整体节奏把控得当，前期铺垫与后期高潮之间的衔接流畅自然。对于喜欢 ${tagPair} 类型作品的玩家来说，本作的剧情深度和情感表达都达到了同类作品中的上乘水准。

## 核心推荐理由

**题材契合度高**：本作在 ${tagStr} 等核心元素的处理上非常成熟，剧情分支设计合理，不同路线的情感冲击力各有千秋。

**系统体验优秀**：游戏内置了完善的存档管理系统和回想模式，方便玩家在多条路线之间自由切换，无需重复体验共通线内容。

**制作水准精良**：从原画质量到配音演出，再到背景音乐的氛围营造，本作在制作层面展现了相当高的完成度，能够给玩家带来沉浸式的游玩体验。

**攻略价值突出**：本作的关键分歧点较为隐蔽，部分选项对结局走向的影响并不直观，因此参考攻略可以大幅降低重复游玩的成本，提升全收集效率。

## 角色路线与分歧选项

本作采用经典的多线分支结构，玩家在游戏过程中会遇到若干关键选项，这些选项将直接影响角色好感度的走向以及最终解锁的结局类型。

**关键分歧点提示**：

- 建议在第 3-5 个剧情选项处保留独立存档，此处通常是角色路线的第一个重要分岔口
- 部分角色的专属路线需要满足特定前置条件才能开启，建议优先完成共通线后再回头回收
- 如果某个选项看似无关紧要，实则可能悄悄影响好感度计量，建议养成每个选项前存档的习惯

**路线解锁顺序建议**：

1. **一周目**：体验共通线主线剧情，熟悉世界观和主要角色关系
2. **二周目起**：根据攻略提示选择特定角色的倾向选项，逐步解锁各角色个人结局
3. **最终周目**：回收隐藏结局或真结局，此时通常已经解锁了快速跳过已读文本的功能

## 完美攻略全流程

### 共通线要点

- 在前几个自由行动环节中，尽量平均分配与各角色的互动次数，避免因过早锁定某条路线而错过其他角色的关键事件
- 注意收集场景中的隐藏线索，部分信息会在后续周目中解锁新的对话选项

### 分歧点存档策略

- **存档点 A**：第一个重要选项前（通常是标题画面后 20-30 分钟处）
- **存档点 B**：角色路线分岔口（根据选择进入不同角色专属章节）
- **存档点 C**：各角色路线的最终章节前（用于回收 Good End / Bad End）

### 结局回收顺序

建议按照 "普通结局 → 角色 Good End → 隐藏结局 → 真结局" 的顺序进行回收。部分真结局的解锁条件较为苛刻，可能需要通关全部角色的 Good End 后才能开启。

## 全 CG 与回想场景解锁

本作的全 CG 收集与回想场景解锁主要依赖于以下条件的达成：

- **通关全结局**：包括所有角色的 Good End 和至少一个 Bad End
- **特定事件触发**：部分回想需要在特定路线中选择特定选项才能解锁
- **多周目继承**：通关后通常会解锁快速跳过和章节选择功能，方便回收遗漏内容

**回想模式说明**：

进入回想模式后，已解锁的场景会以列表形式呈现，未解锁的场景显示为锁定状态并附有解锁条件的模糊提示。建议参考本站的详细攻略来确认每个回想的具体触发条件。

## 存档管理与安装说明

### 存档位置（Windows 常见路径）

- 默认存档通常位于：\`C:\\\\Users\\\\[用户名]\\\\AppData\\\\Roaming\\\\[厂商名]\\\\[游戏名]\\\\\`
- 部分游戏使用注册表或特定目录存储存档，安装时请注意汉化补丁的说明文档

### 版本兼容性

- 官方中文版与个人汉化版的存档通常不互通，切换版本前务必备份存档文件
- 如果游戏使用了云存档功能（如 Steam 云），请注意本地存档与云端存档的同步冲突

### 安装注意事项

- 安装路径中**不要包含中文字符**，否则可能导致游戏无法正常运行或存档读写失败
- 部分汉化补丁需要覆盖原始游戏文件，建议先完整备份原始安装目录
- 如遇到黑屏或闪退，尝试以兼容模式运行或更新显卡驱动

## 常见问题 FAQ

### 这款游戏有官方中文吗？

目前市面上的流通版本多为精修汉化版。建议关注官方社交媒体或汉化组的公告，以获取最新的本地化进度信息。

### 为什么我的存档突然消失了？

最常见的原因是存档路径中包含中文或特殊字符，导致游戏无法正常读写存档文件。此外，云存档同步冲突也可能导致本地存档被覆盖。建议定期检查存档文件的备份状态。

### 如何快速达成真结局？

真结局通常需要满足多项前置条件，包括通关特定角色的路线、在关键选项中做出正确选择等。建议参考本站的完美路线攻略，按照推荐的顺序进行游玩，可以最高效地解锁真结局。

### 某些回想场景一直解锁不了怎么办？

回想解锁失败通常是因为遗漏了某个前置事件。建议对照回想列表中的提示信息，检查是否跳过了某个看似无关紧要的选项或场景。部分隐藏回想需要特定的多周目条件才能触发。

## 类似题材作品推荐

如果你喜欢 ${game.title} 所呈现的 ${tagPair} 风格，以下几部同类佳作也值得关注：

- **同类型高人气作品**：带有 ${tags[0] || "剧情向"} 标签的热门 Galgame，通常在叙事深度和角色刻画上有相似的表现力
- **同画师/同会社作品**：关注本作的原画师或开发商，他们的其他作品往往在画风和氛围上有高度的一致性
- **题材扩展作品**：尝试带有 ${tags[2] || tags[0] || "剧情互动"} 元素的相关作品，可以拓展你对这一题材的认知边界
`;
};

async function main() {
  const result = await db.execute(`
    SELECT g.slug, g.title, g.summary, g.tags, g.views
    FROM games g
    LEFT JOIN guides gd ON g.slug = gd.slug
    WHERE gd.slug IS NULL
       OR gd.markdown IS NULL
       OR LENGTH(TRIM(gd.markdown)) < 200
    ORDER BY g.views DESC
  `);

  const pending = result.rows;
  console.log(`[Fallback] Found ${pending.length} games without guides.\n`);

  if (pending.length === 0) {
    console.log("[Fallback] All games already have guides. Nothing to do.");
    return;
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i++) {
    const row = pending[i];
    const title = (row.title || "").trim();
    const tags = (() => {
      try { return JSON.parse(row.tags || "[]"); } catch { return []; }
    })();

    const game = {
      title,
      summary: row.summary || "",
      tags,
    };

    const markdown = buildFallback(game);

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
        args: [row.slug, markdown, "fallback-batch", "rich-template"],
      });
      success++;
      console.log(`[Fallback] [${i + 1}/${pending.length}] ✅ ${title.slice(0, 50)} (${markdown.length} chars)`);
    } catch (err) {
      failed++;
      console.error(`[Fallback] [${i + 1}/${pending.length}] ❌ ${title.slice(0, 50)}: ${err.message}`);
    }
  }

  console.log(`\n[Fallback] Done. Success: ${success} | Failed: ${failed}`);
}

main().catch(console.error);
