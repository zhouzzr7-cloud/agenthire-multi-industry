import {realJobs} from "./real-jobs";
import {getCareerJobs} from "./career-jobs";
export {getCareerJobs};
export type Category = "agent-application" | "agent-infra" | "ai-infra" | "finance" | "operations" | "manufacturing";
export type JobStatus = "verified" | "unverified" | "closed" | "demo";
export type Education = "bachelor" | "college" | "master" | "any" | "unknown" | "highschool";
export interface Job {
  id: string; company: string; initials: string; title: string; city: string;
  primaryCategory: Category; relatedCategories: Category[]; specialty: string;
  salary: string | null; salaryMonthly: number | null; education: Education;
  companySize: string; recruitmentType: string; graduationYear: number | null;
  techStack: string[]; description: string; responsibilities: string[]; requirements: string[];
  categoryEvidence: string; freshGraduate: boolean | null; noExperience: boolean;
  remote: boolean; internship: string | null; publishedAt: string | null;
  updatedAt: string; lastVerifiedAt: string | null; source: string; sourceUrl: string | null;
  applyUrl: string | null; status: JobStatus;
  educationText?: string; verificationNote?: string; sourceCheckedAt?: string;
  deadline?: string; alternateApplyUrl?: string; cities?: string[]; live?: boolean;
  teamType?: "startup"; teamEvidenceUrl?: string;
  majorRequirement?: string;
  preferredQualifications?: string[];
  applicationStart?: string;
  detailsCheckedAt?: string;
  recruitmentNotes?: string[];
  recruitmentNoticeUrl?: string;
}
export const categories: Record<Category, { name: string; short: string; tech: string; description: string }> = {
  "agent-application": { name: "AI 应用开发", short: "AI 应用", tech: "LangGraph · RAG · MCP · Multi-Agent", description: "把模型能力，变成真正有用的产品。" },
  "agent-infra": { name: "智能体系统工程", short: "智能体系统", tech: "Harness · Runtime · Sandbox · Orchestration", description: "构建让智能体可靠运行的底层系统。" },
  "ai-infra": { name: "AI 基础设施", short: "AI 基础设施", tech: "LLM Serving · vLLM · Kubernetes", description: "为智能应用提供高效、稳定的算力基础。" },
  finance: { name: "财会", short: "财会", tech: "会计 · 税务 · 审计", description: "财务、会计和审计方向。" },
  operations: { name: "运营", short: "运营", tech: "内容 · 用户 · 新媒体", description: "内容和用户运营方向。" },
  manufacturing: { name: "制造", short: "制造", tech: "设备 · 工艺 · 质量", description: "制造和机械工程方向。" },
};
export const technologyCategories: readonly Category[] = ["agent-application", "agent-infra", "ai-infra"];
export const educationLabels: Record<Education, string> = { bachelor: "本科及以上", college: "大专及以上", master: "硕士及以上", any: "学历不限", unknown: "学历待核实", highschool:"含高中 / 本科在读" };
export const statusLabels: Record<JobStatus, string> = { verified: "投递入口已核验", unverified: "在招待核实", closed: "已关闭", demo: "DEMO" };
type Seed = Pick<Job, "id" | "company" | "initials" | "title" | "city" | "primaryCategory" | "specialty" | "techStack" | "education" | "companySize" | "recruitmentType" | "graduationYear" | "responsibilities" | "requirements"> & Partial<Job>;
const seeds: Seed[] = [
  { id:"agent-engineer", company:"Loop Studio", initials:"ls", title:"AI Agent 开发工程师", city:"上海", primaryCategory:"agent-application", specialty:"Agent 开发", techStack:["Python","LangGraph","RAG","FastAPI"], education:"bachelor",companySize:"20–99 人", recruitmentType:"校招",graduationYear:2027, responsibilities:["构建面向知识工作的 Agent 应用，完成检索、工具调用与结果评估。","使用 LangGraph 组织业务流程，持续改进任务完成率与响应速度。"], requirements:["本科及以上学历，接受应届毕业生。","熟悉 Python、HTTP API 与基础数据结构，具备个人项目经验。"], categoryEvidence:"工作重心为知识工作应用与 RAG 业务流程；使用 LangGraph 不等于开发 Agent Runtime。", salary:"15–25K / 月", salaryMonthly:15000 },
  { id:"runtime-engineer", company:"Context Works", initials:"cw",title:"Agent Runtime Engineer",city:"杭州",primaryCategory:"agent-infra",specialty:"Runtime / Harness",techStack:["TypeScript","Sandbox","Docker","MCP"],education:"bachelor",companySize:"20–99 人",recruitmentType:"日常实习",graduationYear:null,responsibilities:["实现 Agent 执行循环、工具注册与调用调度。","设计沙箱隔离、任务恢复和执行追踪，维护运行时状态。"], requirements:["本科及以上在读，熟悉 TypeScript 或 Python。","理解进程隔离与容器基础，愿意深入调试执行系统。"],categoryEvidence:"职责直接包含执行循环、沙箱隔离与运行时状态管理，因此归入 Agent Infra。",internship:"每周至少 3 天，持续 3 个月", salary:null },
  { id:"rag-intern",company:"Field Notes AI",initials:"fn",title:"RAG 应用开发实习生",city:"绍兴",primaryCategory:"agent-application",specialty:"RAG / 知识检索",techStack:["Python","RAG","Vector Database"],education:"bachelor",companySize:"1–20 人",recruitmentType:"日常实习",graduationYear:null,responsibilities:["实现文档解析、向量检索与引用展示。","建立检索评估集，优化企业知识问答体验。"],requirements:["本科及以上在读，无工作经验要求。","熟悉 Python，有检索增强生成项目经验优先。"],categoryEvidence:"围绕企业知识检索与问答产品开发，属于 LLM Application。",internship:"每周 4 天，持续 3 个月",salary:"180–260 元 / 天"},
  { id:"coding-agent",company:"Branch Systems",initials:"br",title:"Coding Agent 工程师",city:"上海",primaryCategory:"agent-infra",specialty:"Coding Agent",techStack:["Agent Harness","Tool Execution","Python"],education:"bachelor",companySize:"100–499 人",recruitmentType:"校招",graduationYear:2027,responsibilities:["开发代码智能体的工具执行框架和任务调度机制。","实现 Checkpoint、重试与可观测性，构建可重复的执行评估。"],requirements:["本科及以上，接受应届毕业生。","熟悉 Python、Git 和 Linux，理解自动化测试。"],categoryEvidence:"开发 Harness、工具执行及任务恢复机制，是 Agent 系统工程。",salary:"18–30K / 月",salaryMonthly:18000},
  { id:"ai-backend",company:"Small Hours",initials:"sh",title:"AI 应用后端工程师",city:"杭州",primaryCategory:"agent-application",specialty:"AI 后端",techStack:["FastAPI","MCP","PostgreSQL"],education:"college",companySize:"20–99 人",recruitmentType:"初级社招",graduationYear:null,responsibilities:["开发 LLM 产品后端与业务工具接口。","改进用户会话和检索服务的稳定性。"],requirements:["大专及以上，接受无工作经验候选人。","熟悉 Python Web 服务与关系型数据库。"],categoryEvidence:"开发应用业务接口，未涉及 Agent 执行引擎；MCP 标签本身不决定 Infra 分类。",salary:"12–20K / 月",salaryMonthly:12000},
  { id:"serving-engineer",company:"Inference Lab",initials:"il",title:"LLM Serving 工程师",city:"上海",primaryCategory:"ai-infra",specialty:"模型服务",techStack:["vLLM","Kubernetes","Python"],education:"master",companySize:"100–499 人",recruitmentType:"校招",graduationYear:2027,responsibilities:["部署面向 Agent 应用的模型推理服务。","监控服务吞吐与延迟，优化模型批处理策略。"],requirements:["硕士及以上学历，接受应届毕业生。","熟悉 Linux、容器与模型推理服务。"],categoryEvidence:"职责重心是模型 Serving 与推理部署，属于 AI Infra。",salary:"22–35K / 月",salaryMonthly:22000},
  { id:"observability",company:"Trace Collective",initials:"tc",title:"Agent Observability Engineer",city:"远程",primaryCategory:"agent-infra",specialty:"Tracing / Observability",techStack:["Tracing","OpenTelemetry","TypeScript"],education:"unknown",companySize:"1–20 人",recruitmentType:"不限届别",graduationYear:null,responsibilities:["构建跨工具调用的 Trace 收集和调试界面。","设计 Agent 运行状态与执行历史的观测协议。"],requirements:["熟悉 TypeScript 和事件驱动系统。","示例未提供学历和应届生要求，需单独核实。"],categoryEvidence:"对 Agent 执行历史和运行时状态进行观测，是 Agent Infra。",freshGraduate:null,remote:true,noExperience:false},
  { id:"workflow-intern",company:"Open Circuit",initials:"oc",title:"Multi-Agent 开发实习生",city:"北京",primaryCategory:"agent-application",specialty:"Multi-Agent",techStack:["LangGraph","Python","Multi-Agent"],education:"any",companySize:"500–999 人",recruitmentType:"暑期实习",graduationYear:2028,responsibilities:["实现多智能体协作的业务工作流。","为工具调用与回答质量设计回归评估。"],requirements:["学历不限，接受在校学生。","具备可展示的 Python 应用项目。"],categoryEvidence:"围绕业务工作流开发多 Agent 应用，未开发通用调度运行时。",internship:"暑期连续 2 个月"},
  { id:"gpu-platform",company:"Compute Assembly",initials:"ca",title:"GPU 平台初级工程师",city:"深圳",primaryCategory:"ai-infra",specialty:"GPU 调度",techStack:["Ray","Kubernetes","Docker"],education:"bachelor",companySize:"1000 人以上",recruitmentType:"初级社招",graduationYear:null,responsibilities:["维护共享 GPU 资源池与任务队列。","参与云原生推理集群的部署和巡检。"],requirements:["本科及以上，具备一年相关经验。","熟悉 Kubernetes 与 Linux 网络。"],categoryEvidence:"通用算力调度与基础设施维护，相关性低于 Agent Runtime 或 Agent 应用工程。",freshGraduate:false,noExperience:false},
];
export const demoJobs: Job[] = seeds.map(seed => ({
  relatedCategories:[], salary:null,salaryMonthly:null,description:"这是一条用于体验搜索、筛选与收藏功能的演示岗位。公司与职位均为虚构示例，不代表实际招聘。",
  categoryEvidence:"",freshGraduate:true,noExperience:true,remote:false,internship:null,publishedAt:null,updatedAt:"2026-10-20",
  lastVerifiedAt:null,source:"AgentHire 演示数据",sourceUrl:null,applyUrl:null,status:"demo",...seed,
}));
export const jobs: Job[] = [...realJobs,...demoJobs];
export function bachelorEligible(education: Education): boolean | null {
  if (education === "unknown") return null;
  return education !== "master";
}
export function getJobs() { return jobs; }
export function getJob(id: string) { return jobs.find(job => job.id === id) ?? getCareerJobs().find(job => job.id === id); }
export const priorityCities = ["上海","杭州","绍兴"];
export function jobCities(job: Job){return job.cities??[job.city];}
export function jobHref(job: Job){return job.live?`/jobs/live/?id=${encodeURIComponent(job.id)}`:`/jobs/${job.id}/`;}
export function isOpenJob(job: Job){return job.status!=="demo"&&job.status!=="closed";}
export function hasSmallHeadcount(job: Job){
  const upper = job.companySize.match(/^(?:少于\s*|(?:\d+\s*[–—~至-]\s*)?)(\d+)\s*人(?:\s*(?:以下|以内))?$/)?.[1];
  return upper !== undefined && Number(upper) <= 500;
}
export function isTeamOpportunity(job: Job){return hasSmallHeadcount(job) || job.teamType==="startup";}
export function recruitmentTrack(job: Job){
  if(job.recruitmentType.includes("实习")&&!job.recruitmentType.startsWith("全职"))return "internship";
  if(/校招|校园招聘/.test(job.recruitmentType))return "campus";
  return "social";
}
export function canApply(job: Job) { return job.status !== "demo" && job.status !== "closed" && !!job.applyUrl && /^https:\/\//.test(job.applyUrl); }
export function jobRecruitmentAction(job: Job) {
  if (job.status === "demo" || job.status === "closed") return null;
  const applicationUrl = canApply(job) ? job.applyUrl : null;
  if (applicationUrl && job.status === "verified") return {url:applicationUrl,label:"前往原站投递"};
  if (applicationUrl && applicationUrl !== job.sourceUrl) return {url:applicationUrl,label:"查看投递页面"};
  if (job.sourceUrl?.startsWith("https://")) return {url:job.sourceUrl,label:"查看招聘原页"};
  return null;
}
export function realJobCount() { return jobs.filter(j => j.status !== "demo" && j.status !== "closed").length; }
export function verifiedJobCount() { return jobs.filter(j=>j.status==="verified").length; }
export function getFeaturedJobs() { return queryJobs(new URLSearchParams()).slice(0,4); }
const synonyms = [["智能体","agent","agentic"],["运行时","runtime"],["沙箱","sandbox"],["检索增强","rag"],["编排","orchestration"],["推理","inference","serving"]];
export function matchesSearch(job: Job, query: string) {
  const haystack = [job.title,job.company,job.city,job.recruitmentType,job.educationText??educationLabels[job.education],job.specialty,job.description,...job.techStack,...job.responsibilities,...job.requirements].join(" ").toLowerCase();
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean).every(token => {
    const alternatives = synonyms.find(group => group.includes(token)) ?? [token];
    return alternatives.some(term => haystack.includes(term));
  });
}
export function queryJobs(params: URLSearchParams, records: Job[] = jobs, now = new Date()) {
  const get = (key:string) => params.get(key) ?? "";
  const category = get("category");
  const list = records.filter(j => {
    // Closed and demo records require an explicit status selection.
    if (!get("status") && (j.status==="demo" || j.status==="closed")) return false;
    if (!matchesSearch(j,get("q"))) return false;
    if (category === "technology" ? !technologyCategories.includes(j.primaryCategory) : category && j.primaryCategory !== category) return false;
    if (get("city") === "其他" ? jobCities(j).every(city=>priorityCities.includes(city)) : get("city") && !jobCities(j).includes(get("city"))) return false;
    if (get("education") === "eligible" ? bachelorEligible(j.education) !== true : get("education") && j.education !== get("education")) return false;
    if (get("size") && j.companySize !== get("size")) return false;
    if (get("team") === "1" && !isTeamOpportunity(j)) return false;
    if (get("type") && j.recruitmentType !== get("type")) return false;
    if (get("track") && recruitmentTrack(j) !== get("track")) return false;
    if (get("year") && String(j.graduationYear) !== get("year")) return false;
    if (get("specialty") && j.specialty !== get("specialty")) return false;
    if (get("status") && j.status !== get("status")) return false;
    if (get("bachelor") === "1" && bachelorEligible(j.education) !== true) return false;
    if (get("fresh") === "1" && j.freshGraduate !== true) return false;
    if (get("experience") === "1" && !j.noExperience) return false;
    if (get("remote") === "1" && !j.remote) return false;
    if (get("days")) {
      if (!j.publishedAt) return false;
      const age = now.getTime() - new Date(j.publishedAt).getTime();
      if (age < 0 || age > Number(get("days"))*86400000) return false;
    }
    return true;
  });
  const timestamp = (v:string|null) => v ? new Date(v).getTime() : 0;
  return list.sort((a,b) => {
    if (get("sort") === "salary") return (b.salaryMonthly ?? -1)-(a.salaryMonthly ?? -1);
    if (get("sort") === "newest") return timestamp(b.publishedAt)-timestamp(a.publishedAt);
    if (get("sort") === "updated") return timestamp(b.updatedAt)-timestamp(a.updatedAt);
    const rank=(j:Job) => j.primaryCategory !== "ai-infra" ? 2 : ["GPU 调度","芯片推理优化"].includes(j.specialty) ? 0 : 1;
    return rank(b)-rank(a) || Number(isTeamOpportunity(b))-Number(isTeamOpportunity(a))
      || Number(bachelorEligible(b.education)===true)-Number(bachelorEligible(a.education)===true)
      || Number(b.freshGraduate===true)-Number(a.freshGraduate===true)
      || Number(b.status==="verified")-Number(a.status==="verified")
      || Number(jobCities(b).some(city=>priorityCities.includes(city)))-Number(jobCities(a).some(city=>priorityCities.includes(city)))
      || timestamp(b.publishedAt)-timestamp(a.publishedAt);
  });
}
