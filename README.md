# AgentHire

Agent Application / Agent Infrastructure career platform.

## Run

Node.js 22+ and npm:

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run build
```

The production build exports `out/`. Upload this directory to a static host supporting directory index pages. This project uses actual Next.js App Router and TypeScript; it does not require a Node server in production. Sites hosts the static output as configured in `.openai/hosting.json`.

## Current product

- Editorial homepage, GSAP reveal animations and Lenis scroll coordination.
- Jobs search, structured education checks, combined filters, URL state, four sort modes.
- Static detail pages for every known job.
- Local favorites, mobile filter drawer, reduced motion and keyboard support.
- Agent Infra topic page and data transparency page.

The default collection contains eight real-source recruiting records checked on 2026-10-20. Two have a visible application entry plus a published unexpired application window; six retain an explicit unverified-current-status label and individual verification notes. Two confirmed closed records and the nine original DEMO records are accessible through their status filters. No source availability is presented as an employer guarantee.

Every real record retains its source URL, source-check date, application destination, and classification evidence. Missing fields remain unknown. Daily and foreign-currency salaries are not converted into monthly rates. Public application links lead to the original recruiting page or the application form explicitly named in the announcement; no application is submitted by AgentHire.

## Structure

- `app/`: Next.js routes and shared stylesheet.
- `components/`: shell, motion, reusable job card and search/filter interface.
- `lib/jobs.ts`: typed records, demo fixtures, replaceable access functions, filtering and recommendation rules.
- `lib/real-jobs.ts`: sourced recruiting summaries, application links and verification notes.
- `tests/jobs.test.ts`: education, synonyms, combined filters, data truthfulness and ranking checks.

The UI is purpose-built with semantic HTML, CSS and Lucide icons. No unused component framework is added. GSAP and Lenis are bundled locally; no remote animation CDN or paid API is required.

## Data replacement

Add sourced records in `lib/real-jobs.ts`. Set unknown fields to null. Record a reliable `sourceUrl`, `sourceCheckedAt`, classification evidence and application destination. Use `lastVerifiedAt` only when confirming the visible application entry and its unexpired published window. Record uncertainty in `verificationNote`. Application buttons require HTTPS and are suppressed for closed and demo records. Rebuild after data changes so new detail routes are exported.

Detail pages show status-specific explanations, original source links, deadlines and alternate official portals when available. Do not switch status labels without checking original content. This is a manually curated snapshot; live updates and employer-confirmed headcount are not implemented.

## Future scope

Automatic discovery, scheduled updates, authentication, cloud favorites, notifications, databases and AI resume analysis are not implemented. No external credentials or paid model calls are used. Data access can later move behind `getJobs` / `getJob`; a server-backed migration should preserve classification evidence and the education rules.

## Privacy

Favorites use `localStorage` in the current browser only. Clearing browser data removes them. No account, synchronization, or analytics is included.

## 自动同步

- 读取 `GET /api/jobs` 检查 `refreshedAt`、`partial` 和 `jobs`。数据写入 Sites 的 D1 绑定，不需要重新发布。
- 刷新程序读取百度公开招聘列表、职先机的 Agent 招聘索引、Ivyea Jobs 的创业公司招聘列表及团队公开招聘原页。中小与创业团队使用公开人数区间或有依据的创业公司标签。官网列表中的岗位标为已核验，索引岗位仅提供官网来源链接，开放状态待核实。部分来源失败时保留已有记录并标注同步状态。
- 自动任务使用链接项目当前的 Sites 服务访问凭证。以 UTF-8 计算 `sha256("AgentHire refresh v1:" + token)` 的小写十六进制文本作为 HMAC 密钥。使用当前毫秒时间戳 `t`，对 `agenthire-refresh:${t}` 计算 HMAC-SHA256 小写十六进制签名。向该站点的 `POST /api/refresh` 发送 `OAI-Sites-Authorization: Bearer <token>`、`X-AgentHire-Time: <t>` 和 `X-AgentHire-Signature: <signature>`，无请求体。凭证与签名只发送到该项目的实时站点，避免记录到日志。
- 刷新后重新读取岗位接口，核对时间和条数。最近成功同步不足 18 小时会返回 `already_current`，全量来源失败返回 503 并保留上次快照。
### 多行业岗位搜索

首页和岗位页提供「AI 找岗位」，支持用一句话查询 AI Agent、财会、运营和制造岗位。Worker 通过 `POST /api/jobs/search` 返回与现有岗位卡片对应的 ID 和匹配理由。结果使用站内已收录的岗位及原始招聘入口，结果页的「联网找更多岗位」会另外调用 DeepSeek Search，并展示带来源链接的外部招聘卡片。外部结果来自网页索引，在招状态请到招聘原页确认。

默认使用规则匹配。要接入 DeepSeek，在 Sites 服务端运行设置里添加密钥 `DEEPSEEK_API_KEY`，并设置 `AI_SEARCH_DAILY_LIMIT` 为 1–500 的整数。Worker 用 D1 按 UTC 日原子地限制全站模型和网页搜索调用量，两种请求共用每日额度。未设置额度、额度用完或模型出错时使用规则匹配。

新增搜索和 Worker 请求校验可直接执行 `node --test tests/job-search.test.mjs`。完整网页验证还需执行 `npm ci`、`npm run typecheck`、`npm test` 和 `npm run build`。

## 致谢

OpenAI Codex 协助实现多行业岗位搜索、接入现有岗位卡片并编写测试。
