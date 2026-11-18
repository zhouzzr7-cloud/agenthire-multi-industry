"use client";

import Link from "next/link";
import {useEffect, useState} from "react";
import {Activity, ArrowUpRight, BriefcaseBusiness, GraduationCap, RefreshCw} from "lucide-react";
import {getCareerJobs, getJobs, isOpenJob, recruitmentTrack, type Job} from "@/lib/jobs";
import {readWebRefreshPreferences} from "@/lib/web-job-feed";
import {readSearchAccess,refreshWebJobs} from "@/lib/web-job-search";

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
  const [careerJobs,setCareerJobs] = useState<Job[]>([]);
  const [state,setState] = useState<"loading"|"ready"|"error">("loading");
  const [generation,setGeneration]=useState(0);
  useEffect(() => { setCareerJobs(getCareerJobs()); }, []);
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
  return {feed, state, jobs: [...getJobs(), ...careerJobs, ...feed.jobs],reload};
}

export function RefreshLabel({feed,state}:{feed:Feed; state:string}){
  if (!feed.refreshedAt) return <span>{state==="loading"?"正在读取更新记录":state==="error"?"自动岗位暂不可用":feed.manualRefresh?"尚未同步":"等待首次自动同步"}</span>;
  const time = new Intl.DateTimeFormat("zh-CN",{
    timeZone:"Asia/Shanghai", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hour12:false,
  }).format(new Date(feed.refreshedAt));
  const stale = Date.now() - new Date(feed.refreshedAt).getTime() > 36*60*60*1000;
  return <span>{feed.partial?"部分来源待更新 · ":stale?"更新延迟 · ":"最近同步 "}{time}</span>;
}

export function RefreshJobsButton({onRefresh,webSearchEnabled,fallbackQuery}:{onRefresh:()=>void;webSearchEnabled?:boolean;fallbackQuery:string}){
  const [stage,setStage]=useState<"idle"|"site"|"web">("idle");
  const [siteMessage,setSiteMessage]=useState("");
  const [webMessage,setWebMessage]=useState("");

  async function refresh(){
    setStage("site");
    setSiteMessage("");
    setWebMessage("");
    try{
      const response=await fetch("/api/refresh",{method:"POST",signal:AbortSignal.timeout(180_000)});
      const data=await response.json();
      if(!response.ok||(data.result!=="refreshed"&&data.result!=="partially_refreshed"))throw new Error();
      setSiteMessage(`站内新增 ${data.added} 条${data.result==="partially_refreshed"?"（部分来源未更新）":""}。`);
    }catch{
      setSiteMessage("站内同步失败，已保留现有岗位。");
    }

    try{
      if(webSearchEnabled||readSearchAccess()){
        setStage("web");
        const {city,keywords,limit}=readWebRefreshPreferences();
        const query=[city,keywords].map(value=>value.trim()).filter(Boolean).join(" ")||fallbackQuery;
        const {added,found,partial}=await refreshWebJobs(query,limit);
        const summary=added?`联网找到 ${found} 条，新增 ${added} 条`:found?`联网找到 ${found} 条，均已收录`:"联网未找到匹配岗位";
        setWebMessage(summary+(partial?"（补搜未完成）。":"。"));
      }else{
        setWebMessage("配置联网服务后可补充外部岗位。");
      }
    }catch(error){
      setWebMessage(error instanceof Error&&error.name==="Error"?error.message:"联网搜索失败，已保留现有岗位。");
    }finally{
      setStage("idle");
      onRefresh();
    }
  }

  return <div>
    <button type="button" className="hire-apply" onClick={refresh} disabled={stage!=="idle"}>
      <RefreshCw size={15} aria-hidden="true"/> {stage==="site"?"正在同步…":stage==="web"?"正在搜索外部岗位…":"刷新岗位"}
    </button>
    <small role="status">{[siteMessage,webMessage].filter(Boolean).join(" ")}</small>
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
