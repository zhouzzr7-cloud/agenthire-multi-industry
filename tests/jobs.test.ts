import {test} from "node:test";
import assert from "node:assert/strict";
import {makeJob} from "../worker/sources.mjs";
import {withReviewedDetails} from "../worker/reviewed-job-details.mjs";
import {bachelorEligible,getCareerJobs,getJobs,getJob,demoJobs,queryJobs,canApply,realJobCount,verifiedJobCount,matchesSearch} from "../lib/jobs";
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
