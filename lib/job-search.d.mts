import type {Job} from "./jobs";

export type JobSearchResult = {
  mode: "rules" | "deepseek" | "fallback";
  matches: {id:string; reason:string}[];
};
export function searchSiteJobs(query:string,jobs:Job[],options?:{apiKey?:string;model?:string}):Promise<JobSearchResult>;
