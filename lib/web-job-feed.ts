export type WebJob = {title:string;snippet:string;publishedAt:string|null;source:string;sourceUrl:string;hostname:string;fetchedAt?:string};
export type WebSearchResults = {jobs:WebJob[];visibleCount:number;completedFollowUps:number};
export const webJobLimit=50;
export const webJobPageSize=12;
export const webJobFollowUpTerms=["职位详情","招聘公告","高校就业网","企业招聘","岗位职责"] as const;
export const preferencesKey="agenthire.web-refresh.preferences";
export const webFeedKey="agenthire.web-refresh.results";
const recentWebJobsKey="agenthire.web-search.recent-results";
const lastWebSearchKey="agenthire.web-search.last-query";
let recentWebJobs:WebJob[]=[];

export function webJobKey(value:string|null){
  try{
    const url=new URL(value??"");
    if(url.protocol!=="https:"||url.username||url.password||url.port)return null;
    for(const key of [...url.searchParams.keys()]){
      if(/^(utm_|spm$|pcm$|from$|source$|tracking$)/iu.test(key))url.searchParams.delete(key);
    }
    url.searchParams.sort();
    return url.hostname.replace(/^www\./u,"")+url.pathname.replace(/\/$/u,"")+url.search;
  }catch{return null;}
}

export function mergeWebJobs(latest:WebJob[],previous:WebJob[],limit:number){
  const seen=new Set<string>();
  return [...latest,...previous].filter(job=>{
    if(!job||typeof job.title!=="string"||typeof job.sourceUrl!=="string"||typeof job.source!=="string"||typeof job.snippet!=="string"||typeof job.hostname!=="string")return false;
    const key=webJobKey(job.sourceUrl);
    if(!key||seen.has(key))return false;
    seen.add(key);
    return true;
  }).slice(0,limit);
}

export function readWebJobs(){
  try{
    const rows=JSON.parse(localStorage.getItem(webFeedKey)??"null");
    const {limit}=JSON.parse(localStorage.getItem(preferencesKey)??"null")??{};
    const cap=Number.isInteger(limit)&&limit>=1&&limit<=webJobLimit?limit:webJobLimit;
    return Array.isArray(rows)?mergeWebJobs([],rows,cap):[];
  }catch{return [];}
}

export function webJobHref(job:WebJob){
  return `/jobs/web/?${new URLSearchParams({id:webJobKey(job.sourceUrl)??""})}`;
}

function readRecentWebJobs():WebJob[]{
  try{
    const rows=JSON.parse(sessionStorage.getItem(recentWebJobsKey)??"null");
    return Array.isArray(rows)?mergeWebJobs(recentWebJobs,rows,webJobLimit):recentWebJobs;
  }catch{return recentWebJobs;}
}

export function rememberWebJobs(jobs:WebJob[]){
  const fetchedAt=new Date().toISOString();
  recentWebJobs=mergeWebJobs(jobs.map(job=>({...job,fetchedAt:job.fetchedAt??fetchedAt})),readRecentWebJobs(),webJobLimit);
  try{
    sessionStorage.setItem(recentWebJobsKey,JSON.stringify(recentWebJobs));
  }catch{}
}

export function findStoredWebJob(id:string|null){
  return id?[...readRecentWebJobs(),...readWebJobs()].find(job=>webJobKey(job.sourceUrl)===id):undefined;
}

export function rememberWebSearch(query:string,results:WebSearchResults){
  rememberWebJobs(results.jobs);
  try{sessionStorage.setItem(lastWebSearchKey,JSON.stringify({query,...results}));}catch{}
}

export function findRememberedWebSearch(query:string){
  try{
    const saved=JSON.parse(sessionStorage.getItem(lastWebSearchKey)??"null");
    if(saved?.query===query&&Array.isArray(saved.jobs))return {
      jobs:mergeWebJobs([],saved.jobs,webJobLimit),
      visibleCount:Number.isInteger(saved.visibleCount)&&saved.visibleCount>=webJobPageSize
        ?Math.min(saved.visibleCount,webJobLimit):webJobPageSize,
      completedFollowUps:Number.isInteger(saved.completedFollowUps)&&saved.completedFollowUps>=0
        ?Math.min(saved.completedFollowUps,webJobFollowUpTerms.length)
        :Number(saved.searchedMore===true),
    };
  }catch{}
  return null;
}

export function matchesWebJob(job:WebJob,params:URLSearchParams){
  const status=params.get("status");
  if(status&&status!=="unverified")return false;
  if(["category","education","specialty","type","year","size","team","bachelor","fresh","experience","remote"]
    .some(key=>params.get(key)))return false;
  const text=(job.title+" "+job.snippet+" "+job.source).toLowerCase();
  const city=params.get("city");
  if(city&&(city==="其他"||!text.includes(city.toLowerCase())))return false;
  const track=params.get("track");
  if(track==="internship"&&!text.includes("实习"))return false;
  if(track==="campus"&&!/校招|校园招聘|应届/.test(text))return false;
  if(track==="social"&&!/社招|社会招聘|全职/.test(text))return false;
  const days=Number(params.get("days"));
  if(days){
    const age=Date.now()-Date.parse(job.publishedAt??"");
    if(!Number.isFinite(age)||age<0||age>days*86400000)return false;
  }
  return (params.get("q")??"").trim().toLowerCase().split(/\s+/).every(word=>text.includes(word));
}
