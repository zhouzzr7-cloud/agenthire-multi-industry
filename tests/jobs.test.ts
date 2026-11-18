import {test} from "node:test";
import assert from "node:assert/strict";
import {deflateSync} from "node:zlib";
import {makeJob} from "../worker/sources.mjs";
import {withReviewedDetails} from "../worker/reviewed-job-details.mjs";
import {loadSourceDetails,parseSourceDetails} from "../worker/source-details.mjs";
import {getTeamJobs} from "../worker/team-sources.mjs";
import {bachelorEligible,getCareerJobs,getJobs,getJob,demoJobs,queryJobs,canApply,jobRecruitmentAction,realJobCount,verifiedJobCount,matchesSearch,type Job} from "../lib/jobs";
test("structured education excludes masters and unknown, accepts broader minimums",()=>{
  assert.equal(bachelorEligible("bachelor"),true);assert.equal(bachelorEligible("college"),true);
  assert.equal(bachelorEligible("any"),true);assert.equal(bachelorEligible("master"),false);assert.equal(bachelorEligible("unknown"),null);
  assert.ok(queryJobs(new URLSearchParams("bachelor=1")).every(j=>j.education!=="master"&&j.education!=="unknown"));
});
test("combined filters and Chinese-English synonyms",()=>{
  const results=queryJobs(new URLSearchParams("q=Agent&category=agent-application&city=绍兴&bachelor=1"));
  assert.deepEqual(results.map(j=>j.id),["annuo-agent-application"]);
  assert.ok(matchesSearch(getJob("sii-agent-systems-intern")!,"运行时"));
  assert.equal(queryJobs(new URLSearchParams("q=no-such-job")).length,0);
});
test("home direction filters include the right roles alongside existing categories",()=>{
  const now=new Date("2026-11-17T12:00:00+08:00");
  const records=[...getJobs(),...getCareerJobs(now)];
  const technology=queryJobs(new URLSearchParams("category=technology"),records);
  assert.deepEqual(new Set(technology.map(job=>job.primaryCategory)),new Set(["agent-application","agent-infra","ai-infra"]));
  for (const category of ["finance","operations","manufacturing","agent-infra"]) {
    const matches=queryJobs(new URLSearchParams({category}),records);
    assert.ok(matches.length>0);
    assert.ok(matches.every(job=>job.primaryCategory===category));
  }
});
test("unknown publication dates never pass recent filters",()=>{
  assert.ok(queryJobs(new URLSearchParams("days=7")).every(job=>job.publishedAt));
  const base=getJob("sunmi-agent-platform-2027")!;
  const records=[{...base,publishedAt:"2026-10-19"},{...base,id:"old",publishedAt:"2025-01-01"},{...base,id:"future",publishedAt:"2027-01-01"}];
  assert.equal(queryJobs(new URLSearchParams("days=7"),records,new Date("2026-10-20T12:00:00+08:00")).length,1);
});
test("DEMO records have no application URLs and never count as real jobs",()=>{
  assert.equal(realJobCount(),10);assert.ok(demoJobs.every(j=>j.status==="demo"&&!j.applyUrl&&!canApply(j)));
  assert.ok(getJobs().filter(j=>j.status==="closed").every(j=>!canApply(j)));
  assert.equal(canApply({...getJobs()[0],status:"verified",applyUrl:"https://example.org/jobs/1"}),true);
  assert.equal(canApply({...getJobs()[0],status:"closed",applyUrl:"https://example.org/jobs/1"}),false);
  assert.equal(canApply({...getJobs()[0],status:"verified",applyUrl:"javascript:alert(1)"}),false);
});
test("unverified jobs with a source link can open it without claiming verified applications",()=>{
  const job={...getJobs()[0],status:"unverified" as const,applyUrl:null,sourceUrl:"https://example.test/recruitment"};
  assert.deepEqual(jobRecruitmentAction(job),{url:job.sourceUrl,label:"查看招聘原页"});
  assert.equal(canApply(job),false);
  assert.equal(jobRecruitmentAction({...job,sourceUrl:null}),null);
  assert.equal(jobRecruitmentAction({...job,status:"closed"}),null);
  assert.equal(jobRecruitmentAction({...job,status:"demo"}),null);
  assert.deepEqual(jobRecruitmentAction({...job,applyUrl:"https://example.test/apply"}),{url:"https://example.test/apply",label:"查看投递页面"});
  assert.deepEqual(jobRecruitmentAction({...job,status:"verified",applyUrl:"https://example.test/apply"}),{url:"https://example.test/apply",label:"前往原站投递"});
});
test("salary sorting compares only monthly figures; unknown and daily salaries come last",()=>{
 const results=queryJobs(new URLSearchParams("sort=salary"));
 assert.equal(results[0].id,"sunmi-agent-platform-2027");
 const known=results.filter(j=>j.salaryMonthly!==null);
 assert.ok(known.every((j,i)=>i===0||known[i-1].salaryMonthly!>=j.salaryMonthly!));
 assert.ok(results.slice(known.length).every(j=>j.salaryMonthly===null));
});
test("core disciplines rank above AI Infra; years derive from supplied records",()=>{
 const results=queryJobs(new URLSearchParams());
 const firstInfra=results.findIndex(j=>j.primaryCategory==="ai-infra");
 assert.ok(results.slice(firstInfra).every(j=>j.primaryCategory==="ai-infra"));
 assert.deepEqual(queryJobs(new URLSearchParams("year=2027&fresh=1")).map(j=>j.id),["sunmi-agent-platform-2027","smec-ai-workflow"]);
});
test("default list excludes demo and closed records; status filters still expose them",()=>{
  const results=queryJobs(new URLSearchParams());
  assert.equal(results.length,10);
  assert.ok(results.every(j=>j.status!=="demo"&&j.status!=="closed"&&j.sourceUrl));
  assert.equal(queryJobs(new URLSearchParams("status=demo")).length,9);
  assert.equal(queryJobs(new URLSearchParams("status=closed")).length,3);
  assert.equal(verifiedJobCount(),4);
});
test("source records keep verification boundaries and original application destinations",()=>{
  for(const j of getJobs().filter(j=>j.status!=="demo")){
    assert.equal(new URL(j.sourceUrl!).protocol,"https:");
    assert.match(j.sourceCheckedAt??"",/^20\d{2}-\d{2}-\d{2}$/);
    assert.ok(j.verificationNote);
    if(j.status==="verified"){assert.ok(j.lastVerifiedAt);assert.ok(j.deadline);assert.ok(canApply(j));}
    else assert.equal(j.lastVerifiedAt,null);
  }
  assert.equal(getJob("didi-agent-intern")!.salaryMonthly,null);
  assert.equal(getJob("xingzhi-remote-agent")!.salaryMonthly,null);
  const eligible=queryJobs(new URLSearchParams("bachelor=1"));
  assert.ok(!eligible.some(j=>j.id==="smec-ai-workflow"||j.id==="xiaomi-ai-infra-intern"));
});
test("multi-city roles work with either city and retain the recruitment track",()=>{
  const base=getJob("sunmi-agent-platform-2027")!;
  const listing={...base,city:"上海 / 杭州",cities:["上海","杭州"]};
  for(const city of listing.cities){
    assert.equal(queryJobs(new URLSearchParams({city,track:"campus",q:"Harness 本科"}),[listing]).length,1);
  }
  assert.equal(queryJobs(new URLSearchParams({city:"其他"}),[listing]).length,0);
  assert.equal(queryJobs(new URLSearchParams({track:"internship"}),[listing]).length,0);
});

