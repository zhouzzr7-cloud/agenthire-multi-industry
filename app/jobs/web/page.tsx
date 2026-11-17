import {Suspense} from "react";
import {WebJobDetail} from "@/components/web-job-detail";

export const metadata = {title:"联网岗位详情"};

export default function WebJobPage(){
  return <Suspense fallback={<p className="container loading">正在读取联网岗位…</p>}><WebJobDetail/></Suspense>;
}
