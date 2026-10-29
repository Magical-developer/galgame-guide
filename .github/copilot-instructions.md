# Copilot Instructions for `galgame-guide`

> 本文件描述**当前**架构。历史上有过一套「AI 生成攻略 + JSON 产物 + 静态详情页」的实现，
> 已于 2026-08 删除，**不要按那套结构重建**。权威说明见 `AGENTS.md` 与 `README.md`。

## 项目是什么

一个独立的视觉小说 / Galgame 作品索引：只展示数据源已提供的标题、概览、封面、标签、热度与时间字段，
用于站内检索、标签筛选、热度排序和相似条目发现。它**不是攻略站**，不生成路线、结局、CG、存档或兼容性结论。

## 命令

- 安装依赖：`pnpm install`
- 开发：`pnpm run dev`
- 构建：`pnpm run build`（= `build-redirects` + `next build`，**不含**数据同步）
- Lint：`pnpm run lint`（直接跑 `eslint`，不是 `next lint`）
- 类型检查：`npx tsc --noEmit`
- 同步数据：`pnpm run content:sync`（写 Turso）
- 清理重复行：`pnpm run dedupe:games`（默认 dry-run，`--apply` 才写库）
- 初始化表结构：`pnpm run db:init`

没有配置测试框架。

## 架构

- **Next.js 16 App Router** + React 19 + Tailwind v4 + Turso/libSQL（`@libsql/client`）。
- 数据只存 Turso 的 `games` 表；`lib/games.ts` 是唯一读层，`lib/db.ts` 建连接。
- `app/[slug]/page.tsx`：按需 ISR，未知 slug 返回 404，**统一 `noindex, follow`**。
- `app/page.tsx` / `app/archive/page.tsx`：可索引的发现面；筛选/分页参数页不参与索引。
- `app/sitemap.ts`：只提交首页、作品索引和说明页，**不提交作品档案页**。
- `scripts/sync-content.mjs`：从 `CONTENT_SOURCE_API_URL` 拉取目录字段并写入 DB，不生成正文。
- `app/api/cron/sync-content/route.ts`：只触发 redeploy，**不同步数据**。
- `data/generated/` 与 `guides` 表是历史遗留，运行时不读；不要再往里写内容。

## 数据规则（重要）

- 一个 `source_id` 只能有一行：`games` 上有 `UNIQUE INDEX idx_games_source_id`。
- 同步按 `source_id` 原地 UPDATE，**slug 保持稳定**；不要用 slug 当冲突键，也不要让标题变化触发新行。
- 源站已删除 `/api/posts/hot-feed`；过渡期用 `/api/posts/latest`。公开契约 `/api/public/v1` 暂无 posts 端点。
- 同步请求用可识别的真实 UA，**不要伪造浏览器 UA / Referer / Origin**（违反母站 `PUBLIC_API.md`）。

## Tailwind v4 约定

- CSS 变量必须先注册进 `app/globals.css` 的 `@theme inline`，再用命名 utility：
  `--color-accent` → `bg-accent` / `text-accent` / `border-accent/25`。
- **不要写 `bg-[--accent]`**：v4 已移除 v3 的隐式 `var()` 转换，会生成非法 CSS（`background-color:--accent`），
  浏览器直接丢弃，而 `lint` / `tsc` 都不会报。
- 构建后可用 `grep -E '(color|background-color|border-color):--' .next/static/chunks/*.css` 自检，应为 0 命中。

## 内容与文案边界

- 面向用户的文案用玩家语气，不要暴露流量/SEO/实现意图（如「SEO」「长尾」「导流」「承接搜索」「工具站」）。
- 未知信息保持未知，不要用模板补齐；不要写没有来源的攻略结论。
- 主站外链统一带 `utm_source=guide&utm_medium=referral&utm_campaign=friend_link`，不弹广告、不做隐藏跳转。

## 部署

- Vercel 构建命令就是 `pnpm build`，**没有** `content:sync` 前置；`vercel.json` 只有 cron，没有 `buildCommand`。
- GitHub Actions 的定时同步已停用（源 API 403 Actions IP），只剩 `workflow_dispatch`。
- `NEXT_PUBLIC_SITE_URL` 缺失时会用 Vercel 域名兜底；部署前确认产物里的 canonical 不是 `localhost`。
