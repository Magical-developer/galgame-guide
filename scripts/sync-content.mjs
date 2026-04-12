import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const generatedRoot = path.join(projectRoot, "data", "generated");
const generatedContentRoot = path.join(generatedRoot, "content");

loadEnvConfig(projectRoot);

const config = {
  sourceApiUrl:
    process.env.CONTENT_SOURCE_API_URL ??
    "https://service.krzacg.com/api/posts/hot-feed",
  sourceAssetBaseUrl:
    process.env.CONTENT_SOURCE_ASSET_BASE_URL ?? "https://upload.krzacg.com",
  pageSize: Number(process.env.CONTENT_SYNC_PAGE_SIZE ?? 20),
  maxPages: Number(process.env.CONTENT_SYNC_MAX_PAGES ?? 5),
  aiBaseUrl: process.env.AI_BASE_URL ?? "",
  aiApiKey: process.env.AI_API_KEY ?? "",
  aiModel: process.env.AI_MODEL ?? "",
};

const hasAiConfig = Boolean(
  config.aiBaseUrl && config.aiApiKey && config.aiModel
);

const slugify = (value) => {
  const latin = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (latin) {
    return latin.slice(0, 72);
  }

  return `game-${crypto.createHash("sha1").update(value).digest("hex").slice(0, 10)}`;
};

const stripHtml = (value) =>
  value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractImageSources = (html) => {
  const matches = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)];
  return matches.map((match) => match[1]).filter(Boolean);
};

const withAssetPrefix = (cover) => {
  if (!cover) {
    return "";
  }

  if (cover.startsWith("http://") || cover.startsWith("https://")) {
    return cover;
  }

  return new URL(cover, `${config.sourceAssetBaseUrl}/`).toString();
};

const buildFallbackContent = (game) => `## 游戏剧情简介
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

const buildPrompt = (game) => `
请基于下面的游戏信息输出一篇中文 markdown 攻略文章，只输出正文。

标题：${game.title}
标签：${game.tags.join("、")}
简介：${game.summary}