test("team filter includes known small employers and sourced startups",()=>{
  const base=getJob("sunmi-agent-platform-2027")!;
  const unknown={...base,id:"unknown",companySize:"规模未公开"};
  const small={...base,id:"small",companySize:"20 人以下"};
  const large={...base,id:"large",companySize:"500–999 人"};
  const startup={...base,id:"startup",companySize:"规模未公开",teamType:"startup" as const};
  const rows=[unknown,small,large,startup];
  assert.deepEqual(queryJobs(new URLSearchParams("team=1&track=campus&city=杭州"),rows).map(job=>job.id),["small","startup"]);
  assert.deepEqual(queryJobs(new URLSearchParams(),rows).slice(0,2).map(job=>job.id),["small","startup"]);
});

test("synchronized jobs retain separate duties and requirements from the source",()=>{
  const base={id:"test",company:"示例企业",title:"开发工程师",cities:["上海"],type:"校园招聘",
    source:"企业招聘",sourceUrl:"https://example.test/job",status:"unverified",checkedAt:"2026-11-17"};
  const job=makeJob({...base,duties:"<ul><li>设计服务接口</li><li>完善故障监控</li></ul>",requirements:"1、本科及以上 2、熟悉 Python"});
  assert.deepEqual(job.responsibilities,["设计服务接口","完善故障监控"]);
  assert.deepEqual(job.requirements,["本科及以上","熟悉 Python"]);
  assert.equal(job.education,"bachelor");
  const keywordOnly=makeJob({...base,keywords:"Python",requirements:"本科及以上"});
  assert.deepEqual(keywordOnly.responsibilities,[]);
  assert.deepEqual(keywordOnly.techStack,["Python"]);
});

