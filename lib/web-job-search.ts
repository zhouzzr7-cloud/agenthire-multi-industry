import {findRememberedWebSearch,mergeWebJobs,readSavedWebJobs,saveWebJobs,webJobFollowUpTerms,webJobKey,type WebJob} from "./web-job-feed";
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

const sourceSearchHints=[...webJobFollowUpTerms.slice(1),"招聘官网","实习僧","牛客招聘","猎聘","大学生就业服务平台","就业信息网"];
const computingSearchHints=["后端开发","前端开发","软件测试","数据开发","算法工程师","运维工程师","网络安全","嵌入式软件","全栈开发","数据库工程师","云计算","软件研发"];
const broadComputingKeyword=/计算机(?:类|方向)?(?=$|[\s，,、]|实习|校招|社招|全职|本科|硕士)/u;

function refreshSearchPlan(query:string){
  const computing=broadComputingKeyword.test(query);
  const hints=computing?computingSearchHints:sourceSearchHints;
  const key=`agenthire.web-refresh.next-scope:${comparableQuery(query)}`;
  let offset=0;
  try{
    const stored=Number(sessionStorage.getItem(key));
    if(Number.isInteger(stored)&&stored>=0&&stored<hints.length)offset=stored;
  }catch{}
  const base=query||"校园招聘";
  const terms=[base,query?`职位详情 ${query}`.slice(0,240):"实习招聘"];
  for(let index=0;index<4;index++){
    const hint=hints[(offset+index)%hints.length];
    terms.push((computing?query.replace(broadComputingKeyword,hint):`${hint} ${base}`).slice(0,240));
  }
  return {terms,key,offset,scopeCount:hints.length};
}

export async function refreshWebJobs(preferredQuery:string,limit:number|null,signal?:AbortSignal){
  const saved=findRememberedWebSearch();
  const query=preferredQuery||saved?.query||"";
  const {terms,key,offset,scopeCount}=refreshSearchPlan(query);
  const previous=readSavedWebJobs();
  const known=new Set(previous.map(job=>webJobKey(job.sourceUrl)));
  const isNew=(job:WebJob)=>!known.has(webJobKey(job.sourceUrl));
  let jobs=saved&&comparableQuery(saved.query)===comparableQuery(query)?saved.jobs:[];
  const batchSize=Math.min(limit??webJobBatchSize,webJobBatchSize);
  let partial=false;
  let completedScopes=0;
  for(const [index,searchTerm] of terms.entries()){
    if(index>0&&limit!==null&&jobs.length>=limit&&jobs.some(isNew))break;
    signal?.throwIfAborted();
    try{
      const timeout=AbortSignal.timeout(12_000);
      const batch=await fetchWebJobs(searchTerm,signal?AbortSignal.any([signal,timeout]):timeout,batchSize);
      jobs=index===0?mergeWebJobs(batch,jobs):mergeWebJobs(jobs,batch);
      if(index>=2)completedScopes++;
    }catch(error){
      signal?.throwIfAborted();
      if(!jobs.length)throw error;
      partial=true;
      break;
    }
  }
  signal?.throwIfAborted();
  const rows=limit!==null&&jobs.length>limit?mergeWebJobs(jobs.filter(isNew),jobs,limit):jobs;
  const savedJobs=rows.length?saveWebJobs(rows,limit):{added:0,total:Math.min(previous.length,limit??previous.length),removed:0};
  if(completedScopes){
    try{sessionStorage.setItem(key,String((offset+completedScopes)%scopeCount));}catch{}
  }
  return {query:query||"校招和实习",found:jobs.length,limit,partial,...savedJobs};
}

export function formatWebRefreshNotice({query,found,added,total,limit,removed,partial}:Awaited<ReturnType<typeof refreshWebJobs>>){
  const counts=found?`找到 ${found} 条${added?`，新增 ${added} 条`:"，均已收录"}`:"没有找到匹配岗位";
  const changes=removed?`，移出 ${removed} 条旧结果`:"";
  const capacity=limit===null?`${total}`:`${total}/${limit}`;
  return `联网搜索「${query}」${counts}。列表保留 ${capacity} 条${changes}。${partial?"部分搜索未完成。":""}`;
}
