"use client";

import {useEffect,useRef,useState,type FormEvent} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ArrowUpRight,Globe} from "lucide-react";
import {mergeWebJobs,preferencesKey,readWebJobs,webFeedKey,webJobLimit,type WebJob} from "@/lib/web-job-feed";

type State =
  | {status:"idle"|"loading"}
  | {status:"ready";jobs:WebJob[]}
  | {status:"error";message:string};

const errors: Record<string,string> = {
  key_missing:"请在 Worker 的 .env 中配置 DEEPSEEK_API_KEY，然后重启 Wrangler。",
  quota_not_configured:"此部署尚未开启联网搜索。",
  quota_exhausted:"此站点今天的联网次数已用完，北京时间每天 08:00 重置。",
  quota_storage_unavailable:"此站点暂时无法读取联网额度，请稍后重试。",
  deepseek_balance_insufficient:"DeepSeek API 账户余额不足。请到 DeepSeek 开放平台检查余额。",
  deepseek_key_rejected:"DeepSeek 拒绝了当前 API Key。请检查 .env 后重启 Wrangler。",
  deepseek_rate_limited:"DeepSeek 请求太频繁，请稍后重试。",
  web_search_unavailable:"联网搜索暂时不可用，请稍后再试。",
  invalid_limit:"请输入 1 到 50 之间的整数。",
};

const defaults = {city:"",keywords:"",limit:20};
async function fetchWebJobs(query:string,signal:AbortSignal,limit?:number){
  const response=await fetch("/api/jobs/web-search",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query,limit}),signal,
  });
  if(response.status===404)throw new Error("请用 Wrangler 启动新版 Worker，再试联网搜索。");
  const payload=await response.json();
  if(!response.ok)throw new Error(errors[payload.error]??"联网搜索暂时不可用。");
  if(!Array.isArray(payload.matches))throw new Error("未能读取联网结果。");
  return mergeWebJobs(payload.matches,[],limit??24);
}

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
      const jobs=await fetchWebJobs(query,controller.signal);
      if(!controller.signal.aborted)setState({status:"ready",jobs});
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
      ?<div className="hire-role-list">{state.jobs.map(job=><WebJobCard key={job.sourceUrl} job={job}/>)}</div>
      :<p role="status">没有找到新的招聘原页。可以换个岗位关键词或放宽城市条件。</p>)}
  </section>;
}

export function WebJobSettings(){
  const router=useRouter();
  const [preferences,setPreferences]=useState({city:defaults.city,keywords:defaults.keywords,limit:String(defaults.limit)});
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const active=useRef<AbortController|null>(null);
  useEffect(()=>{
    try{
      const saved=JSON.parse(localStorage.getItem(preferencesKey)??"null");
      if(saved&&typeof saved.city==="string"&&typeof saved.keywords==="string"&&Number.isInteger(saved.limit)&&saved.limit>=1&&saved.limit<=webJobLimit){
        setPreferences({city:saved.city.slice(0,48),keywords:saved.keywords.slice(0,180),limit:String(saved.limit)});
      }
    }catch{}
    return ()=>active.current?.abort();
  },[]);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(active.current)return;
    const limit=Number(preferences.limit);
    const terms=[preferences.city.trim(),preferences.keywords.trim()].filter(Boolean).join(" ");
    const refresh=(event.nativeEvent as SubmitEvent).submitter?.getAttribute("value")==="refresh";
    if(!Number.isInteger(limit)||limit<1||limit>webJobLimit){setMessage(errors.invalid_limit);return;}
    if(refresh&&!terms){setMessage("请至少填写城市或岗位关键词。");return;}
    try{
      localStorage.setItem(preferencesKey,JSON.stringify({...preferences,limit}));
    }catch{setMessage("浏览器无法保存设置。");return;}
    if(!refresh){setMessage("设置已保存。");return;}

    const controller=new AbortController();
    active.current=controller;
    setBusy(true);
    setMessage("");
    try{
      const jobs=await fetchWebJobs(terms,controller.signal,limit);
      if(controller.signal.aborted)return;
      if(!jobs.length){setMessage("没有找到新的招聘链接，原列表已保留。");return;}
      const fetchedAt=new Date().toISOString();
      const rows=mergeWebJobs(jobs.map(job=>({...job,fetchedAt})),readWebJobs(),limit);
      localStorage.setItem(webFeedKey,JSON.stringify(rows));
      router.push("/jobs/");
    }catch(error){
      if(!controller.signal.aborted)setMessage(error instanceof Error?error.message:"联网刷新失败。");
    }finally{
      active.current=null;
      if(!controller.signal.aborted)setBusy(false);
    }
  }

  return <div className="container hire-board">
    <section className="hire-board-head">
      <div className="hire-board-title"><div><h1>联网刷新设置</h1><p>刷新找到的岗位会加入岗位列表。</p></div>
        <Link href="/jobs/" className="hire-apply">返回岗位列表</Link>
      </div>
    </section>
    <form className="hire-refresh-settings" onSubmit={submit} aria-busy={busy}>
      <label className="hire-filter-select"><span>城市</span>
        <input value={preferences.city} maxLength={48} placeholder="例如：绍兴、杭州"
          onChange={event=>setPreferences({...preferences,city:event.target.value})}/>
      </label>
      <label className="hire-filter-select"><span>岗位关键词</span>
        <input value={preferences.keywords} maxLength={180} placeholder="例如：本科财务实习"
          onChange={event=>setPreferences({...preferences,keywords:event.target.value})}/>
      </label>
      <label className="hire-filter-select"><span>最多显示</span>
        <input type="number" min={1} max={webJobLimit} step={1} required value={preferences.limit}
          onChange={event=>setPreferences({...preferences,limit:event.target.value})}/>
      </label>
      <div className="hire-refresh-actions">
        <button type="submit" value="save" className="hire-apply" disabled={busy}>保存设置</button>
        <button type="submit" value="refresh" className="hire-apply" disabled={busy}>
          <Globe size={16}/> {busy?"正在联网刷新…":"刷新并查看岗位"}
        </button>
      </div>
    </form>
    <p role="status">{message}</p>
  </div>;
}

export function WebJobCard({job}:{job:WebJob}){
  return <article className="job-card hire-role">
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
  </article>;
}
