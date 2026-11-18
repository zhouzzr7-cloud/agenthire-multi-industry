"use client";

import {useEffect,useRef,useState,type FormEvent} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ArrowLeft,ArrowUpRight,Check,CircleAlert,Globe,RefreshCw,Settings} from "lucide-react";
import {findRememberedWebSearch,mergeWebJobs,preferencesKey,readWebRefreshPreferences,rememberWebSearch,webJobFollowUpTerms,webJobHref,webJobLimit,webJobPageSize,type WebJob,type WebSearchResults} from "@/lib/web-job-feed";
import {fetchWebJobs,readSearchAccess,refreshWebJobs,searchAccessKey,webSearchErrors,type SearchProvider} from "@/lib/web-job-search";
import {withAiSearchQuery} from "@/lib/ai-search-navigation";
import {isSearchProvider,searchProviderLabels} from "@/lib/web-search-providers.mjs";

type State =
  | {status:"idle"|"loading"}
  | ({status:"ready";loadingMore?:boolean;moreError?:string;moreMessage?:string}&WebSearchResults)
  | {status:"error";message:string};

export function WebJobResults({query}:{query:string}){
  const [state,setState]=useState<State>({status:"idle"});
  const active=useRef<AbortController|null>(null);
  useEffect(()=>{
    const saved=findRememberedWebSearch(query);
    if(saved)setState({status:"ready",...saved});
    return ()=>active.current?.abort();
  },[query]);
  function showResults(results:WebSearchResults,moreMessage?:string){
    rememberWebSearch(query,results);
    setState({status:"ready",...results,moreMessage});
  }

  async function search(terms=query,previous?:WebSearchResults){
    if(active.current)return;
    const controller=new AbortController();
    active.current=controller;
    setState(previous?{status:"ready",...previous,loadingMore:true}:{status:"loading"});
    try{
      const jobs=await fetchWebJobs(terms,controller.signal,webJobLimit);
      if(!controller.signal.aborted){
        const matches=previous?mergeWebJobs(previous.jobs,jobs,webJobLimit):jobs;
        const moreMessage=previous&&matches.length===previous.jobs.length?"这轮没有找到新岗位，可以继续搜索。":undefined;
        showResults({
          jobs:matches,
          visibleCount:previous?Math.min(previous.visibleCount+webJobPageSize,webJobLimit):webJobPageSize,
          completedFollowUps:previous?previous.completedFollowUps+1:0,
        },moreMessage);
      }
    }catch(error){
      if(!controller.signal.aborted){
        const message=error instanceof Error?error.message:"联网搜索失败，请稍后再试。";
        setState(previous?{status:"ready",...previous,moreError:message}:{status:"error",message});
      }
    }finally{
      if(active.current===controller)active.current=null;
    }
  }

  const busy=state.status==="loading"||(state.status==="ready"&&state.loadingMore);
  const remaining=state.status==="ready"?Math.max(0,state.jobs.length-state.visibleCount):0;
  const followUp=state.status==="ready"&&state.jobs.length<webJobLimit?webJobFollowUpTerms[state.completedFollowUps]:undefined;

  return <section className="hire-web-results" aria-labelledby="web-results-heading" aria-busy={busy}>
    <div className="hire-web-toolbar">
      <div className="hire-web-heading">
        <span className="hire-company-mark"><Globe size={20} aria-hidden="true"/></span>
        <div><h2 id="web-results-heading">联网找岗位</h2><p>查找招聘原页，投递前请核对在招状态。</p></div>
      </div>
      <div className="hire-web-controls">
        <Link className="hire-apply" href="/jobs/settings/">搜索设置</Link>
        <button type="button" className="button secondary" onClick={()=>void search()} disabled={busy}>
          {state.status==="loading"?"正在联网搜索…":state.status==="idle"?"搜索外部岗位":"重新搜索"}
        </button>
      </div>
    </div>
    <div role="status">
      {state.status==="error"&&<p className="hire-web-status hire-web-warning"><CircleAlert size={16} aria-hidden="true"/>{state.message}</p>}
      {state.status==="ready"&&<p className="hire-web-status">{state.jobs.length
        ?`找到 ${state.jobs.length} 条外部岗位${remaining?`，已显示 ${state.visibleCount} 条`:""}`
        :"没有找到新的招聘原页。可以换个岗位关键词或放宽城市条件。"}</p>}
    </div>
    {state.status==="ready"&&state.jobs.length>0&&
      <div className="hire-role-list">{state.jobs.slice(0,state.visibleCount).map(job=><WebJobCard key={job.sourceUrl} job={job} searchQuery={query}/>)}</div>}
    {state.status==="ready"&&
      <div className="hire-web-more">
        {remaining>0||followUp?<>
          <button type="button" className="button secondary" disabled={busy} onClick={()=>{
            const {jobs,visibleCount,completedFollowUps}=state;
            if(remaining)showResults({jobs,visibleCount:Math.min(visibleCount+webJobPageSize,webJobLimit),completedFollowUps});
            else if(followUp)void search(`${followUp} ${query}`.slice(0,240),{jobs,visibleCount:jobs.length,completedFollowUps});
          }}>{state.loadingMore?"正在搜索更多岗位…":"查看更多岗位"}</button>
          {state.moreMessage&&<p role="status" className="hire-web-status">{state.moreMessage}</p>}
          {state.moreError&&<p role="status" className="hire-web-status hire-web-warning"><CircleAlert size={16} aria-hidden="true"/>{state.moreError}</p>}
        </>:<p role="status" className="hire-web-status">{state.jobs.length>=webJobLimit?`已达到 ${webJobLimit} 条展示上限。`:"本次联网搜索已结束，可以换个关键词继续找。"}</p>}
      </div>}
  </section>;
}

