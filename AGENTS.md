<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Agent Guidance

### Tech Stack
- Next.js 16.2.2 (App Router), React 19.2.4, TypeScript 5
- TailwindCSS 4 (CSS-based config in `app/globals.css`, no `tailwind.config.ts`)
- ESLint 9 flat config (`eslint.config.mjs`)
- Database: Turso/libSQL via `@libsql/client`

### Critical Commands
- `pnpm install` — install deps
- `pnpm dev` — start dev server
- `pnpm build` — production build
- `pnpm lint` — ESLint (runs `eslint` directly, not `next lint`)
- `pnpm content:sync` — fetch content from API, generate AI guides, write to DB
- `pnpm compare:models` — test multiple AI models side-by-side
- `pnpm db:init` — initialize database schema

### Environment Setup
- Copy `.env.example` to `.env.local` for local development
- **Required for DB operations**: `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
- **Required for AI content generation**: `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`
- Without AI config, the site builds and runs with existing sample data

### Architecture
- Static site generation with `generateStaticParams` in `app/[slug]/page.tsx`
- `dynamicParams = false` — only pre-built slugs are valid (404 otherwise)
- Data source: Turso DB (primary), with fallback JSON files in `data/generated/`
- Content pipeline: `scripts/sync-content.mjs` fetches from API → writes to DB → calls AI service → stores generated guides

### Build & Deploy
- Vercel build command: `pnpm run content:sync && pnpm run build`
- Cron job at 03:00 daily triggers `/api/cron/sync-content` which hits deploy hook
- `vercel.json` configures both build command and cron schedule

### Code Conventions
- Path alias: `@/*` maps to `./*`
- Tailwind v4 uses `@import "tailwindcss"` and `@theme inline` in CSS, not JS config
- ESLint uses flat config format (`eslint.config.mjs`)
- Scripts are `.mjs` files using ESM

### Data Flow
1. `lib/db.ts` creates libSQL client from env vars
2. `lib/games.ts` queries DB with React `cache()` for deduplication
3. `app/[slug]/page.tsx` uses `generateStaticParams` to build all game pages at build time
4. AI-generated content stored in DB `guides` table; markdown parsed with `react-markdown` + `remark-gfm`
