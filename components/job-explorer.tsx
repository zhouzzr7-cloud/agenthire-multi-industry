"use client";

import {useSearchParams} from "next/navigation";
import {useEffect, useState} from "react";
import Link from "next/link";
import {ArrowRight, Bookmark, Search, Settings, SlidersHorizontal, X} from "lucide-react";
import {bachelorEligible, educationLabels, getCareerJobs, isOpenJob, isTeamOpportunity, jobCities, queryJobs, statusLabels} from "@/lib/jobs";
import {AIJobSearch,AIJobSearchForm} from "./ai-job-search";
import {WebJobCard} from "./web-job-results";
import {matchesWebJob,readWebJobs,webJobKey,type WebJob} from "@/lib/web-job-feed";
import {JobCard} from "./job-card";
import {RefreshJobsButton,RefreshLabel,useLiveJobs} from "./live-jobs";
import {useFavorites} from "./shell";

const pageSize=20;
const tracks=[["","全部岗位"],["internship","实习"],["campus","校招"],["social","全职 / 社招"]];
const featuredCities=["上海","杭州","绍兴"];
const categoryNames={"agent-application":"Agent 应用","agent-infra":"Agent 基础设施","ai-infra":"AI 基础设施"};

export function JobExplorer({favorites=false}:{favorites?:boolean}){
  const searchParams=useSearchParams();
  const [params,setParams]=useState(()=>new URLSearchParams(searchParams.toString()));
  const [advanced,setAdvanced]=useState(false);
  const [limit,setLimit]=useState(pageSize);
  const [webJobs,setWebJobs]=useState<WebJob[]>([]);
  const {ids,ready}=useFavorites();
  const {jobs,feed,state,reload}=useLiveJobs();
  useEffect(()=>{
    setParams(new URLSearchParams(searchParams.toString()));
    setLimit(pageSize);
  },[searchParams]);
  useEffect(()=>{
    if(favorites)return;
    const load=()=>setWebJobs(readWebJobs());
    load();
    window.addEventListener("pageshow",load);
    window.addEventListener("storage",load);
    return ()=>{
      window.removeEventListener("pageshow",load);
      window.removeEventListener("storage",load);
    };
  },[favorites,searchParams]);

  const records=favorites?[...jobs,...getCareerJobs()].filter(job=>ids.includes(job.id)):jobs;
  const matched=queryJobs(params,records);
  const knownUrls=new Set(records.filter(isOpenJob).flatMap(job=>[webJobKey(job.sourceUrl),webJobKey(job.applyUrl)]));
  const external=favorites?[]:webJobs.filter(job=>!knownUrls.has(webJobKey(job.sourceUrl)));
  const matchedExternal=external.filter(job=>matchesWebJob(job,params));
  const results=[
    ...matchedExternal.map(job=>({type:"web" as const,job,salary:-1,published:job.publishedAt,updated:job.fetchedAt})),
    ...matched.map(job=>({type:"site" as const,job,salary:job.salaryMonthly??-1,published:job.publishedAt,updated:job.updatedAt})),
  ];
  const stamp=(date:string|null|undefined)=>Date.parse(date??"")||0;
  if(params.get("sort")==="salary")results.sort((a,b)=>b.salary-a.salary||(a.type===b.type?0:a.type==="site"?-1:1));
  if(params.get("sort")==="newest")results.sort((a,b)=>stamp(b.published)-stamp(a.published));
  if(params.get("sort")==="updated")results.sort((a,b)=>stamp(b.updated)-stamp(a.updated));
  const active=records.filter(isOpenJob);
  const teamCount=active.filter(isTeamOpportunity).length;
  const otherCities=Array.from(new Set(active.flatMap(jobCities))).filter(city=>!featuredCities.includes(city)).sort((a,b)=>a.localeCompare(b,"zh"));
  const sizes=Array.from(new Set(jobs.map(job=>job.companySize)));
  const years=Array.from(new Set(jobs.flatMap(job=>job.graduationYear?[String(job.graduationYear)]:[]))).sort();
  const specialties=Array.from(new Set(jobs.map(job=>job.specialty)));
  const types=Array.from(new Set(jobs.map(job=>job.recruitmentType)));
  const get=(key:string)=>params.get(key)??"";
  const change=(key:string,value:string)=>{
    const next=new URLSearchParams(params);
    if(value)next.set(key,value);else next.delete(key);
    update(next);
  };
  function update(next:URLSearchParams){
    setParams(next);
    setLimit(pageSize);
    const suffix=next.toString();
    window.history.replaceState(null,"",window.location.pathname+(suffix?"?"+suffix:""));
  }
  const reset=()=>update(new URLSearchParams());
  const strings=(values:string[])=>values.map(value=>[value,value]);
  const select=(label:string,key:string,options:string[][],all="全部")=><label className="hire-filter-select"><span>{label}</span><select value={get(key)} onChange={event=>change(key,event.target.value)}><option value="">{all}</option>{options.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>;
  const aiQuery=searchParams.get("ai")?.trim();
  if(!favorites&&aiQuery&&aiQuery.length<=240)return <AIJobSearch query={aiQuery} liveJobs={feed.jobs}/>;

  return <div className="container hire-board">
    <section className="hire-board-head">
      <p className="hire-overline">{favorites?"YOUR SHORTLIST":"THE OPPORTUNITY INDEX"}</p>
      <div className="hire-board-title">
        <div><h1>{favorites?"我的收藏":"探索岗位"}</h1><p>{favorites?"把想投递的机会留在这里。":"找 Agent 应用、Harness、Runtime 和 AI 基础设施机会。"}</p></div>
        {!favorites&&<div className="hire-board-pulse">
          <span><i/><RefreshLabel feed={feed} state={state}/></span>
          <small>{active.length+external.length} 条岗位 · {active.filter(job=>bachelorEligible(job.education)===true).length} 条本科可投</small>
        </div>}
      </div>
      <div className="hire-search hire-board-search"><Search size={21}/><input aria-label="搜索岗位" placeholder="搜索职位、公司、城市或技术栈" value={get("q")} onChange={event=>change("q",event.target.value)}/>{get("q")&&<button type="button" className="hire-search-clear" aria-label="清空搜索" onClick={()=>change("q","")}><X size={18}/></button>}</div>
      {!favorites&&<AIJobSearchForm/>}
      {!favorites&&(feed.manualRefresh||feed.webSearchEnabled)&&<div className="hire-board-tools">
        {feed.manualRefresh&&<RefreshJobsButton onRefresh={reload}/>}
        <Link href="/jobs/settings/" className="hire-apply"><Settings size={15} aria-hidden="true"/> 联网刷新设置</Link>
      </div>}
    </section>
    <div className="hire-track" aria-label="快速筛选">{tracks.map(([value,label])=><button type="button" aria-pressed={get("track")===value} key={label} onClick={()=>change("track",value)}>{label}</button>)}<button className="hire-team-toggle" type="button" aria-pressed={get("team")==="1"} onClick={()=>change("team",get("team")==="1"?"":"1")}>中小与创业团队 <span>{teamCount}</span></button></div>
    <div className="hire-board-layout">
      <aside className="hire-filters">
        <div className="hire-filter-head"><span><SlidersHorizontal size={16}/> 筛选</span><button onClick={reset}>重置</button></div>
        {select("工作城市","city",strings([...featuredCities,...otherCities,"其他"]))}
        {select("技术方向","category",Object.entries(categoryNames))}
        {select("学历要求","education",[["eligible","本科可投"],...Object.entries(educationLabels)])}
        {select("数据状态","status",Object.entries(statusLabels),"真实来源（未关闭）")}
        <button className="hire-filter-more" aria-expanded={advanced} onClick={()=>setAdvanced(!advanced)}>{advanced?"收起更多筛选":"更多筛选"} <span>{advanced?"−":"+"}</span></button>
        {advanced&&<div className="hire-advanced">
          {select("细分方向","specialty",strings(specialties))}
          {select("招聘类型","type",strings(types))}
          {select("毕业届别","year",years.map(year=>[year,`${year} 届`]))}
          {select("公司规模","size",strings(sizes))}
          {select("发布时间","days",[["7","最近 7 天"],["30","最近 30 天"]])}
          {[["bachelor","本科可投"],["fresh","应届生可投"],["experience","无工作经验要求"],["remote","远程办公"]].map(([key,label])=><label className="hire-checkbox" key={key}><input type="checkbox" checked={get(key)==="1"} onChange={event=>change(key,event.target.checked?"1":"")}/>{label}</label>)}
        </div>}
      </aside>
      <section className="hire-results" aria-label="搜索结果">
        <div className="hire-results-bar"><div aria-live="polite"><strong>{results.length}</strong> 个{favorites?"收藏":"匹配"}岗位{matchedExternal.length>0&&<small> · {matchedExternal.length} 条联网</small>}</div>{select("排序","sort",[["newest","最新发布"],["updated","最近更新"],["salary","月薪从高到低"]],"综合排序")}</div>
        {favorites&&!ready?<p className="hire-empty">正在读取收藏…</p>:state==="loading"&&get("team")==="1"&&!results.length?<p className="hire-empty" role="status">正在读取中小与创业团队岗位…</p>:results.length?
          <div className="hire-role-list">{results.slice(0,limit).map(result=>result.type==="web"
            ?<WebJobCard key={result.job.sourceUrl} job={result.job}/>
            :<JobCard key={result.job.id} job={result.job}/>)}</div>:
          <div className="hire-empty">{favorites&&!ids.length?<Bookmark size={28}/>:<Search size={28}/>}<h2>{favorites&&!ids.length?"还没有收藏":"没有匹配的岗位"}</h2><p>{favorites&&!ids.length?"点击岗位旁的收藏图标，方便回来查看。":"换个关键词，或放宽城市、学历等筛选条件。"}</p>{favorites&&!ids.length?<Link href="/jobs/">探索岗位 <ArrowRight size={16}/></Link>:<button onClick={reset}>清除筛选</button>}</div>}
        {results.length>limit&&<button className="hire-load" onClick={()=>setLimit(limit+pageSize)}>显示更多岗位 <span>{limit} / {results.length}</span></button>}
      </section>
    </div>
  </div>;
}
