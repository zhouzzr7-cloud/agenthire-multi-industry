"use client";

import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {JobDetail} from "./job-detail";
import {useLiveJobs} from "./live-jobs";

export function LiveDetail(){
  const id=useSearchParams().get("id");
  const {state,feed}=useLiveJobs();
  const job=feed.jobs.find(job=>job.id===id);
  if(job)return <JobDetail job={job}/>;
  if(state==="loading")return <p className="container loading">正在读取岗位…</p>;
  return <div className="container hire-board"><div className="hire-empty"><h2>{state==="error"?"岗位暂时无法读取":"岗位已离开当前列表"}</h2><Link href="/jobs/">返回岗位列表</Link></div></div>;
}
