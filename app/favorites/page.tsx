import {Suspense} from "react";
import {JobExplorer} from "@/components/job-explorer";
export const metadata={title:"我的收藏"};
export default function FavoritesPage(){return <Suspense fallback={<p className="container loading">正在加载收藏…</p>}><JobExplorer favorites/></Suspense>;}
