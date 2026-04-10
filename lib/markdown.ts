import type { FaqItem, GuideSection } from "@/lib/types/game";

const normalizeTitle = (title: string) => title.replace(/\s+/g, "");

export function parseGuideSections(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").trim().split("\n");
  const sections: GuideSection[] = [];
  let current: GuideSection | null = null;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current) {
        sections.push(current);
      }

      current = {
        title: line.slice(3).trim(),
        lines: [],
      };
      continue;
    }

    if (!current) {
      continue;
    }

    current.lines.push(line);
  }

  if (current) {
    sections.push(current);
  }

  return sections;
}

export function findSection(
  sections: GuideSection[],
  title: string,
  fallbackTitle?: string
) {
  const titles = [title, fallbackTitle].filter(Boolean).map((entry) => normalizeTitle(entry!));
  return sections.find((section) => titles.includes(normalizeTitle(section.title)));
}

export function parseFaq(section: GuideSection | undefined): FaqItem[] {
  if (!section) {
    return [];
  }

  const faq: FaqItem[] = [];
  let currentQuestion = "";
  let answerLines: string[] = [];

  for (const rawLine of section.lines) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    if (line.startsWith("### ")) {
      if (currentQuestion) {
        faq.push({
          question: currentQuestion,
          answer: answerLines.join(" ").trim(),
        });
      }

      currentQuestion = line.slice(4).trim();
      answerLines = [];
      continue;
    }

    answerLines.push(line.replace(/^- /, ""));
  }

  if (currentQuestion) {
    faq.push({
      question: currentQuestion,
      answer: answerLines.join(" ").trim(),
    });
  }

  return faq;
}
