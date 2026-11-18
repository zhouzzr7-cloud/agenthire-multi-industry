import {findRememberedWebSearch,mergeWebJobs,readWebJobs,saveWebJobs,webJobFollowUpTerms} from "./web-job-feed";
import {isSearchProvider,searchProviderLabels} from "./web-search-providers.mjs";

export type SearchProvider=keyof typeof searchProviderLabels;
export const searchAccessKey="agenthire.web-search.session";
export const webRefreshNoticeKey="agenthire.web-refresh.notice";
export const webJobBatchSize=50;

export function readSearchAccess():{provider:SearchProvider;apiKey:string}|undefined{
  try{
    const saved=JSON.parse(sessionStorage.getItem(searchAccessKey)??"null");
    if(isSearchProvider(saved?.provider)&&typeof saved.apiKey==="string")return saved;
  }catch{}
}

export const webSearchErrors:Record<string,string>={
  key_missing:"请在联网刷新设置中选择服务商并填写 API Key。",
  quota_not_configured:"站点的联网次数限制配置有误，请检查设置。",
  quota_exhausted:"此站点今天的联网次数已用完，北京时间每天 08:00 重置。",
  quota_storage_unavailable:"此站点暂时无法读取联网额度，请稍后重试。",
  invalid_provider:"请选择可用的联网搜索服务商。",
  invalid_api_key:"请填写有效的 API Key。",
  web_search_unavailable:"联网搜索暂时不可用，请稍后再试。",
  invalid_limit:"联网请求的批次数量有误。",
};

export async function fetchWebJobs(query:string,signal:AbortSignal,limit:number){
  const access=readSearchAccess();
  const response=await fetch("/api/jobs/web-search",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query,limit,...access}),signal,
  });
  if(response.status===404)throw new Error("当前站点暂未接入联网搜索。");
  const payload=await response.json();
  if(!response.ok){
    const provider=access?.provider??"deepseek";
    const label=searchProviderLabels[provider];
    const providerErrors:Record<string,string>={
      [`${provider}_balance_insufficient`]:`${label} 的 API 额度不足，请检查账户。`,
      [`${provider}_key_rejected`]:`${label} 拒绝了该 API Key，请检查密钥和搜索权限。`,
      [`${provider}_rate_limited`]:`${label} 请求太频繁，请稍后重试。`,
    };
    throw new Error(webSearchErrors[payload.error]??providerErrors[payload.error]??"联网搜索暂时不可用。");
  }
  if(!Array.isArray(payload.matches))throw new Error("未能读取联网结果。");
  return mergeWebJobs(payload.matches,[],limit);
}

function comparableQuery(query:string){
  return query.normalize("NFKC").toLowerCase().trim()
    .replace(/\s+/gu," ").replace(/(?<=\p{Script=Han}) (?=\p{Script=Han})/gu,"");
}

export async function refreshWebJobs(preferredQuery:string,limit:number|null,signal?:AbortSignal){
  const saved=findRememberedWebSearch();
  const query=preferredQuery||saved?.query||"";
  const queries=query?[query,...webJobFollowUpTerms.map(prefix=>`${prefix} ${query}`.slice(0,240))]
    :["校园招聘","实习招聘","校招 招聘公告","高校就业网 实习招聘","应届生招聘","企业招聘 实习"];
  let jobs=saved&&comparableQuery(saved.query)===comparableQuery(query)?saved.jobs.slice(0,limit??undefined):[];
  const batchSize=Math.min(limit??webJobBatchSize,webJobBatchSize);
  let partial=false;
  for(const [index,terms] of queries.entries()){
    if(index>0&&limit!==null&&jobs.length>=limit)break;
    signal?.throwIfAborted();
    try{
      const timeout=AbortSignal.timeout(12_000);
      const batch=await fetchWebJobs(terms,signal?AbortSignal.any([signal,timeout]):timeout,batchSize);
      jobs=index===0?mergeWebJobs(batch,jobs,limit):mergeWebJobs(jobs,batch,limit);
    }catch(error){
      signal?.throwIfAborted();
      if(!jobs.length)throw error;
      partial=true;
      break;
    }
  }
  signal?.throwIfAborted();
  const savedJobs=jobs.length?saveWebJobs(jobs,limit):{added:0,total:readWebJobs().length,removed:0};
  return {query:query||"校招和实习",found:jobs.length,limit,partial,...savedJobs};
}

export function formatWebRefreshNotice({query,found,added,total,limit,removed,partial}:Awaited<ReturnType<typeof refreshWebJobs>>){
  const counts=found?`找到 ${found} 条，新增 ${added} 条`:"没有找到匹配岗位";
  const changes=removed?`，移出 ${removed} 条旧结果`:"";
  const capacity=limit===null?`${total}`:`${total}/${limit}`;
  return `联网搜索「${query}」${counts}。列表保留 ${capacity} 条${changes}。${partial?"部分搜索未完成。":""}`;
}
