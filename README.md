# Galgame Guide

Galgame Guide 是一个独立的视觉小说与 Galgame 作品索引。它只负责作品发现、站内检索、标签筛选、热度排序和相似条目浏览，不把聚合字段包装成攻略，也不会自动补写路线、CG、存档或兼容性结论。

## 产品边界

- 首页与 `/archive` 是主要可收录页面。
- `/{slug}` 作品档案保留给站内浏览，按需 ISR 渲染且统一 `noindex, follow`，直到存在可追溯、经过复核的独立编辑内容。
- 搜索、标签、排序和翻页参数页统一不参与索引。
- sitemap 只提交首页、作品索引和必要的说明页，不提交镜像作品档案。
- 作品档案最多保留一个明确的主站资源入口，页脚保留普通合作伙伴链接；两者都不加载弹窗广告或隐藏跳转。
- 所有主站友链使用 `utm_source=guide`、`utm_medium=referral` 和 `utm_campaign=friend_link`。

## 内容质量规则

同步任务仅保存数据源已经提供的标题、概览、封面、标签、热度和时间字段。未知信息保持未知；自动攻略、fallback 模板和 AI 批量生成链路已经停用。

如果以后要发布真正的攻略，至少需要：

1. 明确作品版本与运行平台。
2. 可追溯的信息来源或实测记录。
3. 作者、审核人和复核日期。
4. 与聚合作品档案分开的编辑发布流程。

## 本地开发

```bash
pnpm install
pnpm dev
```

构建和检查：

```bash
pnpm lint
pnpm build
```

## 数据同步

**日常增量是自动的**：Vercel Cron 每天 03:00（东八区）调用 `/api/cron/sync-content`，
拉取主站最新 2 页（约 100 条）写进 Turso，并触发首页 / 作品索引重新验证。
`vercel.json` 里配置这条 cron；路由与 CLI 共用 `lib/sync/engine.mjs`，不存在两份逻辑。

手动命令只用于回填和排查：

```bash
pnpm content:sync                 # 增量：最多 2 页
pnpm content:sync --full          # 全量回填：最多 200 页
pnpm content:sync --dry-run       # 只统计，不写库
```

线上验证同步是否通（需要 `CRON_SECRET`）：

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://galgame-guide.vercel.app/api/cron/sync-content?dry_run=1"
```

核心环境变量：

```dotenv
NEXT_PUBLIC_SITE_URL=https://your-guide.example
NEXT_PUBLIC_MAIN_SITE_URL=https://www.krzacg.com
CONTENT_SOURCE_API_URL=https://service.krzacg.com/api/posts/latest
CONTENT_SYNC_CATEGORY_SLUGS=hentai,game
CONTENT_SYNC_EXCLUDE_KEYWORDS=mmd,vam,virt-a-mate
CRON_SECRET=...
CRON_SYNC_MAX_PAGES=2
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

同步只维护作品索引字段，不生成或更新攻略正文。旧 `guides` 表暂时保留用于数据库兼容，但运行时不读取。
