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
  pageSize: Number(process.env.CONTENT_SYNC_PAGE_SIZE ?? 10),
  maxPages: Number(process.env.CONTENT_SYNC_MAX_PAGES ?? 3),
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

const buildFallbackContent = (game) => `## 游戏简介
${game.title} 是一部带有 ${game.tags.slice(0, 3).join("、")} 标签特征的作品。玩家在开始前通常最关心的，就是路线重点、全CG 回收、存档安排和资源入口，所以先把这些常见信息整理清楚，会更方便后续游玩时对照查看。

## 推荐理由
这类作品往往不只是看剧情简介就够了，很多人还会顺手确认下载方式、分支难点、FAQ 和结局条件。把这些内容集中放在一起，阅读起来会更顺，也更容易在开玩前先有个整体印象。

## 攻略要点
- 先确认主要分支与角色事件触发点。
- 在进入关键剧情前保留独立存档。
- 先推主线，再补结局和全CG，回收效率更高。
- 对文本量大的路线，建议手动记录分支节点。

## CG解锁说明
全CG 回收通常和分支选择、关键事件是否触发以及结局条件是否满足有关。建议至少预留公共线档、分支前档和结局前档三类存档，后续补图时会轻松很多。

## 存档说明
多栏位存档仍然是最稳妥的办法。公共线结束前保留总档，角色事件前保留分支档，结局前再保留安全档，后续想补结局或缺图都能快速回跳。

## FAQ
### 这款游戏适合哪类玩家？
如果你喜欢 ${game.tags.slice(0, 2).join("、")} 类型作品，并希望快速定位攻略、全CG 和存档信息，那么这种模板页会很适合你。

### 需要多周目吗？
一般不一定，但合理的分支存档能显著减少重复流程。

### 下载前要先看什么？
先确认资源平台、版本号和语言状态，再决定是否下载。

## 类似游戏推荐
如果你喜欢 ${game.title} 这类作品，可以继续看看共享 ${game.tags.slice(0, 3).join("、")} 标签的同类游戏。顺着相近题材往下看，通常更容易找到口味接近的作品。`;

const buildPrompt = (game) => `
请基于下面的游戏信息输出一篇中文 markdown 攻略文章，只输出正文。

标题：${game.title}
标签：${game.tags.join("、")}
简介：${game.summary}

要求：
1. 500-1000 字。
2. 自然包含关键词：攻略、全CG、存档、结局。
3. 严格包含这些二级标题：
## 游戏简介
## 推荐理由
## 攻略要点
## CG解锁说明
## 存档说明
## FAQ
## 类似游戏推荐
4. FAQ 内用三级标题表示问题。
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
          content: "你是一名中文游戏攻略编辑，只输出高质量 markdown 正文。",
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

function normalizePost(post) {
  const tags = Array.isArray(post.tags)
    ? post.tags.map((tag) => tag.name).filter(Boolean)
    : [];
  const tagLabel = tags.slice(0, 3).join("、");
  const summary = tagLabel
    ? `${post.title} 攻略整理，含全CG解锁、存档说明和路线要点，题材标签：${tagLabel}。`
    : `${post.title} 攻略整理，含全CG解锁、存档说明和路线要点。`;

  const resource = Array.isArray(post.resources) ? post.resources[0] : undefined;
  const contentImages = extractImageSources(post.content);
  const coverCandidate = contentImages[0] ?? post.cover;

  const game = {
    sourceId: post._id,
    slug: slugify(post.title),
    title: post.title,
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
