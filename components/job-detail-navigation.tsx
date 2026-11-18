"use client";

import {Suspense} from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {ArrowLeft, Sparkles} from "lucide-react";
import {aiSearchHref} from "@/lib/ai-search-navigation";

function DetailNavigation({web=false}:{web?:boolean}){
  const returnHref=aiSearchHref(useSearchParams().get("ai"),web?"web":undefined);
  return <nav className="detail-navigation" aria-label="返回岗位列表">
    {returnHref&&<Link className="detail-return-ai" href={returnHref}>
      <ArrowLeft size={16} aria-hidden="true"/>返回 AI 搜索结果 <Sparkles size={14} aria-hidden="true"/>
    </Link>}
    <Link className="back-link" href="/jobs/">{!returnHref&&<ArrowLeft size={15} aria-hidden="true"/>}全部岗位</Link>
  </nav>;
}

export function JobDetailNavigation({web=false}:{web?:boolean}){
  return <Suspense fallback={<Link className="back-link" href="/jobs/"><ArrowLeft size={15} aria-hidden="true"/>全部岗位</Link>}>
    <DetailNavigation web={web}/>
  </Suspense>;
}
