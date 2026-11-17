import assert from "node:assert/strict";
import {test} from "node:test";
import {matchesWebJob,mergeWebJobs,type WebJob} from "../lib/web-job-feed";

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
