import {searchSiteJobs} from "../lib/job-search.mjs";
import {findWebJobs,WebSearchHttpError} from "./web-jobs.mjs";

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
    const {query,limit}=JSON.parse(raw+decoder.decode())??{};
    return typeof query==="string"&&query.trim()&&query.length<=240?{query:query.trim(),limit}:null;
  }catch{
    return null;
  }finally{
    reader.releaseLock();
  }
}

async function reserveModelRequest(env,local){
  if(!env.DEEPSEEK_API_KEY)return "key_missing";
  if(local)return "reserved";
  const limit=Number(env.AI_SEARCH_DAILY_LIMIT);
  if(!Number.isInteger(limit)||limit<1||limit>500)return "quota_not_configured";
  try{
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS agenthire_ai_quota (day TEXT PRIMARY KEY, requests INTEGER NOT NULL)").run();
    const day=new Date().toISOString().slice(0,10);
    const result=await env.DB.prepare(
      "INSERT INTO agenthire_ai_quota (day, requests) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET requests=requests+1 WHERE requests < ?"
    ).bind(day,limit).run();
    return result.meta.changes===1?"reserved":"quota_exhausted";
  }catch{
    return "quota_storage_unavailable";
  }
}

export async function handleCareerSearch(request,env,records,liveRecords,local=false){
  const input=await readQuery(request);
  if(!input)return {status:400,data:{error:"invalid_query"}};
  const live=await liveRecords().catch(()=>[]);
  const useModel=await reserveModelRequest(env,local)==="reserved";
  const data=await searchSiteJobs(input.query,[...records,...live],useModel?{apiKey:env.DEEPSEEK_API_KEY}:{});
  return {status:200,data};
}

export async function handleWebJobSearch(request,env,records,liveRecords,local=false){
  const input=await readQuery(request);
  if(!input)return {status:400,data:{error:"invalid_query"}};
  if(input.limit!==undefined&&(!Number.isInteger(input.limit)||input.limit<1||input.limit>50)){
    return {status:400,data:{error:"invalid_limit"}};
  }
  const reservation=await reserveModelRequest(env,local);
  if(reservation!=="reserved")return {status:reservation==="quota_exhausted"?429:503,data:{error:reservation}};
  const live=await liveRecords().catch(()=>[]);
  const knownUrls=[...records,...live].flatMap(job=>[job.sourceUrl,job.applyUrl]).filter(Boolean);
  try{
    return {status:200,data:{matches:await findWebJobs({query:input.query,limit:input.limit,apiKey:env.DEEPSEEK_API_KEY,knownUrls})}};
  }catch(error){
    if(error instanceof WebSearchHttpError){
      if(error.status===402)return {status:402,data:{error:"deepseek_balance_insufficient"}};
      if(error.status===401)return {status:502,data:{error:"deepseek_key_rejected"}};
      if(error.status===429)return {status:429,data:{error:"deepseek_rate_limited"}};
    }
    return {status:502,data:{error:"web_search_unavailable"}};
  }
}
