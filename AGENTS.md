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
- `pnpm build` — production build
- `pnpm lint` — ESLint (runs `eslint` directly, not `next lint`)
- `pnpm content:sync` — fetch catalog fields from the API and write them to the DB
- `pnpm db:init` — initialize database schema

### Environment Setup
- Copy `.env.example` to `.env.local` for local development
- **Required for DB operations**: `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
- The runtime does not require AI configuration; it builds and runs from the catalog data already stored in Turso.

### Architecture
- On-demand ISR for `app/[slug]/page.tsx`; unknown slugs return 404.
- Data source: Turso DB (primary); catalog pages expose only source-backed fields.
- Content pipeline: `scripts/sync-content.mjs` fetches catalog fields from the API and writes them to DB; it does not generate guide text.

### Build & Deploy
- Vercel build command: `pnpm run content:sync && pnpm run build`
- Cron job at 03:00 daily triggers `/api/cron/sync-content` which hits deploy hook
- `vercel.json` configures both build command and cron schedule
- Turso free tier cold-starts can fail the first DB connection during build; `lib/games.ts` retries with backoff, and homepage/sitemap are ISR (`revalidate`) so they self-heal at runtime

### Code Conventions
- Path alias: `@/*` maps to `./*`
- Tailwind v4 uses `@import "tailwindcss"` and `@theme inline` in CSS, not JS config
- ESLint uses flat config format (`eslint.config.mjs`)
- Scripts are `.mjs` files using ESM

### Data Flow
1. `lib/db.ts` creates libSQL client from env vars
2. `lib/games.ts` queries DB with React `cache()` for deduplication
3. `app/[slug]/page.tsx` renders catalog pages on demand with ISR and returns 404 for unknown slugs
4. Runtime pages only expose catalog fields from `games`; automated or fallback guide generation is intentionally disabled
