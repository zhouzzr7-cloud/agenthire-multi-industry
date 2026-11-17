"use client";

import Link from "next/link";
import {useEffect, useState} from "react";
import {Activity, ArrowUpRight, BriefcaseBusiness, GraduationCap, RefreshCw} from "lucide-react";
import {getJobs, isOpenJob, recruitmentTrack, type Job} from "@/lib/jobs";

interface Feed {
  jobs: Job[];
  refreshedAt: string | null;
  added: number;
  partial: boolean;
  manualRefresh?: boolean;
  webSearchEnabled?: boolean;
}

const fallback: Feed = {jobs: [], refreshedAt: null, added: 0, partial: false};
let feedRequest: Promise<Feed> | undefined;

function fetchFeed(){
  if(feedRequest)return feedRequest;
  const request=fetch("/api/jobs", {cache:"no-cache"})
    .then(response => {
      if (!response.ok) throw new Error("岗位列表暂不可用");
      return response.json() as Promise<Feed>;
    }).catch(error => {
      if(feedRequest===request)feedRequest=undefined;
      throw error;
    });
  feedRequest=request;
  return request;
}

export function useLiveJobs(){
  const [feed,setFeed] = useState(fallback);
  const [state,setState] = useState<"loading"|"ready"|"error">("loading");
  const [generation,setGeneration]=useState(0);
  useEffect(() => {
    let active = true;
    fetchFeed().then(
      data => { if(active){setFeed(data);setState("ready");} },
      () => { if(active)setState("error"); },
    );
    return () => {active=false;};
  },[generation]);
  function reload(){
    feedRequest=undefined;
    setGeneration(value=>value+1);
  }
  return {feed, state, jobs: [...getJobs(), ...feed.jobs],reload};
}

export function RefreshLabel({feed,state}:{feed:Feed; state:string}){
  if (!feed.refreshedAt) return <span>{state==="loading"?"正在读取更新记录":state==="error"?"自动岗位暂不可用":feed.manualRefresh?"尚未同步":"等待首次自动同步"}</span>;
  const time = new Intl.DateTimeFormat("zh-CN",{
    timeZone:"Asia/Shanghai", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hour12:false,
  }).format(new Date(feed.refreshedAt));
  const stale = Date.now() - new Date(feed.refreshedAt).getTime() > 36*60*60*1000;
  return <span>{feed.partial?"部分来源待更新 · ":stale?"更新延迟 · ":"最近同步 "}{time}</span>;
}

export function RefreshJobsButton({onRefresh}:{onRefresh:()=>void}){
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function refresh(){
    setBusy(true);
    setMessage("");
    try{
      const response=await fetch("/api/refresh",{method:"POST",signal:AbortSignal.timeout(180_000)});
      const data=await response.json();
      if(!response.ok)throw new Error();
      if(data.result==="already_current"){
        setMessage("刚同步过，请隔 10 分钟再刷新。");
      }else if(data.result==="refreshed"||data.result==="partially_refreshed"){
        const prefix=data.result==="partially_refreshed"?"部分来源未更新，已保留可用岗位":"同步完成";
        setMessage(prefix+(data.added>0?" · 新增 "+data.added+" 条":" · 没有新增岗位"));
      }else{
        throw new Error();
      }
      onRefresh();
    }catch{
      setMessage("同步失败，已保留现有岗位。请稍后重试。");
    }finally{
      setBusy(false);
    }
  }

  return <div>
    <button type="button" className="hire-apply" onClick={refresh} disabled={busy}>
      <RefreshCw size={15} aria-hidden="true"/> {busy?"正在同步…":"刷新岗位"}
    </button>
    <small role="status">{message}</small>
  </div>;
}

export function LiveSummary({home=false}:{home?:boolean}){
  const {feed,state,jobs}=useLiveJobs();
  const open=jobs.filter(isOpenJob);
  const early=open.filter(job => ["internship","campus"].includes(recruitmentTrack(job))).length;
  return <section className={home?"hire-stats hire-home-stats":"hire-stats"} aria-label="岗位概览">
    <div><BriefcaseBusiness size={21}/><span><strong>{open.length}</strong><small>可搜索岗位</small></span></div>
    <div><GraduationCap size={23}/><span><strong>{early}</strong><small>实习与校招</small></span></div>
    <div><Activity size={22}/><span><strong>{feed.refreshedAt?`+${feed.added}`:"每日"}</strong><small>{feed.refreshedAt?"本次新增":"岗位同步"}</small></span></div>
    <Link href="/jobs/" className="hire-sync"><span><i/><RefreshLabel feed={feed} state={state}/></span><ArrowUpRight size={17}/></Link>
  </section>;
}
