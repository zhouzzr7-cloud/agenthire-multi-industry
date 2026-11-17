"use client";

import {useEffect,useRef,useState,type FormEvent} from "react";
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

const defaults = {city:"",keywords:"",limit:20};
const preferencesKey="agenthire.web-refresh.preferences";

export function WebJobResults({query="",configurable=false}:{query?:string;configurable?:boolean}){
  const [state,setState]=useState<State>({status:"idle"});
  const [preferences,setPreferences]=useState(defaults);
  const active=useRef<AbortController|null>(null);
  useEffect(()=>()=>active.current?.abort(),[]);
  useEffect(()=>{
    if(!configurable)return;
    try{
      const saved=JSON.parse(localStorage.getItem(preferencesKey)??"null");
      if(saved&&typeof saved.city==="string"&&typeof saved.keywords==="string"&&[10,20,24].includes(saved.limit)){
        setPreferences({city:saved.city.slice(0,48),keywords:saved.keywords.slice(0,180),limit:saved.limit});
      }
    }catch{}
  },[configurable]);

  async function search(committedQuery:string,limit=24){
    if(active.current)return;
    const controller=new AbortController();
    active.current=controller;
    setState({status:"loading"});
    try{
      const response=await fetch("/api/jobs/web-search",{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:committedQuery}),signal:controller.signal,
      });
      if(response.status===404)throw new Error("请用 Wrangler 启动新版 Worker，再试联网搜索。");
      const payload=await response.json();
      if(!response.ok)throw new Error(errors[payload.error]??"联网搜索暂时不可用。");
      if(!Array.isArray(payload.matches))throw new Error("未能读取联网结果。");
      if(!controller.signal.aborted)setState({status:"ready",jobs:payload.matches.slice(0,limit)});
    }catch(error){
      if(!controller.signal.aborted)setState({status:"error",message:error instanceof Error?error.message:"联网搜索失败，请稍后再试。"});
    }finally{
      if(active.current===controller)active.current=null;
    }
  }

  function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const terms=[preferences.city.trim(),preferences.keywords.trim()].filter(Boolean).join(" ");
    if(!terms){
      setState({status:"error",message:"请至少填写城市或岗位关键词。"});
      return;
    }
    try{localStorage.setItem(preferencesKey,JSON.stringify(preferences));}catch{}
    void search(terms,preferences.limit);
  }

  return <section className="hire-results" aria-label="外部招聘结果" aria-busy={state.status==="loading"}>
    {configurable&&<form className="hire-refresh-settings" onSubmit={submit}>
      <label className="hire-filter-select"><span>城市</span>
        <input value={preferences.city} maxLength={48} placeholder="例如：绍兴、杭州"
          onChange={event=>setPreferences({...preferences,city:event.target.value})}/>
      </label>
      <label className="hire-filter-select"><span>岗位关键词</span>
        <input value={preferences.keywords} maxLength={180} placeholder="例如：本科财务实习"
          onChange={event=>setPreferences({...preferences,keywords:event.target.value})}/>
      </label>
      <label className="hire-filter-select"><span>最多显示</span>
        <select value={preferences.limit} onChange={event=>setPreferences({...preferences,limit:Number(event.target.value)})}>
          {[10,20,24].map(limit=><option key={limit} value={limit}>{limit} 条</option>)}
        </select>
      </label>
      <button type="submit" className="hire-apply" disabled={state.status==="loading"}>
        <Globe size={16}/> {state.status==="loading"?"正在联网刷新…":"联网刷新"}
      </button>
    </form>}
    <div className="hire-results-bar">
      {!configurable&&<button type="button" className="hire-apply" onClick={()=>void search(query)} disabled={state.status==="loading"}>
        <Globe size={16}/> {state.status==="loading"?"正在联网搜索…":"联网找更多岗位"}
      </button>}
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
