"use client";

import {useEffect,useRef,useState} from "react";
import {ArrowUpRight,Globe} from "lucide-react";

type WebJob = {title:string; snippet:string; publishedAt:string|null; source:string; sourceUrl:string; hostname:string};
type State =
  | {status:"idle"|"loading"}
  | {status:"ready";jobs:WebJob[]}
  | {status:"error";message:string};

const errors: Record<string,string> = {
  key_missing:"请先在 Worker 中配置 DeepSeek API Key。",
  quota_unavailable:"联网额度已用完或未配置。站内岗位仍可查看。",
  web_search_unavailable:"联网搜索暂时不可用，请稍后再试。",
};

export function WebJobResults({query}:{query:string}){
  const [state,setState]=useState<State>({status:"idle"});
  const active=useRef<AbortController|null>(null);
  useEffect(()=>()=>active.current?.abort(),[]);

  async function search(){
    if(active.current)return;
    const controller=new AbortController();
    active.current=controller;
    setState({status:"loading"});
    try{
      const response=await fetch("/api/jobs/web-search",{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query}),signal:controller.signal,
      });
      if(response.status===404)throw new Error("请用 Wrangler 启动新版 Worker，再试联网搜索。");
      const payload=await response.json();
      if(!response.ok)throw new Error(errors[payload.error]??"联网搜索暂时不可用。");
      if(!Array.isArray(payload.matches))throw new Error("未能读取联网结果。");
      if(!controller.signal.aborted)setState({status:"ready",jobs:payload.matches});
    }catch(error){
      if(!controller.signal.aborted)setState({status:"error",message:error instanceof Error?error.message:"联网搜索失败，请稍后再试。"});
    }finally{
      if(active.current===controller)active.current=null;
    }
  }

  return <section className="hire-results" aria-label="外部招聘结果" aria-busy={state.status==="loading"}>
    <div className="hire-results-bar">
      <button type="button" className="hire-apply" onClick={search} disabled={state.status==="loading"}>
        <Globe size={16}/> {state.status==="loading"?"正在联网搜索…":"联网找更多岗位"}
      </button>
      {state.status==="ready"&&<span role="status">{state.jobs.length} 条外部招聘结果</span>}
    </div>
    {state.status==="error"&&<p role="status">{state.message}</p>}
    {state.status==="ready"&&(state.jobs.length>0
      ?<div className="hire-role-list">{state.jobs.map(job=><article key={job.sourceUrl} className="job-card hire-role">
        <div className="hire-company-mark" aria-hidden="true"><Globe size={20}/></div>
        <div className="hire-role-body">
          <div className="hire-role-company">{job.source}<span className="status status-unverified">外部招聘 · 在招待确认</span></div>
          <h3><a href={job.sourceUrl} target="_blank" rel="noopener noreferrer">{job.title}</a></h3>
          <div className="hire-role-meta"><span>{job.hostname}</span>{job.publishedAt&&<span>网页发布 {job.publishedAt}</span>}</div>
          {job.snippet&&<p>{job.snippet}</p>}
        </div>
        <div className="hire-role-actions"><a className="hire-apply" href={job.sourceUrl} target="_blank" rel="noopener noreferrer">
          查看招聘原页 <ArrowUpRight size={15}/>
        </a></div>
      </article>)}</div>
      :<p role="status">没有找到新的招聘原页。可以换个岗位关键词或放宽城市条件。</p>)}
  </section>;
}
