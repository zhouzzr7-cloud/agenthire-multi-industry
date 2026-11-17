"use client";

import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {ArrowRight,Sparkles} from "lucide-react";
import {getCareerJobs,getJobs,type Job} from "@/lib/jobs";
import {searchSiteJobs,type JobSearchResult} from "@/lib/job-search.mjs";
import {JobCard} from "./job-card";
import {WebJobResults} from "./web-job-results";

export function AIJobSearchForm({query=""}:{query?:string}){
  return <form action="/jobs/" className="hire-search hire-ai-form" role="search" aria-label="自然语言岗位搜索">
    <Sparkles size={20} aria-hidden="true"/>
    <input type="search" name="ai" aria-label="描述你想找的岗位" defaultValue={query} maxLength={240} required
      placeholder="例如：杭州本科，找财务实习"/>
    <button type="submit">AI 找岗位 <ArrowRight size={16}/></button>
  </form>;
}

type Answer = {query:string; result:JobSearchResult|null};

export function AIJobSearch({query,liveJobs}:{query:string;liveJobs:Job[]}){
  const jobs = useMemo(()=>[...getJobs(),...getCareerJobs(),...liveJobs],[liveJobs]);
  const [answer,setAnswer]=useState<Answer>();
  const [local,setLocal]=useState<Answer>();
  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/jobs/search",{
      method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query}),signal:controller.signal,
    }).then(async response=>{
      if(!response.ok)throw new Error("search_unavailable");
      const result:JobSearchResult=await response.json();
      if(!Array.isArray(result.matches))throw new Error("search_unavailable");
      if(!controller.signal.aborted)setAnswer({query,result});
    }).catch(()=>{
      if(!controller.signal.aborted)setAnswer({query,result:null});
    });
    return ()=>controller.abort();
  },[query]);

  const usingLocal=answer?.query===query&&answer.result===null;
  useEffect(()=>{
    if(!usingLocal)return;
    let current=true;
    searchSiteJobs(query,jobs).then(result=>{
      if(current)setLocal({query,result});
    }).catch(()=>{
      if(current)setLocal({query,result:{mode:"rules",matches:[]}});
    });
    return ()=>{current=false;};
  },[jobs,query,usingLocal]);

  const result=usingLocal?(local?.query===query?local.result:null):(answer?.query===query?answer.result:null);
  const jobsById=new Map(jobs.map(job=>[job.id,job]));
  const matches=result?.matches.flatMap(match=>{
    const job=jobsById.get(match.id);
    return job?[{job,reason:match.reason}]:[];
  })??[];
  return <div className="container hire-board">
    <section className="hire-board-head">
      <div className="hire-board-title"><div><h1>AI 找岗位</h1><p>搜索计算机、财会、运营和制造方向的校招或实习。</p></div>
        <Link href="/jobs/" className="hire-apply">返回手动筛选 <ArrowRight size={16}/></Link>
      </div>
      <AIJobSearchForm key={query} query={query}/>
    </section>
    <WebJobResults key={query} query={query}/>
    <section className="hire-results" aria-label="岗位匹配结果" aria-busy={!result}>
      {!result?<p className="hire-empty" role="status">正在匹配岗位…</p>:<>
        <div className="hire-results-bar" aria-live="polite">
          <div><strong>{matches.length}</strong> 个匹配岗位</div>
          <small>{result.mode==="deepseek"?"DeepSeek 解析 · 站内岗位":result.mode==="fallback"?"模型暂不可用 · 按站内规则匹配":"按站内规则匹配"}</small>
        </div>
        {matches.length?<div className="hire-role-list">{matches.map(({job,reason})=><JobCard key={job.id} job={job} matchReason={reason}/>)}</div>:
          <div className="hire-empty"><h2>没有匹配的岗位</h2><p>试着调整城市、岗位类型或学历条件。</p></div>}
      </>}
    </section>
  </div>;
}
