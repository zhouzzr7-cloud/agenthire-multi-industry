import assert from "node:assert/strict";
import {test} from "node:test";
import {findRememberedWebSearch,findStoredWebJob,matchesWebJob,mergeWebJobs,readWebJobs,rememberWebJobs,saveWebJobs,webJobHref,type WebJob} from "../lib/web-job-feed";
import {aiSearchHref,withAiSearchQuery} from "../lib/ai-search-navigation";
import {refreshWebJobs} from "../lib/web-job-search";
import {webJobSummaryRows,webJobSummarySections} from "../lib/web-job-summary";

const base:WebJob={
  title:"绍兴财务实习",snippet:"财会相关专业",source:"招聘网",hostname:"www.shixiseng.com",
  sourceUrl:"https://www.shixiseng.com/intern/inn_a",publishedAt:null,
};

test("new results prepend and deduplicate previous URLs with tracking",()=>{
  const old={...base,title:"旧标题",sourceUrl:base.sourceUrl+"?utm_source=search"};
  const other={...base,title:"另一个岗位",sourceUrl:base.sourceUrl+"2"};
  const invalid={...base,sourceUrl:"javascript:alert(1)"};
  assert.deepEqual(mergeWebJobs([base,invalid],[old,other],50),[base,other]);
  assert.deepEqual(mergeWebJobs([base],[other],1),[base]);
});

test("external cards participate in evidenced filters without claiming unknown education",()=>{
  assert.equal(matchesWebJob(base,new URLSearchParams("city=绍兴&track=internship&q=财务")),true);
  assert.equal(matchesWebJob(base,new URLSearchParams("city=杭州")),false);
  assert.equal(matchesWebJob(base,new URLSearchParams("education=bachelor")),false);
  assert.equal(matchesWebJob(base,new URLSearchParams("status=verified")),false);
});

test("compact computer-job searches split the city from the role and ignore publisher locations",()=>{
  const developer={...base,title:"后端开发工程师",snippet:"工作地点：北京市海淀区"};
  assert.equal(matchesWebJob(developer,new URLSearchParams("q=北京计算机&category=technology")),true);
  assert.equal(matchesWebJob(developer,new URLSearchParams("q=北京市 计算机")),true);
  const otherCity={...developer,snippet:"工作地点：杭州",source:"北京大学就业信息网"};
  assert.equal(matchesWebJob(otherCity,new URLSearchParams("q=北京计算机")),false);
  assert.equal(matchesWebJob(otherCity,new URLSearchParams("city=北京")),false);
  assert.equal(matchesWebJob({...base,snippet:"欢迎计算机等专业应聘"},new URLSearchParams("category=technology")),false);
});

test("an external card resolves its canonical link to the browser's remembered result",()=>{
  const job={...base,sourceUrl:base.sourceUrl+"?utm_source=feed&id=42"};
  rememberWebJobs([job]);
  const href=new URL(webJobHref({...job,sourceUrl:base.sourceUrl+"?id=42"}),"https://example.test");
  assert.equal(href.pathname,"/jobs/web/");
  assert.equal(findStoredWebJob(href.searchParams.get("id"))?.sourceUrl,job.sourceUrl);
  assert.equal(findStoredWebJob("unknown"),undefined);
});

test("links to job details preserve the original AI query alongside the existing job ID",()=>{
  const query="杭州 C++ 实习 & 校招";
  const detail=new URL(withAiSearchQuery(webJobHref(base),query),"https://example.test");
  assert.equal(detail.searchParams.get("ai"),query);
  assert.equal(detail.searchParams.get("id"),new URL(webJobHref(base),"https://example.test").searchParams.get("id"));
  const back=new URL(aiSearchHref(detail.searchParams.get("ai"),"web")!,"https://example.test");
  assert.equal(back.pathname,"/jobs/");
  assert.equal(back.searchParams.get("ai"),query);
  assert.equal(back.hash,"#web-results-heading");
});

test("restored web results retain the next search round even after an older session searched once",t=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,"sessionStorage");
  t.after(()=>{
    if(original)Object.defineProperty(globalThis,"sessionStorage",original);
    else Reflect.deleteProperty(globalThis,"sessionStorage");
  });
  const saved={query:"北京",jobs:[base],visibleCount:24,searchedMore:true};
  let value=JSON.stringify(saved);
  Object.defineProperty(globalThis,"sessionStorage",{configurable:true,value:{getItem:()=>value}});
  assert.deepEqual(findRememberedWebSearch("北京"),{query:"北京",jobs:[base],visibleCount:24,completedFollowUps:1});
  value=JSON.stringify({...saved,completedFollowUps:3});
  assert.deepEqual(findRememberedWebSearch("北京"),{query:"北京",jobs:[base],visibleCount:24,completedFollowUps:3});
});

test("refresh combines external search batches and counts newly saved recruitment links",async t=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,"localStorage");
  t.after(()=>{
    if(original)Object.defineProperty(globalThis,"localStorage",original);
    else Reflect.deleteProperty(globalThis,"localStorage");
  });
  const storage=new Map<string,string>();
  Object.defineProperty(globalThis,"localStorage",{configurable:true,value:{
    getItem:(key:string)=>storage.get(key)??null,
    setItem:(key:string,value:string)=>storage.set(key,value),
  }});
  const other={...base,sourceUrl:base.sourceUrl+"2"};
  const third={...base,sourceUrl:base.sourceUrl+"3"};
  const queries:string[]=[];
  const request=t.mock.method(globalThis,"fetch",async(_url:string,options:{body:string})=>{
    const {query}=JSON.parse(options.body);
    queries.push(query);
    return Response.json({matches:query.startsWith("招聘公告 ")?[other,third]:[base]});
  });
  const report={query:"北京实习",found:3,total:3,limit:3,removed:0,partial:false};
  assert.deepEqual(await refreshWebJobs("北京实习",3),{...report,added:3});
  assert.deepEqual(await refreshWebJobs("北京实习",3),{...report,added:0});
  const batches=["北京实习","职位详情 北京实习","招聘公告 北京实习"];
  assert.deepEqual(queries,[...batches,...batches]);
  assert.equal(request.mock.callCount(),6);
  assert.deepEqual(readWebJobs().map(job=>job.sourceUrl),[base.sourceUrl,other.sourceUrl,third.sourceUrl]);
  const latest={...base,sourceUrl:base.sourceUrl+"4"};
  assert.deepEqual(saveWebJobs([latest],3),{added:1,total:3,removed:1});
  assert.deepEqual(readWebJobs().map(job=>job.sourceUrl),[latest.sourceUrl,base.sourceUrl,other.sourceUrl]);
});

test("external announcement snippets show only complete role, degree, and headcount rows",()=>{
  const rows=webJobSummaryRows("职位名称: 测试工程师; 学历: 本科,硕士; 需求人数: 17 ... 数据工程师 | 硕士,博士 | 30 ... 运维工程师 | 本科...");
  assert.deepEqual(rows,[{title:"测试工程师",education:"本科、硕士",headcount:17},{title:"数据工程师",education:"硕士、博士",headcount:30}]);
  assert.deepEqual(webJobSummarySections("岗位职责：维护测试环境。 任职要求：计算机相关专业。 工作地点：杭州"),{
    responsibilities:["维护测试环境。"],requirements:["计算机相关专业。"],
  });
});
