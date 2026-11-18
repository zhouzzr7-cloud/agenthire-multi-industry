# AgentHire

**面向多行业的校招与实习搜索平台**

把计算机与 AI、财会、运营和制造岗位集中到一个列表。可以用城市、学历和招聘类型快速筛选，也可以直接描述求职需求。查看岗位详情时，可沿着来源链接核对要求、在招状态和投递入口。

[快速开始](#快速开始) · [核心功能](#核心功能) · [技术架构](#技术架构) · [数据说明](#数据说明)

## 核心功能

| 功能 | 可以做什么 |
| --- | --- |
| 岗位探索 | 按城市、岗位方向、学历、招聘类型和发布时间筛选，收藏感兴趣的岗位。 |
| AI 找岗位 | 用一句话描述需求，例如「杭州本科，找财务实习」。站内结果会显示匹配理由，未配置模型时可使用规则匹配。 |
| 联网找岗位 | 使用搜索服务补充招聘原页。结果按链接去重，可继续分批补搜，也可通过刷新写入岗位列表。 |
| 岗位详情 | 集中展示有来源依据的工作职责、任职要求、投递链接和核验状态。部分来源支持从招聘原页补充正文。 |
| 岗位同步 | 从公开招聘来源更新岗位。部分来源暂时不可用时，保留已有数据并显示同步状态。 |

## 快速开始

需要 Node.js 22 或更新版本，以及 npm。

```bash
git clone https://github.com/zhouzzr7-cloud/agenthire-multi-industry.git
cd agenthire-multi-industry
npm ci
npm run dev
```

打开 [本地岗位页](http://127.0.0.1:8787/jobs/)。启动命令会构建页面、初始化本地 D1 数据库，并用 Wrangler 同时提供页面和 API。

内置岗位及规则匹配可以直接使用。要搜索外部招聘信息，打开 [联网刷新设置](http://127.0.0.1:8787/jobs/settings/)，选择服务商并填写自己的 API Key。支持 DeepSeek、博查、Perplexity、Tavily、Brave Search 和 Exa。也可以在项目根目录的 `.env` 中配置站点级 `DEEPSEEK_API_KEY`。

「最多保留的外部岗位数」可以填写正整数，留空时保留全部去重结果。实际收录数量取决于服务商返回的有效招聘链接。

## 技术架构

页面由 **Next.js、React 和 TypeScript** 构建并静态导出。**Cloudflare Worker** 提供页面资源、站内搜索、外部搜索和来源详情接口。自动同步的岗位快照存储在 **Cloudflare D1**。

| 目录 | 职责 |
| --- | --- |
| [`app/`](app/) 与 [`components/`](components/) | 页面、搜索交互、筛选和岗位详情 |
| [`lib/`](lib/) | 岗位数据、匹配规则与浏览器存储 |
| [`worker/`](worker/) | 搜索 API、来源采集和同步 |
| [`drizzle/`](drizzle/) | D1 数据库迁移 |
| [`tests/`](tests/) | 岗位筛选、搜索、去重和来源解析测试 |

```bash
npm test
node --test tests/job-search.test.mjs
npm run build
npm run typecheck
```

`npm run dev:ui` 可在 [3000 端口](http://127.0.0.1:3000/) 热更新页面，完整的岗位 API 由 Wrangler 提供。生产构建将页面导出到 `out/`，并生成可部署的 `dist/server/index.js`。

## 数据说明

- 岗位列表结合人工整理的记录、公开来源同步及浏览器中保存的联网结果。投递资格、截止日期与开放状态以招聘原页为准。
- 新增和更新岗位时，按招聘原页整理职责、要求和加分项，保留来源及核验记录。缺失字段标为未知。维护规则见 [AGENTS.md](AGENTS.md)。
- 收藏、刷新设置和收录的外部岗位保存在当前浏览器。AI 联网搜索的当前结果和个人 API Key 保存在标签页会话中，搜索时由 Worker 将 Key 转交所选服务商。
- 选择「使用站点配置」并保存可清除会话中的个人 Key。投递操作在原招聘网站完成。

<details>
<summary>托管与同步配置</summary>

通过 `GET /api/jobs` 可以读取岗位快照和同步状态。定时刷新由 `POST /api/refresh` 触发。完整快照在最近 18 小时内成功同步时会返回 `already_current`，所有来源均失败时返回 503 并保留上次快照。

托管的刷新请求使用 Sites 服务凭证及 HMAC 签名。以 `sha256("AgentHire refresh v1:" + token)` 的小写十六进制字符串为 HMAC 密钥，用当前毫秒时间戳 `t` 对 `agenthire-refresh:${t}` 做 HMAC-SHA256。请求传入 `OAI-Sites-Authorization: Bearer <token>`、`X-AgentHire-Time` 和 `X-AgentHire-Signature`，签名使用小写十六进制。凭证只发往该项目的站点地址。

托管环境可通过 `AI_SEARCH_DAILY_LIMIT`（1–500）设置站点配置的日调用上限。未设置时，站内搜索使用规则匹配，联网搜索可使用已配置的 DeepSeek 服务。个人 Key 消耗其所属服务商账户的额度。

</details>