export function WebJobSettings(){
  const router=useRouter();
  const [preferences,setPreferences]=useState({city:"",keywords:"",limit:String(webJobLimit)});
  const [provider,setProvider]=useState<SearchProvider|"site">("site");
  const [apiKey,setApiKey]=useState("");
  const [notice,setNotice]=useState<{type:"success"|"warning";message:string}>();
  const [busy,setBusy]=useState(false);
  const active=useRef<AbortController|null>(null);
  useEffect(()=>{
    const access=readSearchAccess();
    if(access){
      setProvider(access.provider);
      setApiKey(access.apiKey);
    }
    const saved=readWebRefreshPreferences();
    setPreferences({...saved,limit:String(saved.limit)});
    return ()=>active.current?.abort();
  },[]);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(active.current)return;
    const limit=Number(preferences.limit);
    const terms=[preferences.city.trim(),preferences.keywords.trim()].filter(Boolean).join(" ");
    const refresh=(event.nativeEvent as SubmitEvent).submitter?.getAttribute("value")==="refresh";
    if(!Number.isInteger(limit)||limit<1||limit>webJobLimit){setNotice({type:"warning",message:webSearchErrors.invalid_limit});return;}
    const key=apiKey.trim();
    if(provider!=="site"&&!/^[!-~]{1,512}$/.test(key)){
      setNotice({type:"warning",message:webSearchErrors.invalid_api_key});
      return;
    }
    try{
      localStorage.setItem(preferencesKey,JSON.stringify({...preferences,limit}));
      if(provider==="site"){
        sessionStorage.removeItem(searchAccessKey);
        setApiKey("");
      }else{
        sessionStorage.setItem(searchAccessKey,JSON.stringify({provider,apiKey:key}));
      }
    }catch{setNotice({type:"warning",message:"浏览器无法保存设置。"});return;}
    if(!refresh){setNotice({type:"success",message:"设置已保存。"});return;}

    const controller=new AbortController();
    active.current=controller;
    setBusy(true);
    setNotice(undefined);
    try{
      const {found}=await refreshWebJobs(terms,limit,controller.signal);
      if(controller.signal.aborted)return;
      if(!found){setNotice({type:"warning",message:"本次没有找到新的招聘链接。试试其他城市或关键词。"});return;}
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
        <div><h2 id="refresh-filters">搜索条件</h2><p>城市和关键词留空时，沿用最近的 AI 联网搜索，首次使用会搜索校招和实习。</p></div>
      </div>
      <fieldset className="hire-refresh-fields" disabled={busy} aria-labelledby="refresh-filters">
        <label className="hire-filter-select"><span>城市</span>
          <input value={preferences.city} maxLength={48} placeholder="如绍兴、杭州"
            onChange={event=>setPreferences({...preferences,city:event.target.value})}/>
        </label>
        <label className="hire-filter-select"><span>岗位关键词</span>
          <input value={preferences.keywords} maxLength={180} placeholder="例如：财务实习、工艺工程师校招"
            onChange={event=>setPreferences({...preferences,keywords:event.target.value})}/>
        </label>
        <label className="hire-filter-select"><span>最多保留的外部岗位数</span>
          <input type="number" min={1} max={webJobLimit} step={1} required value={preferences.limit}
            onChange={event=>setPreferences({...preferences,limit:event.target.value})}/>
        </label>
      </fieldset>
      <fieldset className="hire-provider-fields" disabled={busy}>
        <legend>联网服务商</legend>
        <label className="hire-filter-select"><span>搜索服务</span>
          <select value={provider} onChange={event=>{
            const next=event.target.value;
            const saved=readSearchAccess();
            setProvider(isSearchProvider(next)?next:"site");
            setApiKey(saved?.provider===next?saved.apiKey:"");
            setNotice(undefined);
          }}>
            <option value="site">使用站点配置</option>
            <optgroup label="使用自己的 API Key">
              {Object.entries(searchProviderLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
            </optgroup>
          </select>
        </label>
        {provider!=="site"&&<label className="hire-filter-select"><span>API Key</span>
          <input type="password" value={apiKey} maxLength={512} autoComplete="off" spellCheck={false}
            placeholder={`粘贴 ${searchProviderLabels[provider]} 的 API Key`} onChange={event=>setApiKey(event.target.value)}/>
        </label>}
        <p>{provider==="site"?"也可以选择服务商并使用自己的 API Key。":"Key 仅保存在当前标签页的会话中。切换到「使用站点配置」并保存可清除 Key。"}</p>
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

export function WebJobCard({job,searchQuery}:{job:WebJob;searchQuery?:string}){
  const href=withAiSearchQuery(webJobHref(job),searchQuery);
  return <article className="job-card hire-role hire-web-card">
        <div className="hire-company-mark" aria-hidden="true"><Globe size={20}/></div>
        <div className="hire-role-body">
          <div className="hire-role-company">{job.source}<span className="status status-unverified">外部招聘 · 在招待确认</span></div>
          <h3><Link href={href}>{job.title}</Link></h3>
          <div className="hire-role-meta"><span>{job.hostname}</span>{job.publishedAt&&<span>网页发布 {job.publishedAt}</span>}</div>
          {job.snippet&&<p className="hire-web-snippet">{job.snippet}</p>}
        </div>
        <div className="hire-role-actions"><Link className="hire-apply" href={href}>
          查看详情 <ArrowUpRight size={15} aria-hidden="true"/>
        </Link></div>
  </article>;
}
