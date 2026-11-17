"use client";

import Link from "next/link";
import {useEffect, useState} from "react";
import {Activity, ArrowUpRight, BriefcaseBusiness, GraduationCap} from "lucide-react";
import {getJobs, isOpenJob, recruitmentTrack, type Job} from "@/lib/jobs";

interface Feed {
  jobs: Job[];
  refreshedAt: string | null;
  added: number;
  partial: boolean;
}

const fallback: Feed = {jobs: [], refreshedAt: null, added: 0, partial: false};
let feedRequest: Promise<Feed> | undefined;

function fetchFeed(){
  feedRequest ??= fetch("/api/jobs", {cache:"no-cache"})
    .then(response => {
      if (!response.ok) throw new Error("岗位列表暂不可用");
      return response.json() as Promise<Feed>;
    }).catch(error => {
      feedRequest = undefined;
      throw error;
    });
  return feedRequest;
}

export function useLiveJobs(){
  const [feed,setFeed] = useState(fallback);
  const [state,setState] = useState<"loading"|"ready"|"error">("loading");
  useEffect(() => {
    let active = true;
    fetchFeed().then(
      data => { if(active){setFeed(data);setState("ready");} },
      () => { if(active)setState("error"); },
    );
    return () => {active=false;};
  },[]);
  return {feed, state, jobs: [...getJobs(), ...feed.jobs]};
}

export function RefreshLabel({feed,state}:{feed:Feed; state:string}){
  if (!feed.refreshedAt) return <span>{state==="loading"?"正在读取更新记录":state==="error"?"自动岗位暂不可用":"等待首次自动同步"}</span>;
  const time = new Intl.DateTimeFormat("zh-CN",{
    timeZone:"Asia/Shanghai", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hour12:false,
  }).format(new Date(feed.refreshedAt));
  const stale = Date.now() - new Date(feed.refreshedAt).getTime() > 36*60*60*1000;
  return <span>{feed.partial?"部分来源待更新 · ":stale?"更新延迟 · ":"最近同步 "}{time}</span>;
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
