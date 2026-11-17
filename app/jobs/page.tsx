import {Suspense} from "react";
import {JobExplorer} from "@/components/job-explorer";
export const metadata={title:"Explore Jobs"};
export default function JobsPage(){return <Suspense fallback={<p className="container loading">正在加载岗位…</p>}><JobExplorer/></Suspense>;}
