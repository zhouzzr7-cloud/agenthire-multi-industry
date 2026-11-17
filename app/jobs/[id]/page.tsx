import {notFound} from "next/navigation";
import {getCareerJobs,getJobs,getJob} from "@/lib/jobs";
import {JobDetail} from "@/components/job-detail";

export function generateStaticParams(){return [...getJobs(),...getCareerJobs()].map(job=>({id:job.id}));}
export async function generateMetadata({params}:{params:Promise<{id:string}>}){
  return {title:getJob((await params).id)?.title??"岗位未找到"};
}
export default async function DetailPage({params}:{params:Promise<{id:string}>}){
  const job=getJob((await params).id);
  if(!job)notFound();
  return <JobDetail job={job}/>;
}
