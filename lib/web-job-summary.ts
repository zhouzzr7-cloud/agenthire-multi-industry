const degrees=String.raw`(?:博士研究生|硕士研究生|研究生|博士|硕士|本科|大专|专科|学历不限)(?:(?:[、,，/／])(?:博士研究生|硕士研究生|研究生|博士|硕士|本科|大专|专科|学历不限))*(?:及以上)?`;
const labelledRow=new RegExp(String.raw`职位名称\s*[:：]\s*([^;；|]{2,45})[;；]\s*(?:需求)?学历\s*[:：]\s*(${degrees})\s*[;；]\s*(?:需求|招聘)人数\s*[:：]\s*(\d{1,4})(?=\s|人|[.;；。…]|$)`,"gu");
const tableRow=new RegExp(String.raw`(?:^|\.{2,}|…+|\n)\s*([^|｜.。…\n]{2,45}?)\s*[|｜]\s*(${degrees})\s*[|｜]\s*(\d{1,4})(?=\s|人|[.;；。…|｜]|$)`,"gu");

export function webJobSummaryRows(snippet:string){
  const rows=new Map<string,{title:string;education:string;headcount:number}>();
  for(const match of [...snippet.matchAll(labelledRow),...snippet.matchAll(tableRow)].sort((a,b)=>a.index-b.index)){
    const title=match[1].trim();
    const education=match[2].replace(/[,，/／]/gu,"、");
    const headcount=Number(match[3]);
    if(!rows.has(title))rows.set(title,{title,education,headcount});
  }
  return [...rows.values()];
}

export function webJobSummarySections(snippet:string){
  const heading=/(?:^|(?<=[\s。；…])|(?<=\.\.))\s*(工作职责|岗位职责|工作内容|岗位要求|任职要求|任职资格|工作地点|薪资待遇|投递方式)\s*[:：]/gu;
  const sections=[...snippet.matchAll(heading)];
  const result={responsibilities:[] as string[],requirements:[] as string[]};
  sections.forEach((match,index)=>{
    const text=snippet.slice(match.index+match[0].length,sections[index+1]?.index).trim();
    if(!text)return;
    if(/职责|工作内容/.test(match[1]))result.responsibilities.push(text);
    if(/要求|资格/.test(match[1]))result.requirements.push(text);
  });
  return result;
}
