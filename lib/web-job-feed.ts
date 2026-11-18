import {commonJobCities} from "./job-search.mjs";
import {webJobSummaryRows} from "./web-job-summary";

export type WebJob = {title:string;snippet:string;publishedAt:string|null;source:string;sourceUrl:string;hostname:string;fetchedAt?:string};
export type WebSearchResults = {jobs:WebJob[];visibleCount:number;completedFollowUps:number};
export const webJobLimit=50;
export const webJobPageSize=12;
export const webJobFollowUpTerms=["职位详情","招聘公告","高校就业网","企业招聘","岗位职责"] as const;
export const preferencesKey="agenthire.web-refresh.preferences";
const webFeedKey="agenthire.web-refresh.results";
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

export function readWebRefreshPreferences(){
  try{
    const saved=JSON.parse(localStorage.getItem(preferencesKey)??"null");
    return {
      city:typeof saved?.city==="string"?saved.city.slice(0,48):"",
      keywords:typeof saved?.keywords==="string"?saved.keywords.slice(0,180):"",
      limit:Number.isInteger(saved?.limit)&&saved.limit>=1&&saved.limit<=webJobLimit?saved.limit as number:webJobLimit,
    };
  }catch{return {city:"",keywords:"",limit:webJobLimit};}
}

function readSavedWebJobs(){
  try{
    const rows=JSON.parse(localStorage.getItem(webFeedKey)??"null");
    return Array.isArray(rows)?mergeWebJobs([],rows,webJobLimit):[];
  }catch{return [];}
}

export function readWebJobs(){
  return readSavedWebJobs().slice(0,readWebRefreshPreferences().limit);
}

export function saveWebJobs(jobs:WebJob[],limit:number){
  const previous=readSavedWebJobs();
  const known=new Set(previous.map(job=>webJobKey(job.sourceUrl)));
  const fetchedAt=new Date().toISOString();
  const rows=mergeWebJobs(jobs.map(job=>({...job,fetchedAt})),previous,limit);
  localStorage.setItem(webFeedKey,JSON.stringify(rows));
  const added=rows.filter(job=>!known.has(webJobKey(job.sourceUrl))).length;
  return {added,total:rows.length,removed:previous.length+added-rows.length};
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

export function findRememberedWebSearch(query?:string){
  try{
    const saved=JSON.parse(sessionStorage.getItem(lastWebSearchKey)??"null");
    if(typeof saved?.query==="string"&&saved.query.trim()&&saved.query.length<=240
      &&(query===undefined||saved.query===query)&&Array.isArray(saved.jobs))return {
      query:saved.query as string,
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

const computingRole=/计算机|软件(?:开发|工程|测试)|前端|后端|全栈|数据开发|数据库|算法|服务器|运维|网络安全|人工智能|智能体|\b(?:python|java|agent|sre)\b/u;

export function matchesWebJob(job:WebJob,params:URLSearchParams,cities:readonly string[]=commonJobCities){
  const status=params.get("status");
  if(status&&status!=="unverified")return false;
  if(["education","specialty","type","year","size","team","bachelor","fresh","experience","remote"]
    .some(key=>params.get(key)))return false;
  const category=params.get("category");
  if(category&&category!=="technology")return false;
  if(category&&!computingRole.test(job.title.toLowerCase())
    &&!webJobSummaryRows(job.snippet).some(row=>computingRole.test(row.title.toLowerCase())))return false;
  const listing=(job.title+" "+job.snippet).normalize("NFKC").toLowerCase();
  const text=listing+" "+job.source.toLowerCase();
  const city=params.get("city");
  if(city&&(city==="其他"||!listing.includes(city.toLowerCase())))return false;
  const track=params.get("track");
  if(track==="internship"&&!text.includes("实习"))return false;
  if(track==="campus"&&!/校招|校园招聘|应届/.test(text))return false;
  if(track==="social"&&!/社招|社会招聘|全职/.test(text))return false;
  const days=Number(params.get("days"));
  if(days){
    const age=Date.now()-Date.parse(job.publishedAt??"");
    if(!Number.isFinite(age)||age<0||age>days*86400000)return false;
  }
  const query=(params.get("q")??"").normalize("NFKC").trim().toLowerCase();
  const leadingCity=cities.find(value=>query.startsWith(value));
  if(leadingCity&&!listing.includes(leadingCity))return false;
  const keywords=leadingCity?query.slice(leadingCity.length).replace(/^市/u,"").trim():query;
  return keywords.split(/\s+/).every(word=>word==="计算机"?computingRole.test(listing):text.includes(word));
}
