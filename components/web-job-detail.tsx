"use client";

import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {useEffect,useState} from "react";
import {ArrowUpRight, Globe, Info} from "lucide-react";
import {findStoredWebJob,type WebJob} from "@/lib/web-job-feed";
import {JobDescriptionSections} from "@/components/job-description-sections";
import {JobDetailNavigation} from "@/components/job-detail-navigation";
import {webJobSummaryRows,webJobSummarySections} from "@/lib/web-job-summary";

export function WebJobDetail(){
  const id=useSearchParams().get("id");
  const [record,setRecord]=useState<{id:string|null;job:WebJob|undefined}>();
  useEffect(()=>{setRecord({id,job:findStoredWebJob(id)});},[id]);

  if(record?.id!==id)return <p className="container loading">正在读取联网岗位…</p>;
  const job=record.job;
  if(!job)return <div className="container hire-board"><div className="hire-empty">
    <h1>未找到联网岗位</h1><p>返回岗位列表或重新联网搜索，即可查看当前浏览器里的结果。</p>
    <Link href="/jobs/">返回岗位列表</Link>
  </div></div>;
  const fetchedAt=Date.parse(job.fetchedAt??"");
  const roles=webJobSummaryRows(job.snippet);
  const sections=roles.length?undefined:webJobSummarySections(job.snippet);

  return <div className="container detail">
    <JobDetailNavigation web/>
    <div className="detail-header">
      <div className="company-mark large" aria-hidden="true"><Globe size={26}/></div>
      <div><div className="job-company">{job.source}<span className="status">外部招聘</span></div>
        <h1>{job.title}</h1><p>{job.hostname}</p>
      </div>
    </div>
    <div className="detail-grid">
      <div className="detail-content">
        <div className="demo-banner"><Info size={19} aria-hidden="true"/><div>
          <strong>在招状态待核实</strong><p>请在招聘原页确认岗位当前是否开放、是否符合投递资格。</p>
        </div></div>
        {roles.length>0&&<section>
          <h2>公告内岗位</h2>
          <div className="detail-roles-table"><table>
            <caption className="sr-only">网页摘要中可识别的岗位</caption>
            <thead><tr><th scope="col">岗位</th><th scope="col">学历</th><th scope="col">需求人数</th></tr></thead>
            <tbody>{roles.map(role=><tr key={role.title}><th scope="row">{role.title}</th><td>{role.education}</td><td>{role.headcount}</td></tr>)}</tbody>
          </table></div>
          <p className="small-copy">根据网页搜索摘要整理，完整名单以招聘原页为准。</p>
          <details className="detail-snippet"><summary>查看网页摘要</summary><p>{job.snippet}</p></details>
        </section>}
        {!roles.length&&job.snippet&&<section><h2>网页摘要</h2><p>{job.snippet}</p></section>}
        <JobDescriptionSections sourceUrl={job.sourceUrl} {...sections} compact fromSnippet/>
        <section>
          <h2>数据来源</h2>
          <dl className="source-grid">
            <div><dt>招聘网页</dt><dd>{job.hostname}</dd></div>
            <div><dt>网页发布时间</dt><dd>{job.publishedAt??"搜索结果未提供"}</dd></div>
            {Number.isFinite(fetchedAt)&&<div><dt>收录时间</dt><dd>{new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Shanghai",dateStyle:"medium"}).format(fetchedAt)}</dd></div>}
          </dl>
        </section>
      </div>
      <aside className="detail-sidebar" aria-label="招聘原页">
        <h2>查看招聘原页</h2><p className="small-copy">将在新标签页打开 {job.hostname}。</p>
        <a className="button primary" href={job.sourceUrl} target="_blank" rel="noopener noreferrer">打开招聘原页 <ArrowUpRight size={16} aria-hidden="true"/></a>
      </aside>
    </div>
  </div>;
}
