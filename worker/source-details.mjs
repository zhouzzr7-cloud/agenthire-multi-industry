import {jobDetailSourceUrl} from "../lib/job-detail-sources.mjs";
import {clean,jobPoints} from "./sources.mjs";

const maxPageBytes=1_500_000;
const sectionHeading=/(?:^|[\s。；])(?:[一二三四五六七八九十]+[、．.]\s*)?[【〖\[]?(工作职责|岗位职责|职位职责|职责描述|工作内容|你会负责|任职资格|岗位要求|应聘资格|任职要求|职位要求|职责要求|希望你具备|加分项|实习待遇|福利待遇|薪资待遇|工作地点|公司介绍|公司简介)[】〗\]]?\s*[：:]?\s*/gu;
const requirementsHeading=/资格|要求|希望你具备/u;
const dutiesHeading=/职责|工作内容|你会负责/u;
const stripSectionPrefix=value=>value.replace(/^\s*(?:[一二三四五六七八九十]+[、．.]\s*)?(?:岗位职责|工作职责|任职要求|岗位要求)[：:]?\s*/u,"");

function parseInternship(html){
  const fragment=html.match(/<div\b[^>]*\bclass="[^"\n]*\bjob_detail\b[^"\n]*"[^>]*>([\s\S]*?)<\/div>/iu)?.[1];
  if(!fragment)return {responsibilities:[],requirements:[]};
  const text=fragment.replace(/<\/(?:p|li)>|<br\s*\/?>/giu,"\n").split(/\r?\n/u).map(clean).join("\n");
  const sections=[...text.matchAll(sectionHeading)];
  const result={responsibilities:[],requirements:[]};
  for(const [index,section] of sections.entries()){
    const heading=section[1];
    const field=requirementsHeading.test(heading)?"requirements":dutiesHeading.test(heading)?"responsibilities":null;
    if(field&&result[field].length===0){
      result[field]=jobPoints(text.slice(section.index+section[0].length,sections[index+1]?.index));
    }
  }
  return result;
}

export function parseSourceDetails(sourceUrl,html){
  if(new URL(sourceUrl).hostname==="www.shixiseng.com")return parseInternship(html);
  const duties=html.match(/>\s*岗位职责\s*<\/div>\s*(?:<!--\s*-->)?\s*<div\b[^>]*>([\s\S]*?)<\/div>/iu)?.[1]??"";
  const requirements=html.match(/>\s*岗位要求\s*<\/div>\s*(?:<!--\s*-->)?\s*<div\b[^>]*>([\s\S]*?)<\/div>/iu)?.[1]??"";
  return {responsibilities:jobPoints(stripSectionPrefix(duties)),requirements:jobPoints(stripSectionPrefix(requirements))};
}

export async function loadSourceDetails(value,fetcher=fetch){
  const url=jobDetailSourceUrl(value);
  if(!url)return null;
  const response=await fetcher(url,{redirect:"manual",signal:AbortSignal.timeout(4500)});
  if(!response.ok||!response.body||Number(response.headers.get("Content-Length"))>maxPageBytes){
    await response.body?.cancel();
    return null;
  }
  const reader=response.body.getReader();
  const decoder=new TextDecoder();
  let size=0,html="";
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      size+=value.byteLength;
      if(size>maxPageBytes){
        await reader.cancel();
        return null;
      }
      html+=decoder.decode(value,{stream:true});
    }
  }finally{
    reader.releaseLock();
  }
  return parseSourceDetails(url,html+decoder.decode());
}
