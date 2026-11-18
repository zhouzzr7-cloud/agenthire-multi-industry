import Link from "next/link";
import {ArrowUpRight, MapPin} from "lucide-react";
import {type Job, categories, educationLabels, hasSmallHeadcount, jobHref, statusLabels} from "@/lib/jobs";
import {withAiSearchQuery} from "@/lib/ai-search-navigation";
import {SaveButton} from "./shell";

export function JobCard({job, matchReason, searchQuery}:{job:Job; matchReason?:string; searchQuery?:string}){
  const detailHref=withAiSearchQuery(jobHref(job),searchQuery);
  return <article className="job-card hire-role">
    <div className="hire-company-mark" aria-hidden="true">{job.initials}</div>
    <div className="hire-role-body">
      <div className="hire-role-company">{job.company}{hasSmallHeadcount(job)?<span className="hire-team-tag">{job.companySize}</span>:job.teamType==="startup"?<span className="hire-team-tag">创业团队</span>:null}<span className={"status status-"+job.status}>{statusLabels[job.status]}</span></div>
      <h3><Link href={detailHref}>{job.title}</Link></h3>
      <div className="hire-role-meta">
        <span><MapPin size={14}/>{job.city}</span>
        <span>{job.educationText??educationLabels[job.education]}</span>
        <span>{job.graduationYear?`${job.graduationYear} 届 · `:""}{job.recruitmentType}</span>
      </div>
      <div className="hire-role-tags">
        <span className={job.primaryCategory}>{categories[job.primaryCategory].short}</span>
        {job.techStack.slice(0,3).map(tag=><span key={tag}>{tag}</span>)}
      </div>
      {matchReason&&<div className="hire-role-meta hire-ai-reason"><span>匹配理由 · {matchReason}</span><span>专业要求 · {job.majorRequirement??"未注明"}</span></div>}
    </div>
    <div className="hire-role-actions">
      <SaveButton id={job.id}/>
      {job.salary&&<span className="hire-salary">{job.salary}</span>}
      <Link href={detailHref} className="hire-apply">查看详情 <ArrowUpRight size={15} aria-hidden="true"/></Link>
    </div>
  </article>;
}
