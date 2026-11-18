import assets from "./assets.mjs";
import {dedupe,getBaiduJobs,getIndexJobs} from "./sources.mjs";
import {getTeamJobs} from "./team-sources.mjs";
import {withReviewedDetails} from "./reviewed-job-details.mjs";
import {loadSourceDetails} from "./source-details.mjs";
import {handleCareerSearch,handleWebJobSearch} from "./career-search.mjs";
import {getCareerJobs,getJobs} from "../lib/jobs.ts";

const maxAge = 36 * 60 * 60 * 1000;
const interval = 18 * 60 * 60 * 1000;
const enc = new TextEncoder();
const collectors = {baidu:getBaiduJobs,index:getIndexJobs,teams:getTeamJobs};
const shanghaiDate = new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"});
const empty = {groups:{},refreshedAt:null,added:0,partial:false};

function json(data,status=200){
  return Response.json(data,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
}

async function read(env){
  const row = await env.DB.prepare("SELECT snapshot FROM agenthire_feed WHERE id = 1").first();
  return row ? JSON.parse(row.snapshot) : empty;
}

function publicFeed(snapshot,now=Date.now()){
  const today=shanghaiDate.format(now);
  const jobs=dedupe(Object.values(snapshot.groups).flatMap(({jobs,at})=>jobs.map(withReviewedDetails).map(job=>{
    if(job.deadline&&job.deadline<today){
      return {...job,status:"closed",applyUrl:null,lastVerifiedAt:null,verificationNote:"原招聘页公布的申请截止日期已过。"};
    }
    if(now-Date.parse(at)<=maxAge)return job;
    return {...job,status:"unverified",applyUrl:null,lastVerifiedAt:null,verificationNote:"招聘来源同步延迟，请到原站确认岗位状态。"};
  })));
  return {jobs,refreshedAt:snapshot.refreshedAt,added:snapshot.added,partial:snapshot.partial};
}

function stats(snapshot){
  const {jobs,...rest}=publicFeed(snapshot);
  return {...rest,total:jobs.filter(job=>job.status!=="closed").length,verified:jobs.filter(job=>job.status==="verified").length};
}

async function authorized(request,env){
  const stamp = request.headers.get("X-AgentHire-Time")??"";
  const signature = request.headers.get("X-AgentHire-Signature")??"";
  if(!env.AGENTHIRE_SERVICE_PROOF||!/^\d{13}$/.test(stamp)||Math.abs(Date.now()-Number(stamp))>300000||!/^[a-f0-9]{64}$/.test(signature))return false;
  const key=await crypto.subtle.importKey("raw",enc.encode(env.AGENTHIRE_SERVICE_PROOF),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
  const bytes=Uint8Array.from(signature.match(/../g),pair=>parseInt(pair,16));
  return crypto.subtle.verify("HMAC",key,bytes,enc.encode("agenthire-refresh:"+stamp));
}

function canRefreshLocally(url,env){
  return env.AGENTHIRE_LOCAL_REFRESH==="1"&&["127.0.0.1","localhost","[::1]"].includes(url.hostname);
}

async function refresh(env,manual=false){
  const snapshot=await read(env);
  const now=Date.now();
  const ready=Object.keys(collectors).every(name=>snapshot.groups[name]);
  if(!manual&&ready&&snapshot.refreshedAt&&now-Date.parse(snapshot.refreshedAt)<interval)return json({result:"already_current",...stats(snapshot)});
  const refreshedAt=new Date(now).toISOString();
  const checkedAt=shanghaiDate.format(now);
  const answers=await Promise.allSettled(Object.entries(collectors).map(async([name,collect])=>[name,await collect(fetch,checkedAt)]));
  const groups={...snapshot.groups};
  let successes=0;
  let partial=false;
  const failures=[];
  for(const answer of answers){
    if(answer.status==="rejected"){
      partial=true;
      failures.push(String(answer.reason?.message??"来源请求失败"));
      continue;
    }
    const [name,result]=answer.value;
    if(result.partial){
      partial=true;
      const currentIds=new Set(result.jobs.map(job=>job.id));
      // Keep older unreturned records when part of a source failed.
      const fallback=(groups[name]?.jobs??[]).filter(job=>!currentIds.has(job.id)).map(job=>({
        ...job,status:"unverified",applyUrl:null,lastVerifiedAt:null,verificationNote:"上一次同步时收录，本次未完成原站复核。",
      }));
      result.jobs.push(...fallback.slice(0,Math.max(0,85-result.jobs.length)));
    }
    groups[name]={jobs:result.jobs,at:refreshedAt};
    successes++;
  }
  if(!successes)return json({result:"sources_unavailable",failures,...stats(snapshot)},503);
  const priorIds=new Set(publicFeed(snapshot).jobs.map(job=>job.sourceUrl));
  const next={groups,refreshedAt,partial,added:0};
  next.added=publicFeed(next).jobs.filter(job=>job.status!=="closed"&&!priorIds.has(job.sourceUrl)).length;
  await env.DB.prepare(
    "INSERT INTO agenthire_feed (id, refreshed_at, snapshot) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET refreshed_at=excluded.refreshed_at, snapshot=excluded.snapshot WHERE excluded.refreshed_at > agenthire_feed.refreshed_at"
  ).bind(refreshedAt,JSON.stringify(next)).run();
  return json({result:partial?"partially_refreshed":"refreshed",...stats(await read(env))});
}

function staticPage(request,url){
  const file = url.pathname.endsWith("/") ? url.pathname+"index.html" : url.pathname;
  if(!assets[file]&&assets[file+"/index.html"]){
    url.pathname=file+"/";
    return Response.redirect(url,308);
  }
  const asset=assets[file];
  const [type,encoded]=asset??assets["/404.html"];
  const headers={"Content-Type":type,"X-Content-Type-Options":"nosniff","Cache-Control":file.startsWith("/_next/static/")?"public, max-age=31536000, immutable":"no-cache"};
  const body=request.method==="HEAD"?null:new Blob([Uint8Array.from(atob(encoded),character=>character.charCodeAt(0))]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(body,{status:asset?200:404,headers});
}

export default {
  async fetch(request,env){
    const url = new URL(request.url);
    const path = url.pathname.startsWith("/api/") ? url.pathname.replace(/\/$/,"") : url.pathname;
    const local=canRefreshLocally(url,env);
    const sameOriginLocal=local&&request.headers.get("Origin")===url.origin;
    try{
      if(path==="/api/jobs"&&request.method==="GET")return json({
        ...publicFeed(await read(env)),manualRefresh:local,webSearchEnabled:Boolean(env.DEEPSEEK_API_KEY),
      });
      if(path==="/api/jobs/source-details"&&request.method==="GET"){
        const details=await loadSourceDetails(url.searchParams.get("source")).catch(error=>{
          console.warn("Unable to read public job details",error.message);
          return null;
        });
        if(!details||(!details.responsibilities.length&&!details.requirements.length&&!details.preferredQualifications?.length))return json({error:"source_details_unavailable"},404);
        return Response.json(details,{headers:{"Cache-Control":"public, max-age=900","X-Content-Type-Options":"nosniff"}});
      }
      if(path==="/api/jobs/search"&&request.method==="POST"){
        if(local&&!sameOriginLocal)return json({error:"unauthorized"},403);
        const {status,data}=await handleCareerSearch(request,env,[...getJobs(),...getCareerJobs()],async()=>publicFeed(await read(env)).jobs,sameOriginLocal);
        return json(data,status);
      }
      if(path==="/api/jobs/web-search"&&request.method==="POST"){
        if(local&&!sameOriginLocal)return json({error:"unauthorized"},403);
        const {status,data}=await handleWebJobSearch(request,env,[...getJobs(),...getCareerJobs()],async()=>publicFeed(await read(env)).jobs,sameOriginLocal);
        return json(data,status);
      }
      if(path==="/api/refresh"&&request.method==="POST"){
        if(!sameOriginLocal&&!await authorized(request,env))return json({error:"unauthorized"},403);
        return await refresh(env,sameOriginLocal);
      }
      if(url.pathname.startsWith("/api/"))return json({error:"not_found"},404);
      if(request.method!=="GET"&&request.method!=="HEAD")return new Response(null,{status:405,headers:{Allow:"GET, HEAD"}});
      return staticPage(request,url);
    }catch(error){
      console.error("AgentHire request failed",url.pathname,error?.message);
      return json({error:"temporarily_unavailable"},503);
    }
  },
};
