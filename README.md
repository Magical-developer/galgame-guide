# KRZ 游戏攻略 SEO 站

一个基于 **Next.js 16 App Router + TypeScript + TailwindCSS 4** 的游戏攻略自动生成站点模板，目标是承接“攻略 / 全CG / 存档 / FAQ / 相似游戏”这类 SEO 长尾词。

站点本身负责：

- 首页热门游戏聚合
- `/[slug]` 独立攻略详情页
- 语义化 SEO 输出
- sitemap / robots / OpenGraph
- 标签相似度内链推荐

内容流水线负责：

- 从 `https://service.krzacg.com/api/posts/hot-feed` 抓取源数据
- 规范化为站内游戏数据结构
- 调用 AI 服务生成 markdown 攻略
- 将结果写入 `data/generated/`

## 1. 项目结构

```text
app/
  [slug]/page.tsx
  api/cron/sync-content/route.ts
  globals.css
  layout.tsx
  page.tsx
  robots.ts
  sitemap.ts
components/
  article-section.tsx
  game-card.tsx
  related-games.tsx
data/
  generated/
    games.json
    content/
      *.json
lib/
  config.ts
  games.ts
  markdown.ts
  related-games.ts
  seo.ts
  content/
    ai-client.ts
    generate-content.ts
    prompt.ts
  types/
    game.ts
scripts/
  sync-content.mjs
vercel.json
```

## 2. 本地运行

### 先复制环境变量模板

```bash
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

### 直接启动示例站点

仓库已经自带示例数据，**不配任何 API Key 也能直接 build**：

```bash
pnpm install
pnpm run build
pnpm run dev
```

### 拉真实内容并生成最新攻略数据

先配置环境变量，再执行：

```bash
pnpm run content:sync
pnpm run build
```

### 对比不同模型的生成效果

先在 `.env.local` 里填好：

- `AI_BASE_URL`
- `AI_API_KEY`
- `AI_COMPARE_MODELS`（推荐，多模型对比）
  或者至少填 `AI_MODEL`（单模型试跑）

然后运行：

```bash
pnpm run compare:models
```

脚本会：

- 默认读取 `data/generated/games.json` 的第一条游戏作为测试输入
- 或者使用 `AI_COMPARE_SLUG` 指定某个已生成 slug
- 或者使用 `AI_COMPARE_TITLE / AI_COMPARE_TAGS / AI_COMPARE_SUMMARY` 直接测试自定义输入

输出会写到：

```text
artifacts/model-compare/<timestamp>/
```

每个模型会生成一份单独的 `.md` 文件，方便人工比对文风、结构完整度和稳定性。

## 3. 环境变量

| 变量名 | 必填 | 说明 |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | 否 | 站点公开域名，默认 `http://localhost:3000` |
| `NEXT_PUBLIC_MAIN_SITE_URL` | 否 | 主站入口链接 |
| `MAIN_SITE_GAME_URL_TEMPLATE` | 否 | 下载 CTA 跳转到主站的模板，支持 `{slug}` / `{sourceId}` / `{title}` |
| `CONTENT_SOURCE_API_URL` | 否 | 源内容接口，默认 `https://service.krzacg.com/api/posts/hot-feed` |
| `CONTENT_SOURCE_ASSET_BASE_URL` | 否 | 图片前缀，默认 `https://upload.krzacg.com` |
| `CONTENT_SYNC_PAGE_SIZE` | 否 | 每页抓取条数，默认 `10` |
| `CONTENT_SYNC_MAX_PAGES` | 否 | 每次同步抓取页数，默认 `3` |
| `AI_BASE_URL` | 否 | AI 节点，例如 `https://yunwu.ai` |
| `AI_API_KEY` | 否 | AI Token |
| `AI_MODEL` | 否 | 使用模型名 |
| `CRON_SECRET` | 否 | 保护 `/api/cron/sync-content` 的密钥 |
| `VERCEL_DEPLOY_HOOK_URL` | 否 | Vercel Deploy Hook，用于每日定时触发重建 |

> 备选 AI 节点可以填：`https://yunwu.ai`、`https://api.apiplus.org`、`https://api3.wlai.vip`

## 4. 数据流说明

### 主站导流

- 详情页的下载按钮默认不会直接使用源站资源链接。
- 现在统一走站内中转路由：

```text
/go/[slug]
```

- 该路由会：
  - 根据 slug 查到当前游戏
  - 按 `MAIN_SITE_GAME_URL_TEMPLATE` 生成主站目标地址
  - 返回带 `X-Robots-Tag: noindex, nofollow, noarchive` 的跳转响应

默认模板为：

```text
/?from=guide&slug={slug}
```

如果你的主站详情页有固定结构，可以改成例如：

```text
/game/{slug}
```

或：

```text
/resource/{sourceId}
```

### 源接口返回

当前源接口支持：

- `page`
- `limit`
- `sort`（默认 `views`）

脚本会把原始帖子结构映射成站内结构：

```ts
type GameRecord = {
  sourceId: string;
  slug: string;
  title: string;
  tags: string[];
  summary: string;
  cover: string;
  download: string;
  downloadLabel: string;
  views: number;
  createdAt: string;
  updatedAt: string;
  sourceHash: string;
}
```

### AI 输出

AI 生成的攻略内容为 markdown，并强制包含以下模块：

- 游戏简介
- 推荐理由
- 攻略要点
- CG解锁说明
- 存档说明
- FAQ
- 类似游戏推荐

生成结果会写入：

```text
data/generated/content/[slug].json
```

## 5. 生产部署建议（Vercel Hobby 免费版）

### 推荐方式

1. 在 Vercel 项目里配置环境变量
2. 将 **Build Command** 改成：

```bash
pnpm run content:sync && pnpm run build
```

3. 配置 `VERCEL_DEPLOY_HOOK_URL`
4. 保留仓库里的 `vercel.json`

这样每日 Cron 会访问：

```text
/api/cron/sync-content
```

该路由会触发 Deploy Hook，从而让 Vercel 再跑一轮构建；构建开始前先执行 `content:sync`，把最新帖子和 AI 攻略写入构建产物。

### 免费版限制

Vercel Hobby 免费计划：

- 支持 Cron Jobs
- **只能每天跑一次**
- 调度精度为**小时级**，不是分钟级准点

所以这个模板默认按“每日一次增量刷新”设计。

## 6. 核心页面

### 首页

- 热门游戏卡片
- SEO 导向文案
- 主站导流入口
- 站点统计信息

### 详情页 `/[slug]`

- SEO 标题：游戏名 + 攻略 + 全CG + 存档
- 封面图
- 游戏简介
- AI 生成内容
- 下载按钮
- FAQ
- 相似游戏内链
- 返回主站入口

## 7. SEO 能力

已经实现：

- `generateStaticParams`
- `generateMetadata`
- `metadataBase`
- OpenGraph
- canonical
- `app/sitemap.ts`
- `app/robots.ts`
- 语义化 section 布局

## 8. 常用命令

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm run content:sync
pnpm run lint
```
# galgame-guide
