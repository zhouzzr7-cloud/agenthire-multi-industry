import {mergeWebJobs,saveWebJobs} from "./web-job-feed";
import {isSearchProvider,searchProviderLabels} from "./web-search-providers.mjs";

export type SearchProvider=keyof typeof searchProviderLabels;
export const searchAccessKey="agenthire.web-search.session";

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
  invalid_limit:"请输入 1 到 50 之间的整数。",
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

export async function refreshWebJobs(query:string,signal:AbortSignal,limit:number){
  let jobs=await fetchWebJobs(query||"校园招聘",signal,limit);
  let partial=false;
  if(jobs.length<limit){
    const followUp=query?`职位详情 ${query}`.slice(0,240):"实习招聘";
    try{
      jobs=mergeWebJobs(jobs,await fetchWebJobs(followUp,signal,limit),limit);
    }catch(error){
      if(!jobs.length)throw error;
      partial=true;
    }
  }
  signal.throwIfAborted();
  return {found:jobs.length,added:jobs.length?saveWebJobs(jobs,limit):0,partial};
}
