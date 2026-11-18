import {isCampusJobHost,jobDetailSourceUrl} from "../lib/job-detail-sources.mjs";
import {clean,jobPoints} from "./sources.mjs";
import {loadCampusPosting,readLimitedBytes} from "./campus-posting.mjs";

const maxPageBytes=1_500_000;
const campusPointOptions={limit:12,pointLength:450};
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

function campusDetails(html,posting){
  const sections={responsibilities:[],requirements:[],preferredQualifications:[]};
  const unlabeled=[];
  let field=null;
  let hasHeading=false;
  for(const line of posting){
    const heading=line.match(/^(?:✅\s*)?(?:[一二三四五六七八九十]+[、．.]\s*)?[【〖\[]?(岗位职责|工作职责|岗位描述|工作内容|任职要求|岗位要求|任职资格|应聘条件|招聘条件|要求|(?:我们)?希望你(?:是|具备)|加分项|优先条件)[】〗\]]?\s*(?:[：:]\s*(.*))?$/u);
    const point=line.replace(/^\s*(?:\d{1,2}[、．.)）]|[-•、])\s*/u,"");
    if(heading){
      hasHeading=true;
      field=/职责|内容|描述/u.test(heading[1])?"responsibilities":/加分|优先/u.test(heading[1])?"preferredQualifications":"requirements";
      if(heading[2])sections[field].push(heading[2].replace(/^、\s*/u,""));
    }else if(/^(?:✅\s*)?(?:简历请|投递方式|应聘方式|工作地点|薪资|薪酬|福利|联系方式|公司简介|公司氛围|发展[：:])/u.test(line)){
      hasHeading=true;
      field=null;
    }else if(field){
      sections[field].push(point);
    }else if(!hasHeading){
      unlabeled.push(point);
    }
  }
  const duties=sections.responsibilities;
  const hasUnlabeledDuties=unlabeled.length>=2&&unlabeled.every(point=>/^(?:负责|协助|参与|跟进|配合|执行|维护|开展|使用|建立|根据)/u.test(point));
  const responsibilities=jobPoints((duties.length||!hasUnlabeledDuties?duties:unlabeled).join("\n"),campusPointOptions);
  const requirements=jobPoints(sections.requirements.join("\n"),campusPointOptions);
  const preferredQualifications=jobPoints(sections.preferredQualifications.join("\n"),campusPointOptions);
  const facts=html.match(/<div\b[^>]*class="details-list"[^>]*>([\s\S]*?)<\/ul>/iu)?.[1]??"";
  const basicRequirements=[...facts.matchAll(/<li\b[^>]*>\s*(工作经验|语言要求|需求专业|学历要求)\s*[:：]\s*<span\b[^>]*>([\s\S]*?)<\/span>/giu)]
    .map(([,label,value])=>[label,clean(value)])
    .filter(([,value])=>value.length>0)
    .map(([label,value])=>`${label}：${value}`);
  return {responsibilities,requirements:requirements.length?requirements:basicRequirements,preferredQualifications};
}

export function parseSourceDetails(sourceUrl,html,posting=[]){
  const host=new URL(sourceUrl).hostname;
  if(host==="www.shixiseng.com")return parseInternship(html);
  if(isCampusJobHost(host))return campusDetails(html,posting);
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
  const html=new TextDecoder().decode(await readLimitedBytes(response.body,maxPageBytes));
  const posting=isCampusJobHost(new URL(url).hostname)?await loadCampusPosting(url,html,fetcher).catch(()=>[]):[];
  return parseSourceDetails(url,html,posting);
}
