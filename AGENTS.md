<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Agent Guidance

### Tech Stack
- Next.js 16.2.12 (App Router), React 19.2.4, TypeScript 5
- TailwindCSS 4 (CSS-based config in `app/globals.css`, no `tailwind.config.ts`)
- ESLint 9 flat config (`eslint.config.mjs`)
- Database: Turso/libSQL via `@libsql/client`

### Critical Commands
- `pnpm install` — install deps
- `pnpm dev` — start dev server
- `pnpm build` — production build（`build-redirects` + `next build`，**不含**数据同步）
- `pnpm lint` — ESLint (runs `eslint` directly, not `next lint`)
- `pnpm content:sync` — fetch catalog fields from the API and write them to the DB
- `pnpm dedupe:games` — 合并重复 source_id（默认 dry-run，`--apply` 才写库）
- `pnpm db:init` — initialize database schema

### Environment Setup
- 本地用 `.env`（Next.js 会自动加载），字段见 `.env.example`
- **Required for DB operations**: `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
- 运行时不需要任何 AI 配置。AI 攻略链路已于 2026-08 删除，**不要重新引入**；`.env` 里若残留 `AI_*` 变量应清理并轮换密钥

### Architecture
- On-demand ISR for `app/[slug]/page.tsx`; unknown slugs return 404.
- Data source: Turso DB (primary); catalog pages expose only source-backed fields.
- Content pipeline: `scripts/sync-content.mjs` fetches catalog fields from the API and writes them to DB; it does not generate guide text.
- 作品档案页统一 `noindex, follow`；sitemap 只提交首页、索引和说明页。

### Build & Deploy
- `pnpm build` = `node scripts/build-redirects.mjs && next build`。**数据同步不在 build 里**，`vercel.json` 也没有 `buildCommand`。
- **日常同步是自动的**：`vercel.json` 的 cron 每天 03:00（东八区）请求 `/api/cron/sync-content`，该路由直接拉取主站最新 2 页写 Turso，并 `revalidatePath("/")`、`/archive`。不是"只触发 redeploy"。
- 手动命令只用于回填/排查：`pnpm content:sync`（增量 2 页）、`--full`（200 页）、`--dry-run`。路由与 CLI 共用 `lib/sync/engine.mjs`。
- 主站已删除 `/api/posts/hot-feed`（KrzACG `1fce7991`，2026-10-14）。当前用 `/api/posts/latest` 过渡；公开契约 `/api/public/v1` 目前没有 posts 端点。
- Turso free tier cold-starts can fail the first DB connection during build; `lib/games.ts` retries with backoff, and homepage/sitemap are ISR (`revalidate`) so they self-heal at runtime
- `NEXT_PUBLIC_SITE_URL` 未配置时会用 Vercel 提供的域名兜底，本地才回落到 `localhost:3000`；缺失时不要直接部署，先确认产物里的 canonical 不是 localhost。
- `CRON_SECRET` 配置后 cron 只认 `Authorization: Bearer`；未配置时退回 Vercel Cron 的 UA 识别（UA 可伪造，生产必须配置）。

### Code Conventions
- Path alias: `@/*` maps to `./*`
- Tailwind v4 uses `@import "tailwindcss"` and `@theme inline` in CSS, not JS config
- **Tailwind v4 不再支持 `[--var]` 简写**（v3 写法），CSS 变量必须注册进 `@theme inline` 后用命名 utility（`text-ink-strong`、`bg-accent`），或使用 `(--var)` 语法。旧写法会生成非法 CSS 且 lint/tsc 都不报。
- ESLint uses flat config format (`eslint.config.mjs`)
- Scripts are `.mjs` files using ESM

### Data Flow
1. `lib/db.ts` creates libSQL client from env vars
2. `lib/games.ts` queries DB; `cache()` 只做**单次请求内**去重，不是跨请求缓存（跨请求靠 ISR）
3. `app/[slug]/page.tsx` renders catalog pages on demand with ISR and returns 404 for unknown slugs
4. Runtime pages only expose catalog fields from `games`; automated or fallback guide generation is intentionally disabled
5. `games` 每个 `source_id` 只允许一行（`UNIQUE INDEX idx_games_source_id`）。同步按 source_id 原地更新，slug 保持稳定；不要改回“用 slug 当冲突键”的写法。
