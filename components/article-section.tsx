import type { GuideSection } from "@/lib/types/game";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function ArticleSection({ section }: { section: GuideSection | undefined }) {
  if (!section) {
    return null;
  }
  const markdown = section.lines.join("\n").trim();

  return (
    <section className="space-y-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.22)] backdrop-blur sm:p-8">
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 rounded-full bg-[--accent]" />
        <h2 className="font-display text-2xl tracking-[0.08em] text-[--ink-strong]">
          {section.title}
        </h2>
      </div>

      <div className="text-[15px] leading-8 text-[--ink-soft] sm:text-base">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-4">{children}</p>,
            h3: ({ children }) => (
              <h3 className="mb-4 font-display text-lg uppercase tracking-[0.18em] text-[--ink-strong]">
                {children}
              </h3>
            ),
            ul: ({ children }) => (
              <ul className="mb-4 space-y-3 border-l border-[--line] pl-5">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-4 list-decimal space-y-3 pl-6 marker:text-[--ink-strong]">
                {children}
              </ol>
            ),
            li: ({ children }) => <li>{children}</li>,
            strong: ({ children }) => (
              <strong className="font-semibold text-[--ink-strong]">{children}</strong>
            ),
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    </section>
  );
}
