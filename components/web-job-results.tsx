"use client";

import {useEffect,useRef,useState,type FormEvent} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ArrowLeft,ArrowUpRight,Check,CircleAlert,Globe,RefreshCw,Settings} from "lucide-react";
import {mergeWebJobs,preferencesKey,readWebJobs,webFeedKey,webJobLimit,type WebJob} from "@/lib/web-job-feed";

type State =
  | {status:"idle"|"loading"}
  | {status:"ready";jobs:WebJob[]}
  | {status:"error";message:string};

const errors: Record<string,string> = {
  key_missing:"联网搜索需要配置 DeepSeek API Key。",
  quota_not_configured:"站点的联网次数限制配置有误，请检查设置。",
  quota_exhausted:"此站点今天的联网次数已用完，北京时间每天 08:00 重置。",
  quota_storage_unavailable:"此站点暂时无法读取联网额度，请稍后重试。",
  deepseek_balance_insufficient:"DeepSeek API 账户余额不足。请到 DeepSeek 开放平台检查余额。",
  deepseek_key_rejected:"当前 DeepSeek API Key 无法使用，请检查配置。",
  deepseek_rate_limited:"DeepSeek 请求太频繁，请稍后重试。",
  web_search_unavailable:"联网搜索暂时不可用，请稍后再试。",
  invalid_limit:"请输入 1 到 50 之间的整数。",
};

const defaults = {city:"",keywords:"",limit:20};
async function fetchWebJobs(query:string,signal:AbortSignal,limit?:number){
  const response=await fetch("/api/jobs/web-search",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query,limit}),signal,
  });
  if(response.status===404)throw new Error("当前站点暂未接入联网搜索。");
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

  return <section className="hire-web-results" aria-labelledby="web-results-heading" aria-busy={state.status==="loading"}>
    <div className="hire-web-toolbar">
      <div className="hire-web-heading">
        <span className="hire-company-mark"><Globe size={20} aria-hidden="true"/></span>
        <div><h2 id="web-results-heading">联网找岗位</h2><p>查找招聘原页，投递前请核对在招状态。</p></div>
      </div>
      <button type="button" className="button secondary" onClick={search} disabled={state.status==="loading"}>
        {state.status==="loading"?"正在联网搜索…":state.status==="idle"?"搜索外部岗位":"重新搜索"}
      </button>
    </div>
    <div role="status">
      {state.status==="error"&&<p className="hire-web-status hire-web-warning"><CircleAlert size={16} aria-hidden="true"/>{state.message}</p>}
      {state.status==="ready"&&<p className="hire-web-status">{state.jobs.length
        ?`找到 ${state.jobs.length} 条外部岗位`
        :"没有找到新的招聘原页。可以换个岗位关键词或放宽城市条件。"}</p>}
    </div>
    {state.status==="ready"&&state.jobs.length>0&&
      <div className="hire-role-list">{state.jobs.map(job=><WebJobCard key={job.sourceUrl} job={job}/>)}</div>}
  </section>;
}

