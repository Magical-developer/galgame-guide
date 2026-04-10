# Copilot Instructions for `galgame-guide`

## Build, lint, and content-sync commands

- Install deps: `pnpm install`
- Run dev server: `pnpm run dev`
- Build production output: `pnpm run build`
- Lint the repo: `pnpm run lint`
- Sync source data and generate/update content artifacts: `pnpm run content:sync`

There is currently **no test runner configured** in `package.json`, so there is no full-test or single-test command yet.

For production on Vercel, the README expects the build command to be:

```bash
pnpm run content:sync && pnpm run build
```

## High-level architecture

- This repo is a **Next.js 16 App Router** site that serves SEO-oriented game guide pages from **pre-generated content artifacts**, not from live API calls during page rendering.
- The public site reads from `data/generated/`:
  - `data/generated/games.json` is the normalized game index.
  - `data/generated/content/[slug].json` stores generated guide markdown per game.
- `app/page.tsx` renders the homepage from `getFeaturedGames()` / `getAllGames()`.
- `app/[slug]/page.tsx` statically generates detail pages with:
  - `generateStaticParams()` from `games.json`
  - `generateMetadata()` from normalized game data
  - guide markdown parsed into sections and FAQ blocks
  - related-game linking from tag overlap
- `lib/games.ts` is the main read layer for build/runtime. It reads JSON artifacts from disk and caches them with React `cache()`.
- `scripts/sync-content.mjs` is the write layer for content artifacts. It:
  - fetches source posts from `CONTENT_SOURCE_API_URL`
  - normalizes source posts into `GameRecord`
  - prefixes relative cover URLs with `CONTENT_SOURCE_ASSET_BASE_URL`
  - computes `sourceHash` for incremental regeneration
  - writes guide documents to `data/generated/content/`
  - falls back to a local guide template when AI config is missing
- `app/api/cron/sync-content/route.ts` does **not** run the sync script directly. It validates the cron request and triggers a Vercel deploy hook so the next deployment can run `content:sync` before `build`.
- The repo is designed around **Vercel Hobby daily cron** limits: content refresh is expected to happen as a scheduled rebuild, not as in-request regeneration.

## Key conventions in this codebase

### Next.js 16 conventions matter here

- Treat this as **Next.js 16**, not generic older App Router examples.
- Dynamic route `params` are handled as **Promises** in pages and metadata functions. Follow the existing pattern in `app/[slug]/page.tsx`.
- Before changing framework-specific behavior, check the local Next.js docs in `node_modules/next/dist/docs/`, especially for App Router and metadata behavior.

### Generated content shape is a contract

- Guide rendering depends on stable markdown section headings:
  - `## 游戏简介`
  - `## 推荐理由`
  - `## 攻略要点`
  - `## CG解锁说明`
  - `## 存档说明`
  - `## FAQ`
  - `## 类似游戏推荐`
- `lib/markdown.ts` parses sections and FAQ content from those exact headings. If you change heading text, update the parser and any fallback/generation prompts together.

### Data flow is “generate first, render later”

- Do not move the site back to fetching the source API at page-render time unless that architecture is intentionally being changed.
- Changes to `GameRecord`, guide document shape, slugging, or hash generation must stay aligned across:
  - `scripts/sync-content.mjs`
  - `lib/types/game.ts`
  - `lib/games.ts`
  - `app/[slug]/page.tsx`

### User-facing copy should read like a real guide site

- Keep visible copy in a **player-facing editorial tone**, not a builder/ops/SEO tone.
- Avoid language that exposes traffic strategy or implementation intent in user-visible content, such as:
  - “SEO”
  - “收录”
  - “长尾”
  - “导流”
  - “承接搜索”
  - “工具站”
  - “开发日志”
- It is fine to keep natural player-facing guide terms such as:
  - “攻略”
  - “全CG”
  - “存档”
  - “结局”
  - “FAQ”
- This rule applies to homepage copy, detail-page support copy, fallback templates, and seeded/generated sample content.

### Fallback content is user-visible

- `generateFallbackContent()` in both `lib/content/generate-content.ts` and `scripts/sync-content.mjs` is not placeholder developer text; it can ship to users when AI content is unavailable.
- Any fallback rewrite should still read like a usable guide article.

### Remote images and normalized source data

- Remote covers are served through `next/image`, and `next.config.ts` already allows `upload.krzacg.com`.
- Source API data is not consumed raw by pages. It must be normalized first, especially:
  - `tags` object arrays -> `string[]`
  - relative `cover` paths -> absolute asset URLs
  - first resource link -> `download` / `downloadLabel`

### README contains deployment assumptions

- Preserve the README’s deployment model unless intentionally changing it:
  - daily Vercel cron
  - deploy hook trigger
  - build command runs `content:sync` before `build`
