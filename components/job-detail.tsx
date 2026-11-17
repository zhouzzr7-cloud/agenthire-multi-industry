import Link from "next/link";
import {ArrowLeft, ArrowUpRight, Info} from "lucide-react";
import {type Job, bachelorEligible, canApply, categories, educationLabels, statusLabels} from "@/lib/jobs";
import {CopyButton, SaveButton} from "@/components/shell";

export function JobDetail({job}:{job:Job}){
  const education=job.educationText??educationLabels[job.education];
  const undergraduate=bachelorEligible(job.education);
  const applicationWindow=job.applicationStart&&job.deadline?`${job.applicationStart} 至 ${job.deadline}`:null;
  const statusHeading={
    demo:"演示岗位",closed:"该岗位已关闭",verified:"原站投递入口已核验",unverified:"在招状态待核实",
  }[job.status];
  const jobFacts=[
    ["工作城市",job.city],
    ["招聘类型",job.recruitmentType],
    ["最低学历",education],
    ["招聘届别",job.graduationYear?`${job.graduationYear} 届`:"原页未注明"],
    ["公司规模",job.companySize],
    [applicationWindow?"投递时间":"投递截止",applicationWindow??job.deadline??"原页未注明"],
  ];
  if(job.internship)jobFacts.push(["实习安排",job.internship]);

  return <div className="container detail">
    <Link className="back-link" href="/jobs/"><ArrowLeft size={15} aria-hidden="true"/>全部岗位</Link>
    <div className="detail-header">
      <div className="company-mark large" aria-hidden="true">{job.initials}<span>↗</span></div>
      <div>
        <div className="job-company">{job.company}<span className="status">{statusLabels[job.status]}</span></div>
        <h1>{job.title}</h1>
        <p>{job.city} <span>·</span> {education} <span>·</span> {job.recruitmentType}</p>
      </div>
    </div>
    <div className="detail-grid">
      <div className="detail-content">
        <div className="demo-banner">
          <Info size={19} aria-hidden="true"/>
          <div><strong>{statusHeading}</strong><p>{job.status==="demo"?"公司与职位为虚构演示。":job.verificationNote}</p></div>
        </div>
        <section>
          <h2>岗位介绍</h2>
          <p>{job.description}</p>
          {job.techStack.length>0&&<div className="tags" aria-label="岗位关键词">{job.techStack.map(keyword=><span key={keyword}>{keyword}</span>)}</div>}
        </section>
        <section>
          <h2>工作职责</h2>
          {job.responsibilities.length?<ul>{job.responsibilities.map(item=><li key={item}>{item}</li>)}</ul>:<p>工作职责请查看招聘原页。</p>}
        </section>
        <section>
          <h2>任职要求</h2>
          {job.requirements.length?<ul>{job.requirements.map(item=><li key={item}>{item}</li>)}</ul>:<p>完整任职要求请查看招聘原页。</p>}
          {Boolean(job.preferredQualifications?.length)&&<>
            <h3>加分项</h3>
            <ul>{job.preferredQualifications?.map(item=><li key={item}>{item}</li>)}</ul>
          </>}
        </section>
        <section>
          <h2>岗位匹配信息</h2>
          <dl className="match-grid">
            {[
              ["本科是否可投",undergraduate===null?"学历待核实":undergraduate?"公开学历条件允许本科":"最低学历高于本科"],
              ["应届生是否可投",job.freshGraduate===null?"原页未明确":job.freshGraduate?"面向应届生，具体届别以招聘原页为准":"公开条件未面向应届生"],
              ["岗位方向",categories[job.primaryCategory].name],
              ["专业要求",job.majorRequirement??"原页未单独注明"],
            ].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
          <div className="evidence"><span>分类依据</span><p>{job.categoryEvidence}</p></div>
        </section>
        <section>
          <h2>数据来源与核验</h2>
          <dl className="source-grid">
            <div><dt>招聘原页</dt><dd>{job.sourceUrl?<a className="source-link" href={job.sourceUrl} target="_blank" rel="noopener noreferrer">{job.source} ↗</a>:job.source}</dd></div>
            <div><dt>发布时间</dt><dd>{job.publishedAt??"原页未注明"}</dd></div>
            <div><dt>投递入口最近核验</dt><dd>{job.lastVerifiedAt??"未确认"}</dd></div>
            <div><dt>来源检查时间</dt><dd>{job.sourceCheckedAt??"未记录"}</dd></div>
            {job.detailsCheckedAt&&<div><dt>职责与要求复核</dt><dd>{job.detailsCheckedAt}</dd></div>}
            {job.teamEvidenceUrl&&<div><dt>团队信息</dt><dd><a className="source-link" href={job.teamEvidenceUrl} target="_blank" rel="noopener noreferrer">查看团队信息来源 ↗</a></dd></div>}
          </dl>
          <p className="small-copy">“已核验”指检查时原页提供申请入口或将岗位列为在招。实际名额及投递条件以招聘原页为准。</p>
        </section>
      </div>
      <aside className="detail-sidebar" aria-label="招聘信息">
        <div className="detail-salary">{job.salary??"薪资未提供"}</div>
        {job.salary&&<span className="small-copy">{job.status==="demo"?"演示薪资":"薪资按招聘原页口径展示"}</span>}
        <dl>{jobFacts.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        {canApply(job)?<a className="button primary" href={job.applyUrl!} target="_blank" rel="noopener noreferrer">{job.status==="unverified"?"查看原站并投递":"前往原站投递"} <ArrowUpRight size={16} aria-hidden="true"/></a>:<div className="unavailable">{job.status==="closed"?"已关闭 · 暂停投递":job.status==="demo"?"演示岗位 · 暂无投递入口":"投递入口待核实"}</div>}
        {canApply(job)&&job.alternateApplyUrl&&<a className="button secondary" href={job.alternateApplyUrl} target="_blank" rel="noopener noreferrer">企业校园招聘入口 ↗</a>}
        <SaveButton id={job.id} full/>
        <CopyButton/>
        <p className="small-copy">收藏保存在当前浏览器。</p>
      </aside>
    </div>
  </div>;
}
