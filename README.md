# AgentHire

多行业校招与实习搜索，涵盖计算机与 AI、财会、运营和制造。

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
- Career direction shortcuts, category filters and source verification details.

The job board combines curated listings with the latest synchronized feed. Status filters also expose closed and demo records. Check the original listing for current availability and application requirements.

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

首页和岗位页提供「AI 找岗位」，支持用一句话查询 AI Agent、财会、运营和制造岗位。Worker 通过 `POST /api/jobs/search` 返回站内岗位的 ID 和匹配理由。「联网找岗位」通过 `POST /api/jobs/web-search` 补充外部招聘原页，外部结果标注在招状态待确认。

「联网刷新设置」可使用站点的 `DEEPSEEK_API_KEY`，也可选择 DeepSeek、博查、Perplexity、Tavily、Brave Search 或 Exa 并填写自己的搜索 API Key。个人 Key 仅在当前浏览器标签页的会话中保存，搜索时由 Worker 转交给所选服务商，使用该 Key 所属账户的额度。选择「使用站点配置」并保存可清除个人 Key。搜索条件和刷新结果保存在当前浏览器，「最多显示的岗位数」控制浏览器保留的结果数量。

托管环境可用 `AI_SEARCH_DAILY_LIMIT`（1–500）为站内模型解析和联网搜索设置共用的每日调用上限。省略此设置时，站内搜索使用规则匹配，联网搜索由 DeepSeek API 处理。DeepSeek 返回余额不足时，页面会明确显示账户余额提示。

本地运行时，在项目根目录的 `.env` 中配置 `DEEPSEEK_API_KEY`，然后执行 `npm run build` 和 `npx wrangler dev --local`。打开 Wrangler 输出的本地地址，即可从岗位页进入「联网刷新设置」。

运行 `npm test` 和 `node --test tests/job-search.test.mjs` 验证搜索与 Worker 请求。执行 `npm run build` 后可运行 `npm run typecheck` 检查类型。
