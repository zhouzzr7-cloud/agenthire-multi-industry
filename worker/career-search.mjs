import {searchSiteJobs} from "../lib/job-search.mjs";
import {findWebJobs} from "./web-jobs.mjs";

const maxBody = 4096;

async function readQuery(request){
  if(!request.body||Number(request.headers.get("Content-Length"))>maxBody)return null;
  const reader=request.body.getReader();
  const decoder=new TextDecoder();
  let size=0, raw="";
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      size+=value.byteLength;
      if(size>maxBody){
        await reader.cancel();
        return null;
      }
      raw+=decoder.decode(value,{stream:true});
    }
    const query=JSON.parse(raw+decoder.decode())?.query;
    return typeof query==="string"&&query.trim()&&query.length<=240?query.trim():null;
  }catch{
    return null;
  }finally{
    reader.releaseLock();
  }
}

async function reserveModelRequest(env){
  const limit=Number(env.AI_SEARCH_DAILY_LIMIT);
  if(!env.DEEPSEEK_API_KEY||!Number.isInteger(limit)||limit<1||limit>500)return false;
  try{
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS agenthire_ai_quota (day TEXT PRIMARY KEY, requests INTEGER NOT NULL)").run();
    const day=new Date().toISOString().slice(0,10);
    const result=await env.DB.prepare(
      "INSERT INTO agenthire_ai_quota (day, requests) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET requests=requests+1 WHERE requests < ?"
    ).bind(day,limit).run();
    return result.meta.changes===1;
  }catch{
    return false;
  }
}

export async function handleCareerSearch(request,env,records,liveRecords){
  const query=await readQuery(request);
  if(!query)return {status:400,data:{error:"invalid_query"}};
  const live=await liveRecords().catch(()=>[]);
  const useModel=await reserveModelRequest(env);
  const data=await searchSiteJobs(query,[...records,...live],useModel?{apiKey:env.DEEPSEEK_API_KEY}:{});
  return {status:200,data};
}

export async function handleWebJobSearch(request,env,records,liveRecords){
  const query=await readQuery(request);
  if(!query)return {status:400,data:{error:"invalid_query"}};
  if(!env.DEEPSEEK_API_KEY)return {status:503,data:{error:"key_missing"}};
  if(!await reserveModelRequest(env))return {status:429,data:{error:"quota_unavailable"}};
  const live=await liveRecords().catch(()=>[]);
  const knownUrls=[...records,...live].flatMap(job=>[job.sourceUrl,job.applyUrl]).filter(Boolean);
  try{
    return {status:200,data:{matches:await findWebJobs({query,apiKey:env.DEEPSEEK_API_KEY,knownUrls})}};
  }catch{
    return {status:502,data:{error:"web_search_unavailable"}};
  }
}
