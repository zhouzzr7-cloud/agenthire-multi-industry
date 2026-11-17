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

function searchTerms(input) {
  return Array.from(input.normalize("NFKC")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/gu, " ")
    .replace(/(?:\+?86[ -]?)?1[3-9]\d{9}/gu, " ")
    .replace(/(?:-?site|before|after|lang):\S+/giu, " ")
    .replace(/["<>]/gu, " ")
    .replace(/\s+/gu, " ").trim()).slice(0, 84).join("");
}

export async function findWebJobs({query,apiKey,knownUrls=[],fetchImpl=fetch}) {
  const terms = searchTerms(query);
  if (!terms) return [];
  const publishedAfter = new Date(Date.now() - 120 * 86_400_000).toISOString().slice(0, 10);
  const response = await fetchImpl("https://api.deepseek.com/v1/tools/search", {
    method:"POST",
    headers:{Authorization:"Bearer " + apiKey,"Content-Type":"application/json"},
    signal:AbortSignal.timeout(9500),
    body:JSON.stringify({
      query:terms + " 招聘 职位 after:" + publishedAfter,
      count:40,
      need_content:false,
    }),
  });
  if (!response.ok) throw new Error("web_search_provider_failed");
  const {results} = await response.json();
  if (!Array.isArray(results)) throw new Error("web_search_invalid_response");

  const seen = new Set(knownUrls.map(normalizeUrl).filter(Boolean).map(urlKey));
  const matches = [];
  for (const result of results) {
    if (!result || typeof result !== "object") continue;
    const url = normalizeUrl(result.url);
    if (!url || !trustedJobSites.some(([host,path])=>host.test(url.hostname)&&path.test(url.pathname))) continue;
    const key = urlKey(url);
    if (seen.has(key)) continue;
    const title = shortText(result.title, 160);
    const snippet = shortText(result.snippet, 220);
    if (!title || /招聘会汇总|求职经验|招聘攻略|已停止接受|该岗位已关闭|该职位已下线|该职位已结束招聘/u.test(title + snippet)) continue;
    const publishedAt = typeof result.date==="string"&&/^\d{4}-\d{2}-\d{2}T/u.test(result.date)?result.date.slice(0,10):null;
    const source = shortText(result.site_name, 72) || url.hostname;
    matches.push({title,snippet,publishedAt,source,sourceUrl:url.href,hostname:url.hostname});
    seen.add(key);
    if (matches.length === 24) break;
  }
  return matches;
}