要求：
1. 全文 800-1200 字，要求内容详尽、逻辑清晰。
2. 必须包含关键词：攻略、全CG存档、汉化补丁、全结局路线、真结局条件、分歧选项。
3. 只能输出 markdown 正文，严禁出现“由于是在 Vercel 上部署”或“开发者自白”等口水话。
4. 严格包含这些二级标题：
## 游戏剧情简介
## 核心推荐理由
## 完美攻略全流程
## 全CG与回想场景解锁
## 存档管理与安装说明
## 常见问题 FAQ
## 类似题材作品推荐
`;

async function requestAiMarkdown(game) {
  if (!hasAiConfig) {
    return buildFallbackContent(game);
  }

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
          content: "你是一名资深 Galgame 攻略编辑。你编写的内容是技术性的游戏指南，侧重于系统逻辑、路线分歧、存档路径和全CG收集，严禁使用过于露骨的淫秽词语，以确保内容在不触发模型审核的前提下，让老玩家能秒懂。",
        },
        {
          role: "user",
          content: buildPrompt(game),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI request failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("AI response did not include markdown content.");
  }

  return content;
}

async function fetchSourcePosts() {
  const items = [];

  for (let page = 1; page <= config.maxPages; page += 1) {
    const url = new URL(config.sourceApiUrl);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(config.pageSize));
    url.searchParams.set("sort", "views");

    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        Referer: "https://www.krzacg.com/",
        Origin: "https://www.krzacg.com",
      },
    });

    if (!response.ok) {
      throw new Error(`Source API failed: ${response.status} ${await response.text()}`);
    }

    const payload = await response.json();
    const batch = Array.isArray(payload?.data) ? payload.data : [];

    if (batch.length === 0) {
      break;
    }

    items.push(...batch);
  }

  return items;
}

const cleanTitle = (value) => {
  // 移除 【...】 和 [...] 及其内容
  let clean = value.replace(/[\u3010\u3011]|\[.*?\]/g, " ").trim();
  
  // 移除版本号 (v0.x, Ver.x, v2.x)
  clean = clean.replace(/[vV](er\.?\s?)?\d+(\.\d+)*/g, " ");
  
  // 移除度盘、网盘、解压、大小、GB、G、MB、M、PC、安卓、中文、官中、汉化、新作、个人等信息
  clean = clean.replace(/(度盘|网盘|解压|大小|GB|G|MB|M|PC|安卓|中文|官中|汉化|新作|个人|新作).*$/gi, " ");
  
  // 移除多余的斜杠、短横线和空白
  clean = clean.replace(/\/+/g, " ").replace(/-+/g, " ").replace(/\s+/g, " ").trim();

  // 如果清洗后太短，回退到原标题的前部分
  if (clean.length < 2) return value.split(" ")[0];

  return clean;
};

function normalizePost(post) {
  const tags = Array.isArray(post.tags)
    ? post.tags.map((tag) => tag.name).filter(Boolean)
    : [];
  const tagLabel = tags.slice(0, 3).join("、");
  const cleanedTitle = cleanTitle(post.title);
  
  // 为摘要和标题注入 SEO 词汇
  const seoTitle = `${cleanedTitle} 攻略解析 | 全结局路线 | 全CG回想解锁`;
  const summary = tagLabel
    ? `${cleanedTitle} 专业的绅士游戏攻略与绅游推荐，包含 ${tagLabel} 核心解析、全结局达成条件及完美存档说明。`
    : `${cleanedTitle} 深度攻略与绅士游戏指南，提供全结局路线、回想场景解锁及存档路径解析。`;

  const resource = Array.isArray(post.resources) ? post.resources[0] : undefined;
  const contentImages = extractImageSources(post.content);
  const coverCandidate = contentImages[0] ?? post.cover;

  const game = {
    sourceId: post._id,
    slug: slugify(post.title),
    title: seoTitle,
    tags,
    summary,
    cover: withAssetPrefix(coverCandidate),
    download: resource?.url ?? "",
    downloadLabel: resource?.platform ?? post.download_platforms?.[0] ?? "资源链接",
    views: Number(post.views ?? 0),
    createdAt: post.created_at,
    updatedAt: post.updated_at,
  };

  return {
    ...game,
    sourceHash: crypto
      .createHash("sha1")
      .update([game.sourceId, game.updatedAt].join("|"))
      .digest("hex"),
  };
}

async function readExistingGuide(slug) {
  try {
    const payload = await readFile(
      path.join(generatedContentRoot, `${slug}.json`),
      "utf8"
    );
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

async function ensureDirectories() {
  await mkdir(generatedRoot, { recursive: true });
  await mkdir(generatedContentRoot, { recursive: true });
}

async function readExistingGames() {
  try {
    const payload = await readFile(path.join(generatedRoot, "games.json"), "utf8");
    return JSON.parse(payload);
  } catch {
    return [];
  }
}

async function main() {
  await ensureDirectories();

  let posts;
  try {
    posts = await fetchSourcePosts();
  } catch (error) {
    console.warn(`Source API unavailable, keeping existing data. Error: ${error.message}`);
    const existingGames = await readExistingGames();
    if (existingGames.length === 0) {
      console.error("No existing games data and source API failed. Build may produce empty site.");
      process.exitCode = 1;
    } else {
      console.log(`Using ${existingGames.length} cached game records from previous sync.`);
    }
    return;
  }

  const games = posts.map(normalizePost);

  for (const game of games) {
    const existingGuide = await readExistingGuide(game.slug);

    if (existingGuide?.sourceHash === game.sourceHash) {
      continue;
    }

    let markdown;
    try {
      markdown = await requestAiMarkdown(game);
    } catch (error) {
      console.warn(`AI generation failed for "${game.title}", using fallback. Error: ${error.message}`);
      markdown = buildFallbackContent(game);
    }

    const guideDocument = {
      slug: game.slug,
      title: game.title,
      markdown,
      generatedAt: new Date().toISOString(),
      sourceHash: game.sourceHash,
      provider: hasAiConfig ? config.aiBaseUrl : "local-fallback",
      model: hasAiConfig ? config.aiModel : "fallback-template",
    };

    await writeFile(
      path.join(generatedContentRoot, `${game.slug}.json`),
      `${JSON.stringify(guideDocument, null, 2)}\n`
    );
  }

  await writeFile(
    path.join(generatedRoot, "games.json"),
    `${JSON.stringify(games, null, 2)}\n`
  );

  console.log(`Synced ${games.length} game records.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