export function WebJobSettings(){
  const router=useRouter();
  const [preferences,setPreferences]=useState({city:defaults.city,keywords:defaults.keywords,limit:String(defaults.limit)});
  const [notice,setNotice]=useState<{type:"success"|"warning";message:string}>();
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
    if(!Number.isInteger(limit)||limit<1||limit>webJobLimit){setNotice({type:"warning",message:errors.invalid_limit});return;}
    if(refresh&&!terms){setNotice({type:"warning",message:"请至少填写城市或岗位关键词。"});return;}
    try{
      localStorage.setItem(preferencesKey,JSON.stringify({...preferences,limit}));
    }catch{setNotice({type:"warning",message:"浏览器无法保存设置。"});return;}
    if(!refresh){setNotice({type:"success",message:"设置已保存。"});return;}

    const controller=new AbortController();
    active.current=controller;
    setBusy(true);
    setNotice(undefined);
    try{
      const jobs=await fetchWebJobs(terms,controller.signal,limit);
      if(controller.signal.aborted)return;
      if(!jobs.length){setNotice({type:"warning",message:"本次没有找到新的招聘链接。试试其他城市或关键词。"});return;}
      const fetchedAt=new Date().toISOString();
      const rows=mergeWebJobs(jobs.map(job=>({...job,fetchedAt})),readWebJobs(),limit);
      localStorage.setItem(webFeedKey,JSON.stringify(rows));
      router.push("/jobs/");
    }catch(error){
      if(!controller.signal.aborted)setNotice({type:"warning",message:error instanceof Error?error.message:"联网刷新失败。"});
    }finally{
      active.current=null;
      if(!controller.signal.aborted)setBusy(false);
    }
  }

  return <div className="container hire-board">
    <section className="hire-board-head">
      <Link href="/jobs/" className="back-link"><ArrowLeft size={16} aria-hidden="true"/> 返回岗位列表</Link>
      <div className="hire-board-title"><div><h1>联网刷新设置</h1><p>设置搜索条件，刷新后在岗位列表查看外部招聘结果。</p></div></div>
    </section>
    <form className="hire-refresh-settings" onSubmit={submit} aria-busy={busy} aria-labelledby="refresh-filters">
      <div className="hire-web-heading">
        <span className="hire-company-mark"><Settings size={20} aria-hidden="true"/></span>
        <div><h2 id="refresh-filters">搜索条件</h2><p>设置和刷新结果保存在当前浏览器。</p></div>
      </div>
      <fieldset className="hire-refresh-fields" disabled={busy} aria-labelledby="refresh-filters">
        <label className="hire-filter-select"><span>城市</span>
          <input value={preferences.city} maxLength={48} placeholder="如绍兴、杭州"
            onChange={event=>setPreferences({...preferences,city:event.target.value})}/>
        </label>
        <label className="hire-filter-select"><span>岗位关键词</span>
          <input value={preferences.keywords} maxLength={180} placeholder="如本科 AI Agent 实习"
            onChange={event=>setPreferences({...preferences,keywords:event.target.value})}/>
        </label>
        <label className="hire-filter-select"><span>最多显示的岗位数</span>
          <input type="number" min={1} max={webJobLimit} step={1} required value={preferences.limit}
            onChange={event=>setPreferences({...preferences,limit:event.target.value})}/>
        </label>
      </fieldset>
      <div className="hire-refresh-actions">
        <button type="submit" value="save" className="button secondary" disabled={busy}>保存设置</button>
        <button type="submit" value="refresh" className="button primary" disabled={busy}>
          <RefreshCw size={16} aria-hidden="true"/> {busy?"正在联网刷新…":"刷新并查看岗位"}
        </button>
      </div>
      <div role="status">{notice&&<p className={`hire-web-status hire-web-${notice.type}`}>
        {notice.type==="success"?<Check size={16} aria-hidden="true"/>:<CircleAlert size={16} aria-hidden="true"/>}
        {notice.message}
      </p>}</div>
    </form>
  </div>;
}

export function WebJobCard({job}:{job:WebJob}){
  return <article className="job-card hire-role hire-web-card">
        <div className="hire-company-mark" aria-hidden="true"><Globe size={20}/></div>
        <div className="hire-role-body">
          <div className="hire-role-company">{job.source}<span className="status status-unverified">外部招聘 · 在招待确认</span></div>
          <h3><a href={job.sourceUrl} target="_blank" rel="noopener noreferrer">{job.title}</a></h3>
          <div className="hire-role-meta"><span>{job.hostname}</span>{job.publishedAt&&<span>网页发布 {job.publishedAt}</span>}</div>
          {job.snippet&&<p className="hire-web-snippet">{job.snippet}</p>}
        </div>
        <div className="hire-role-actions"><a className="hire-apply" href={job.sourceUrl} target="_blank" rel="noopener noreferrer">
          查看招聘原页 <ArrowUpRight size={15}/>
        </a></div>
  </article>;
}
