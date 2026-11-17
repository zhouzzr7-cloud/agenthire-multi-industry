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

test("a personal Perplexity key uses only the selected provider and skips the site quota",async t=>{
  const fetch=t.mock.method(globalThis,"fetch",async (url,request)=>{
    assert.equal(url,"https://api.perplexity.ai/search");
    assert.equal(request.headers.Authorization,"Bearer personal-test-key");
    assert.equal(request.redirect,"manual");
    assert.match(JSON.parse(request.body).query,/财务实习/);
    return Response.json({results:[
      {...result(source),date:"2026-11-17"},
      result("https://jobs.example.com/job/fake"),
    ]});
  });
  const body={query:"杭州财务实习",provider:"perplexity",apiKey:"personal-test-key"};
  const request=overrides=>new Request("https://example.test/api/jobs/web-search",{
    method:"POST",body:JSON.stringify({...body,...overrides}),
  });
  const env={AI_SEARCH_DAILY_LIMIT:"1"};
  const response=await handleWebJobSearch(request({}),env,[],async()=>[]);
  assert.equal(response.status,200);
  assert.equal(response.data.matches.length,1);
  assert.equal(response.data.matches[0].publishedAt,"2026-11-17");
  assert.equal(response.data.matches[0].sourceUrl,source);
  assert.equal((await handleWebJobSearch(request({apiKey:""}),env,[],async()=>[])).data.error,"invalid_api_key");
  assert.equal((await handleWebJobSearch(request({provider:"other"}),env,[],async()=>[])).data.error,"invalid_provider");
  assert.equal(fetch.mock.callCount(),1);
});

const newProviders = [
  {
    provider:"bocha",endpoint:"https://api.bocha.cn/v1/web-search",header:"Authorization",prefix:"Bearer ",
    response:{code:200,data:{webPages:{value:[{url:source,name:"财务实习生",snippet:"招聘本科生",datePublished:"2026-11-17T09:00:00+08:00"}]}}},
    date:"2026-11-17",
  },
  {
    provider:"tavily",endpoint:"https://api.tavily.com/search",header:"Authorization",prefix:"Bearer ",
    response:{results:[{url:source,title:"财务实习生",content:"招聘本科生",published_date:"2026-11-17"}]},
    date:"2026-11-17",
  },
  {
    provider:"brave",endpoint:"https://api.search.brave.com/res/v1/web/search",header:"X-Subscription-Token",prefix:"",
    response:{type:"search",web:{results:[{url:source,title:"财务实习生",description:"招聘本科生"}]}},
    date:null,
  },
  {
    provider:"exa",endpoint:"https://api.exa.ai/search",header:"x-api-key",prefix:"",
    response:{results:[{url:source,title:"财务实习生",highlights:["招聘本科生"],publishedDate:"2026-11-17T00:00:00Z"}]},
    date:"2026-11-17",
  },
];

for (const config of newProviders) {
  test(`${config.provider} forwards the personal key and normalizes recruiting links`,async t=>{
    const fetch=t.mock.method(globalThis,"fetch",async (url,options)=>{
      const target=new URL(url);
      assert.equal(target.origin+target.pathname,config.endpoint);
      assert.equal(options.headers[config.header],config.prefix+"test-key");
      assert.equal(options.redirect,"manual");
      if(config.provider==="brave"){
        assert.equal(options.method??"GET","GET");
        assert.match(target.searchParams.get("q"),/财务实习/);
      }else{
        assert.equal(options.method,"POST");
        assert.match(JSON.parse(options.body).query,/财务实习/);
      }
      return Response.json(config.response);
    });
    const request=new Request("https://example.test/api/jobs/web-search",{
      method:"POST",body:JSON.stringify({query:"杭州财务实习",provider:config.provider,apiKey:"test-key"}),
    });
    const response=await handleWebJobSearch(request,{},[],async()=>[]);
    assert.deepEqual(response,{status:200,data:{matches:[{
      title:"财务实习生",snippet:"招聘本科生",publishedAt:config.date,
      source:"www.shixiseng.com",sourceUrl:source,hostname:"www.shixiseng.com",
    }]}});
    assert.equal(fetch.mock.callCount(),1);
  });
}

test("custom limit can exceed the legacy cap and is bounded before reserving quota",async()=>{
  const rows=await findWebJobs({
    query:"绍兴",apiKey:"test",limit:37,
    fetchImpl:async(_url,request)=>{
      assert.equal(JSON.parse(request.body).count,40);
      return Response.json({results:Array.from({length:40},(_,i)=>result(source+i))});
    },
  });
  assert.equal(rows.length,37);
  const request=new Request("https://example.test/api/jobs/web-search",{method:"POST",body:JSON.stringify({query:"绍兴",limit:51})});
  assert.deepEqual(await handleWebJobSearch(request,{},[],async()=>[]),{status:400,data:{error:"invalid_limit"}});
});

test("web endpoint does not call the live feed when key or quota is unavailable",async()=>{
  const request=()=>new Request("https://example.test/api/jobs/web-search",{method:"POST",body:JSON.stringify({query:"绍兴"})});
  const live=async()=>{assert.fail("must not fetch a feed");};
  assert.deepEqual(await handleWebJobSearch(request(),{},[],live),{status:503,data:{error:"key_missing"}});
  assert.deepEqual(await handleWebJobSearch(request(),{DEEPSEEK_API_KEY:"test",AI_SEARCH_DAILY_LIMIT:"invalid"},[],live),{status:503,data:{error:"quota_not_configured"}});
  assert.deepEqual(await handleWebJobSearch(request(),{DEEPSEEK_API_KEY:"test",AI_SEARCH_DAILY_LIMIT:"20"},[],live),{status:503,data:{error:"quota_storage_unavailable"}});
  const DB={prepare(){return {
    bind(_day,limit){assert.equal(limit,20);return this;},
    run:async()=>({meta:{changes:0}}),
  };}};
  assert.deepEqual(await handleWebJobSearch(request(),{DEEPSEEK_API_KEY:"test",AI_SEARCH_DAILY_LIMIT:"20",DB},[],live),{status:429,data:{error:"quota_exhausted"}});
});

test("web search without a site limit reports the provider balance response",async t=>{
  t.mock.method(globalThis,"fetch",async()=>new Response("",{status:402}));
  const request=new Request("http://127.0.0.1:8787/api/jobs/web-search",{method:"POST",body:JSON.stringify({query:"绍兴"})});
  const result=await handleWebJobSearch(request,{DEEPSEEK_API_KEY:"test"},[],async()=>[]);
  assert.deepEqual(result,{status:402,data:{error:"deepseek_balance_insufficient"}});
});
