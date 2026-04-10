import { hasAiConfig, siteConfig } from "@/lib/config";

export async function requestAiMarkdown(prompt: string) {
  if (!hasAiConfig) {
    throw new Error("AI configuration is missing.");
  }

  const endpoint = new URL("/v1/chat/completions", siteConfig.aiBaseUrl).toString();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${siteConfig.aiApiKey}`,
    },
    body: JSON.stringify({
      model: siteConfig.aiModel,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "你是一名中文游戏攻略编辑，只输出自然、成熟、面向玩家的高质量 markdown 正文。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`AI request failed: ${response.status} ${message}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("AI response did not include markdown content.");
  }

  return content;
}
