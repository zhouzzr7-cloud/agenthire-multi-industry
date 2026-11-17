import assert from "node:assert/strict";
import {test} from "node:test";
import {findWebJobs} from "../worker/web-jobs.mjs";
import {handleWebJobSearch} from "../worker/career-search.mjs";

const source="https://www.shixiseng.com/intern/inn_demo";
const result=(url,title="绍兴财务实习生",snippet="招聘本科在读实习生")=>({url,title,snippet,site_name:"实习平台"});

test("web search requests real provider results and only exposes recruitment URLs",async()=>{
  const rows=await findWebJobs({
    query:"绍兴财务实习，手机13812345678",apiKey:"test",
    knownUrls:["https://shixiseng.com/intern/inn_known?utm_source=feed"],
    fetchImpl:async(url,request)=>{
      assert.equal(url,"https://api.deepseek.com/v1/tools/search");
      assert.equal(request.headers.Authorization,"Bearer test");
      const body=JSON.parse(request.body);
      assert.equal(body.count,40);
      assert.match(body.query,/绍兴财务实习/);
      assert.doesNotMatch(body.query,/13812345678/);
      return Response.json({results:[
        result(source+"?utm_source=x"),
        result(source+"?from=recommend"),
        result("https://www.shixiseng.com/intern/inn_known?pcm=test"),
        result("https://www.shixiseng.com/intern/inn_closed","绍兴运营实习","该职位已结束招聘"),
        result("https://jobs.example.com/job/123"),
        result("https://www.shixiseng.com/"),
        result("http://www.shixiseng.com/intern/inn_insecure"),
        result("https://jobs.example.edu.cn/detail/job?id=23","工艺工程师校招"),
      ]});
    },
  });
  assert.deepEqual(rows.map(row=>row.sourceUrl),[source,"https://jobs.example.edu.cn/detail/job?id=23"]);
});

test("unusable or failed provider responses are reported",async()=>{
  await assert.rejects(findWebJobs({query:"绍兴",apiKey:"test",fetchImpl:async()=>new Response("",{status:502})}));
  await assert.rejects(findWebJobs({query:"绍兴",apiKey:"test",fetchImpl:async()=>Response.json({error:"not a result"})}));
});

test("web endpoint does not call the live feed when key or quota is unavailable",async()=>{
  const request=()=>new Request("https://example.test/api/jobs/web-search",{method:"POST",body:JSON.stringify({query:"绍兴"})});
  const live=async()=>{assert.fail("must not fetch a feed");};
  assert.deepEqual(await handleWebJobSearch(request(),{},[],live),{status:503,data:{error:"key_missing"}});
  assert.deepEqual(await handleWebJobSearch(request(),{DEEPSEEK_API_KEY:"test"},[],live),{status:429,data:{error:"quota_unavailable"}});
});
