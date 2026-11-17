import {Suspense} from "react";
import {LiveDetail} from "@/components/live-detail";

export const metadata={title:"岗位详情"};
export default function LiveJobPage(){
  return <Suspense fallback={<p className="container loading">正在读取岗位…</p>}><LiveDetail/></Suspense>;
}
