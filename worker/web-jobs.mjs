const trustedJobSites = [
  [/(^|\.)shixiseng\.com$/u, /^\/intern\/inn_/u],
  [/(^|\.)nowcoder\.com$/u, /^\/jobs\/detail\//u],
  [/(^|\.)zhipin\.com$/u, /^\/job_detail\//u],
  [/(^|\.)liepin\.com$/u, /^\/job\//u],
  [/(^|\.)jobs\.feishu\.cn$/u, /\/position\/.+\/detail\/?$/u],
  [/^(?:jobs\.bytedance|talent\.antgroup|talent\.baidu|careers\.tencent|jobs\.meituan)\.com$/u, /\/(?:position|detail)\//u],
  [/(^|\.)edu\.cn$/u, /\/(?:zpinfo|Recruitment|jyzp|recruitment|recruit|job\/view|detail\/(?:job|online)|jyxt\/sczp|teachin\/view)/iu],
  [/(^|\.)ncss\.cn$/u, /\/(?:student\/jobs|job|jobs)\/.+\//iu],
];
const jobDomains = ["shixiseng.com","nowcoder.com","zhipin.com","liepin.com","jobs.feishu.cn","edu.cn","ncss.cn","talent.baidu.com","careers.tencent.com","jobs.meituan.com","jobs.bytedance.com","talent.antgroup.com"];

const providerEndpoints = {
  deepseek: "https://api.deepseek.com/v1/tools/search",
  bocha: "https://api.bocha.cn/v1/web-search",
  perplexity: "https://api.perplexity.ai/search",
  tavily: "https://api.tavily.com/search",
  brave: "https://api.search.brave.com/res/v1/web/search",
  exa: "https://api.exa.ai/search",
};

function normalizeUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|spm$|pcm$|from$|source$|tracking$)/iu.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    return url;
  } catch {
    return null;
  }
}

const urlKey = url => url.hostname.replace(/^www\./u, "") + url.pathname.replace(/\/$/u, "") + url.search;
const shortText = (value, length) => typeof value === "string" ? value.replace(/\s+/gu, " ").trim().slice(0, length) : "";

export class WebSearchHttpError extends Error {
  constructor(status){
    super("web_search_provider_failed");
    this.status=status;
  }
}

function searchTerms(input) {
  return Array.from(input.normalize("NFKC")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/gu, " ")
    .replace(/(?:\+?86[ -]?)?1[3-9]\d{9}/gu, " ")
    .replace(/(?:-?site|before|after|lang):\S+/giu, " ")
    .replace(/["<>]/gu, " ")
    .replace(/\s+/gu, " ").trim()).slice(0, 84).join("");
}

function searchRequest(provider,query,limit,apiKey) {
  const url = new URL(providerEndpoints[provider]);
  const options = {redirect:"error",signal:AbortSignal.timeout(9500)};
  if (provider === "brave") {
    url.search = new URLSearchParams({q:query,count:"20",result_filter:"web",text_decorations:"false"}).toString();
    return [url.href,{...options,headers:{"X-Subscription-Token":apiKey,Accept:"application/json"}}];
  }

  const bodies = {
    deepseek: () => {
      const since = new Date(Date.now() - 120 * 86_400_000).toISOString().slice(0,10);
      return {query:query + " after:" + since,count:Math.min(50,Math.max(40,limit)),need_content:false};
    },
    bocha: () => ({query,count:Math.min(50,Math.max(30,limit)),summary:false}),
    perplexity: () => ({query,max_results:20,search_domain_filter:jobDomains}),
    tavily: () => ({query,max_results:20,include_domains:jobDomains,include_published_date:true,search_depth:"basic"}),
    exa: () => ({query,numResults:20,includeDomains:jobDomains,contents:{highlights:true}}),
  };
  const auth = provider === "exa" ? {"x-api-key":apiKey} : {Authorization:"Bearer " + apiKey};
  return [url.href,{
    ...options,method:"POST",headers:{...auth,"Content-Type":"application/json"},
    body:JSON.stringify(bodies[provider]()),
  }];
}

function searchResults(provider,data) {
  if (provider === "bocha") {
    const status = Number(data?.code);
    if (Number.isInteger(status) && status >= 400 && status <= 599) throw new WebSearchHttpError(status);
    return data?.data?.webPages?.value;
  }
  return provider === "brave" ? (data?.web?.results ?? (data?.type === "search" ? [] : undefined)) : data?.results;
}

export async function findWebJobs({query,apiKey,provider="deepseek",knownUrls=[],limit=24,fetchImpl=fetch}) {
  const terms = searchTerms(query);
  if (!terms) return [];
  const response = await fetchImpl(...searchRequest(provider,terms + " 招聘 职位",limit,apiKey));
  if (!response.ok) throw new WebSearchHttpError(response.status);
  const results = searchResults(provider,await response.json());
  if (!Array.isArray(results)) throw new Error("web_search_invalid_response");

  const seen = new Set(knownUrls.map(normalizeUrl).filter(Boolean).map(urlKey));
  const matches = [];
  for (const result of results) {
    if (!result || typeof result !== "object") continue;
    const url = normalizeUrl(result.url);
    if (!url || !trustedJobSites.some(([host,path])=>host.test(url.hostname)&&path.test(url.pathname))) continue;
    const key = urlKey(url);
    if (seen.has(key)) continue;
    const title = shortText(result.title ?? result.name, 160);
    const snippet = shortText(result.snippet ?? result.description ?? result.content ?? result.highlights?.[0], 220);
    if (!title || /招聘会汇总|求职经验|招聘攻略|已停止接受|该岗位已关闭|该职位已下线|该职位已结束招聘/u.test(title + snippet)) continue;
    const date = result.date ?? result.datePublished ?? result.publishedDate ?? result.published_date;
    const publishedAt = typeof date==="string"&&/^\d{4}-\d{2}-\d{2}(?:T|$)/u.test(date)?date.slice(0,10):null;
    const source = shortText(result.site_name ?? result.siteName, 72) || url.hostname;
    matches.push({title,snippet,publishedAt,source,sourceUrl:url.href,hostname:url.hostname});
    seen.add(key);
    if (matches.length >= limit) break;
  }
  return matches;
}
