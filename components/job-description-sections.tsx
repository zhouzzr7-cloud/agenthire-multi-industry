"use client";

import {useEffect,useState} from "react";
import {jobDetailSourceUrl} from "@/lib/job-detail-sources.mjs";

type Description = {responsibilities:string[];requirements:string[]};

export function JobDescriptionSections({
  sourceUrl,responsibilities=[],requirements=[],preferredQualifications=[],reviewed=false,notice=false,
}:{
  sourceUrl:string|null;
  responsibilities?:string[];
  requirements?:string[];
  preferredQualifications?:string[];
  reviewed?:boolean;
  notice?:boolean;
}){
  const url=reviewed?null:jobDetailSourceUrl(sourceUrl);
  const [result,setResult]=useState<{url:string;description:Description|null}>();
  useEffect(()=>{
    if(!url)return;
    const controller=new AbortController();
    const query=new URLSearchParams({source:url});
    fetch(`/api/jobs/source-details?${query}`,{signal:controller.signal})
      .then(response=>response.ok?response.json() as Promise<Description>:null)
      .then(description=>{if(!controller.signal.aborted)setResult({url,description});})
      .catch(()=>{if(!controller.signal.aborted)setResult({url,description:null});});
    return ()=>controller.abort();
  },[url]);

  const source=result?.url===url?result.description:null;
  const loading=Boolean(url&&result?.url!==url);
  const duties=source?.responsibilities.length?source.responsibilities:responsibilities;
  const qualifications=source?.requirements.length?source.requirements:requirements;
  return <>
    <section>
      <h2>工作职责</h2>
      {duties.length?<ul>{duties.map((item,index)=><li key={`${index}-${item}`}>{item}</li>)}</ul>:<p>{
        loading?"正在读取招聘原页…":notice?"校招简章公布了岗位方向、学历、专业和工作城市，未逐项列出日常职责。":"当前收录信息未包含具体职责，可在招聘原页查看完整说明。"
      }</p>}
    </section>
    <section>
      <h2>任职要求</h2>
      {qualifications.length?<ul>{qualifications.map((item,index)=><li key={`${index}-${item}`}>{item}</li>)}</ul>:<p>{loading?"正在读取招聘原页…":"当前收录信息未包含具体任职要求。"}</p>}
      {preferredQualifications.length>0&&<>
        <h3>加分项</h3>
        <ul>{preferredQualifications.map(item=><li key={item}>{item}</li>)}</ul>
      </>}
      {source&&<p className="small-copy">以上补充信息摘自招聘原页。</p>}
    </section>
  </>;
}