test("reviewed jobs enrich existing snapshots without changing verification or publication",()=>{
  const job={sourceUrl:"https://www.nowcoder.com/jobs/detail/463747",status:"unverified",lastVerifiedAt:null,publishedAt:null};
  const reviewed=withReviewedDetails(job);
  assert.equal(reviewed.status,job.status);
  assert.equal(reviewed.lastVerifiedAt,null);
  assert.equal(reviewed.publishedAt,null);
  assert.ok("applicationStart" in reviewed&&reviewed.applicationStart==="2026-08-27");
  assert.ok("responsibilities" in reviewed&&reviewed.responsibilities.length===4);
  assert.strictEqual(withReviewedDetails({...job,sourceUrl:"https://example.test/job"}).sourceUrl,"https://example.test/job");
});

test("source detail excerpts separate internship duties, qualifications and other page sections",async()=>{
  const canonical="https://www.shixiseng.com/intern/inn_example";
  const details=await loadSourceDetails(canonical+"?tracking=example",async (url,options)=>{
    assert.equal(url,canonical);
    assert.equal(options?.redirect,"manual");
    return new Response('<div class="job_detail">一、工作职责 1. 整理项目反馈 2. 维护测试文档 二、应聘资格 1. 本科在读 2. 可以按时到岗 实习待遇：另有交通补贴</div>');
  });
  assert.deepEqual(details,{responsibilities:["整理项目反馈","维护测试文档"],requirements:["本科在读","可以按时到岗"]});
  assert.equal(await loadSourceDetails(canonical,async()=>Response.redirect("https://example.test/",302)),null);
  assert.equal(await loadSourceDetails("https://www.shixiseng.com.example.test/intern/inn_example",async()=>{
    throw new Error("unsupported domains must never be fetched");
  }),null);
});

test("Nowcoder details read separate job sections without collecting surrounding page text",()=>{
  const html="<div>招聘详情</div><div>岗位职责</div><div>一、岗位职责 1、维护功能接口 2、完善测试覆盖</div><div>岗位要求</div><div>二、任职要求 1、计算机相关专业</div><div>候选人留言</div>";
  assert.deepEqual(parseSourceDetails("https://www.nowcoder.com/jobs/detail/123",html),{
    responsibilities:["维护功能接口","完善测试覆盖"],requirements:["计算机相关专业"],
  });
});

test("campus job details decode the public posting and keep application instructions out of requirements",async()=>{
  const original='<p>一、岗位职责</p><p>1、维护服务接口。</p><p>二、任职资格</p><p>1.本科及以上。</p><p>加分项：有测试项目经验。</p><p>简历请发送至 hr@example.test。</p>';
  const payload=deflateSync("prefix"+Buffer.from("skip"+original).toString("base64")).toString("base64");
  const html=`<h5>职位详情</h5><div><section id="content123"></section></div><h5>单位介绍</h5><script>$("#content123").each(function() { $(this).parent().html(Base64.decode(unzip("${payload}").substr(6)).substr(4)); });</script>`;
  const details=await loadSourceDetails("https://zccareer.zufe.edu.cn/job/view/id/1937720",async()=>new Response(html));
  assert.deepEqual(details,{responsibilities:["维护服务接口。"],requirements:["本科及以上。"],preferredQualifications:["有测试项目经验。"]});
});

test("team sync saves source details for both indexed and manually added postings",async()=>{
  const result=await getTeamJobs(async (url:string)=>{
    if(url.startsWith("https://www.nowcoder.com/jobs/detail/"))return new Response(
      "<title>中城交（上海）科技有限公司 Agent开发工程师</title><span>立即申请</span><div>岗位职责</div><div>维护接口</div><div>岗位要求</div><div>本科及以上</div>",
    );
    if(url==="https://www.shixiseng.com/intern/inn_epvylk1xkfy5")return new Response(
      '<div class="job_detail">工作职责：维护接口 任职要求：本科在读</div>',
    );
    return new Response(null,{status:503});
  },"2026-11-17");
  const jobs:Job[]=result.jobs;
  assert.deepEqual(jobs.find(job=>job.id==="live-team-nc-463747")?.responsibilities,["维护接口"]);
  const internship=jobs.find(job=>job.id==="live-team-sxs-inn_epvylk1xkfy5");
  assert.deepEqual(internship?.responsibilities,["维护接口"]);
  assert.deepEqual(internship?.requirements,["本科在读"]);
});
