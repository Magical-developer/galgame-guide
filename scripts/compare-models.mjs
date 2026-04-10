import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

const projectRoot = process.cwd();
const gamesPath = path.join(projectRoot, "data", "generated", "games.json");
const outputRoot = path.join(projectRoot, "artifacts", "model-compare");

loadEnvConfig(projectRoot);

const config = {
  aiBaseUrl: process.env.AI_BASE_URL ?? "",
  aiApiKey: process.env.AI_API_KEY ?? "",
  compareModels: process.env.AI_COMPARE_MODELS ?? process.env.AI_MODEL ?? "",
  compareSlug: process.env.AI_COMPARE_SLUG ?? "",
  compareTitle: process.env.AI_COMPARE_TITLE ?? "",
  compareTags: process.env.AI_COMPARE_TAGS ?? "",
  compareSummary: process.env.AI_COMPARE_SUMMARY ?? "",
};

function buildPrompt(game) {
  return `
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

5. FAQ 小节内请使用三级标题表示问题。
6. 内容风格要像成熟攻略站编辑写的导读，不能出现站长旁白、项目说明、运营说明或开发日志语气。
`.trim();
}

async function loadGameFromArtifacts() {
  const payload = await readFile(gamesPath, "utf8");
  const games = JSON.parse(payload);

  if (!Array.isArray(games) || games.length === 0) {
    throw new Error("No games found in data/generated/games.json. Run `pnpm run content:sync` first.");
  }

  if (config.compareSlug) {
    const matched = games.find((game) => game.slug === config.compareSlug);
    if (!matched) {
      throw new Error(`Could not find slug "${config.compareSlug}" in data/generated/games.json.`);
    }
    return matched;
  }

  return games[0];
}

function loadCustomGameFromEnv() {
  if (!config.compareTitle || !config.compareTags || !config.compareSummary) {
    return null;
  }

  return {
    title: config.compareTitle,
    tags: config.compareTags
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
    summary: config.compareSummary.trim(),
  };
}

async function requestMarkdown(prompt, model) {
  if (!config.aiBaseUrl || !config.aiApiKey) {
    throw new Error("AI_BASE_URL and AI_API_KEY are required to compare models.");
  }

  const endpoint = new URL("/v1/chat/completions", config.aiBaseUrl).toString();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.aiApiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: "你是一名中文游戏攻略编辑，只输出自然、成熟、面向玩家的高质量 markdown 正文。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Model ${model} failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error(`Model ${model} returned empty content.`);
  }

  return content;
}

async function main() {
  const models = config.compareModels
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (models.length === 0) {
    throw new Error(
      "No models configured. Set AI_COMPARE_MODELS (comma-separated) or AI_MODEL in .env.local before running `pnpm run compare:models`."
    );
  }

  const game = loadCustomGameFromEnv() ?? (await loadGameFromArtifacts());
  const prompt = buildPrompt(game);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = path.join(outputRoot, stamp);

  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "prompt.txt"), `${prompt}\n`);
  await writeFile(
    path.join(outputDir, "input.json"),
    `${JSON.stringify(game, null, 2)}\n`
  );

  const summary = [];

  for (const model of models) {
    const startedAt = Date.now();
    const markdown = await requestMarkdown(prompt, model);
    const durationMs = Date.now() - startedAt;

    await writeFile(path.join(outputDir, `${model}.md`), `${markdown}\n`);
    summary.push({
      model,
      durationMs,
      outputFile: `${model}.md`,
    });
  }

  await writeFile(
    path.join(outputDir, "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`
  );

  console.log(`Model comparison outputs saved to ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
