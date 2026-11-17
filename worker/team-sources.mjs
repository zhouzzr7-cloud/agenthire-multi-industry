import {clean,dedupe,getHtml,makeJob,parseCities} from "./sources.mjs";

const indexOrigin="https://jobs.ivyea.com";
const priorityCities=["上海","杭州","绍兴"];
const roleTitle=/agent|智能体|harness|runtime|运行时|大模型应用|ai\s*(?:infra|native|应用)|coding|推理引擎|推理部署/i;
const nonTechnical=/运营|产品经理|市场|商业化|销售|商务|\bGTM\b|\bDevRel\b|开发者关系/i;

// Reviewed companies with published evidence of their startup or team background.
const startupCompanies=[
  ["infinigence","无问芯穹","https://www.shanghai.gov.cn/nw4411/20250430/97018490e0c74339bec56c6dadbef2f6.html"],
  ["mindverse","心识宇宙","https://www.nowcoder.com/enterprise/149396","20–99 人"],
  ["vast","VAST","https://www.cmccap.com/news/detail/450"],
  ["spirit-ai","千寻智能","https://pitchhub.36kr.com/project/3051237195749764?header=hide&specialWeb=1"],
  ["modelbest","面壁智能","https://m.bjnews.com.cn/detail/1775524542129007.html"],
  ["01ai","零一万物","https://www.01.ai/cn1"],
  ["ccnmt03i32a3","芯元时代","https://job.xidian.edu.cn/teachin/view/id/127013"],
  ["fcn5hvc5qbfs","Sharpa Robotics","https://www.career.zju.edu.cn/jyxt/sczp/zpztgl/ckZpgwList.zf?dwxxid=JG1499029"],
  ["ti-robot","钛虎机器人","https://www.stefg.org/new/newDetail.aspx?cid=&id=782"],
  ["meshy","Meshy AI","https://www.meshy.ai/careers"],
];

function companyRoles(html,company){
  const career=html.match(/<a\b[^>]*href="([^"]+)"[^>]*>\s*官方招聘页\s*→\s*<\/a>/)?.[1];
  if(!career)throw new Error("招聘页地址缺失");
  const careerHost=new URL(clean(career)).hostname;
  const rows=[];
  for(const [,id,titleHtml,meta,date] of html.matchAll(/<a class="t" href="\/jobs\/(\d+)">([\s\S]*?)<\/a>\s*<div class="m">([\s\S]*?)<\/div>\s*<\/div>\s*<span class="when" title="([^"]*)"/g)){
    const title=clean(titleHtml);
    const [city,track]=Array.from(meta.matchAll(/<span>([^<]+)<\/span>/g),match=>clean(match[1]));
    const cities=parseCities(city??"");
    if(!track||!cities.some(city=>priorityCities.includes(city))||!roleTitle.test(title)||nonTechnical.test(title))continue;
    const indexedAt=date.match(/本站收录 (\d{4}-\d{2}-\d{2})/)?.[1]??null;
    rows.push({id,title,cities,track,company,careerHost,indexedAt});
  }
  if(!rows.length&&!html.includes('class="row"'))throw new Error("招聘列表无法读取");
  const early=job=>job.track!=="社招"||job.title.includes("实习");
  return rows.sort((a,b)=>Number(early(b))-Number(early(a))||(b.indexedAt??"").localeCompare(a.indexedAt??"")).slice(0,4);
}

function officialJob(html,row,checkedAt){
  const candidates=html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  let data;
  for(const [,json] of candidates){
    const candidate=JSON.parse(json);
    if(candidate["@type"]==="JobPosting"){data=candidate;break;}
  }
  if(!data){
    const heading=clean(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1]??"");
    const url=html.match(/<a\b[^>]*href="([^"]+)"[^>]*>\s*去官方页面投递\s*→\s*<\/a>/)?.[1];
    if(heading!==row.title||!url||!html.includes('href="/companies/'+row.company[0]+'"'))return null;
    data={title:heading,url:clean(url),hiringOrganization:{name:row.company[1]}};
  }
  if(data.title!==row.title||!data.url||data.hiringOrganization?.name!==row.company[1])return null;
  const link=new URL(data.url);
  const companySite=data.hiringOrganization.sameAs?new URL(data.hiringOrganization.sameAs):null;
  if(link.protocol!=="https:"||link.username||link.password||
     (link.hostname!==row.careerHost&&link.hostname!==companySite?.hostname)||
     (link.pathname==="/"&&!link.search&&!link.hash))return null;
  const datePosted=/^\d{4}-\d{2}-\d{2}$/.test(data.datePosted??"")?data.datePosted:null;
  const year=row.title.match(/(?:20)?(2\d)\s*届/)?.[1];
  const type=row.track==="校招"?"校园招聘":row.track==="实习"||row.title.includes("实习")?"日常实习":"社会招聘";
  const requirements=html.match(/<h3>任职要求<\/h3>([\s\S]*?)(?:<h3>|<\/article>)/)?.[1]??"";
  const job=makeJob({
    id:"team-ivy-"+row.id,company:row.company[1],title:row.title,cities:row.cities,type,
    source:"Ivyea Jobs · 企业官网职位",sourceUrl:link.href,status:"unverified",
    checkedAt,indexedAt:row.indexedAt,duties:data.description??html.match(/<h3>职位描述<\/h3>([\s\S]*?)(?:<h3>|<\/article>)/)?.[1]??"",requirements,
    publishedAt:datePosted,graduationYear:year?2000+Number(year):null,
  });
  return {...job,companySize:row.company[3]??job.companySize,teamType:"startup",teamEvidenceUrl:row.company[2],verificationNote:"招聘索引提供职位对应的官网页面，开放状态与资格请在官网确认。"};
}

async function indexedTeams(fetcher,checkedAt){
  const boards=await Promise.allSettled(startupCompanies.map(async company=>{
    const html=await getHtml(fetcher,indexOrigin+"/companies/"+company[0]);
    return companyRoles(html,company);
  }));
  if(boards.every(board=>board.status==="rejected"))throw new Error("创业团队招聘列表无法读取");
  // Interleave employers so that the first company cannot fill the whole batch.
  const candidates=[0,1,2,3].flatMap(index=>boards.flatMap(board=>board.status==="fulfilled"&&board.value[index]?[board.value[index]]:[])).slice(0,26);
  const details=[];
  for(let i=0;i<candidates.length;i+=5){
    details.push(...await Promise.allSettled(candidates.slice(i,i+5).map(async row=>{
      try{
        return officialJob(await getHtml(fetcher,indexOrigin+"/jobs/"+row.id),row,checkedAt);
      }catch(error){
        if(error.message==="HTTP 404"||error.message==="HTTP 410")return null;
        throw error;
      }
    })));
  }
  const jobs=details.flatMap(result=>result.status==="fulfilled"&&result.value?[result.value]:[]);
  return {jobs,partial:boards.some(board=>board.status==="rejected")||details.some(result=>result.status==="rejected")};
}

const manualCheckedAt="2026-11-10";
const manualInternships=[
  {key:"inn_epvylk1xkfy5",company:"PlantcoreAI",title:"全栈 AI Agent 工程师实习",city:"杭州",deadline:"2026-11-26",salary:"300–400 元 / 天",internship:"每周 5 天，至少 3 个月",description:"开发工业场景 Agent 平台，覆盖工具执行、RAG、审批和多智能体协作。",duties:"TypeScript React RAG 多智能体 沙箱 工具调用",companySize:"少于 15 人",evidence:"https://www.shixiseng.com/intern/inn_t51twmx8s6zy"},
  {key:"inn_1hvmmxtdxtdt",company:"雄启新程",title:"AI 应用研发实习（Agent / Skill / Harness）",city:"上海",deadline:"2026-12-07",salary:"200–250 元 / 天",internship:"每周 4 天，至少 3 个月",description:"参与企业 Agent、技能模块和应用平台研发，研究 Harness 与音视频处理。",duties:"Agent Harness 企业技能开发",evidence:"https://www.deizao.cn/index/index/shixixq/jobid/232760"},
  {key:"inn_4gf2sw159kpo",company:"管产科技（AgentI）",title:"产品助理实习生（智能体方向）",city:"上海",deadline:"2026-12-08",salary:"150–180 元 / 天（页面标注）",internship:"每周约 5 天，至少 3 个月",description:"参与创业团队的智能体服务平台迭代，梳理用户需求、完善产品原型和功能验收。",duties:"Agent 产品"},
  {key:"inn_ffyynjcku7sc",company:"跨赴科技",title:"Agent 开发实习生",city:"北京",deadline:"2026-11-14",salary:"180–250 元 / 天",internship:"每周 5 天，至少 3 个月",description:"参与码上飞的 Agent 开发和评测，建设工具调用与自动化流程。",duties:"Agent 工具调用 评测",evidence:"https://www.jinglingshuju.com/data/item/19f4c9c708f196a4e71ac93799a95a46"},
];

function manualJobs(){
  return manualInternships.map(role=>{
    const url="https://www.shixiseng.com/intern/"+role.key;
    const job=makeJob({
      id:"team-sxs-"+role.key,company:role.company,title:role.title,cities:[role.city],type:"日常实习",
      source:"实习僧 · 企业发布",sourceUrl:url,applyUrl:url,status:"verified",
      checkedAt:manualCheckedAt,keywords:role.duties,requirements:"本科及以上",
    });
    return {...job,description:role.description,deadline:role.deadline,salary:role.salary,internship:role.internship,
      teamType:"startup",teamEvidenceUrl:role.evidence??url,companySize:role.companySize??job.companySize,
      verificationNote:"人工复核时原页提供投递入口，具体要求与是否仍有名额请以企业发布页为准。",
    };
  });
}

async function veloxisJobs(fetcher,checkedAt){
  const site="https://www.veloxis-tech.com";
  const url=site+"/careers.html";
  const html=await getHtml(fetcher,url);
  if(!html.includes("正式岗位与实习岗位同步开放")||!html.includes("实习：编译器 / Runtime / 模型部署")||!html.includes('href="/apply/"'))throw new Error("微路智能招聘入口已变更");
  const rows=[
    ["intern","编译器 / Runtime / 模型部署实习","日常实习"],
  ];
  return rows.map(([id,title,type])=>{
    const job=makeJob({
      id:"team-veloxis-"+id,company:"微路智能",title,cities:["杭州"],type,
      source:"微路智能官网",sourceUrl:url,applyUrl:site+"/apply/",status:"verified",checkedAt,
      keywords:"NPU Runtime 算子融合 IR 模型部署",
    });
    return {...job,primaryCategory:"ai-infra",specialty:"模型服务",teamType:"startup",
      teamEvidenceUrl:site+"/company.html",
      description:"参与端侧 NPU 编译器、运行时或模型部署，连接算子、驱动与部署链路。",
      internship:type==="日常实习"?"优先线下，可接受部分时间远程协作":null,
      verificationNote:"官网公开招聘页面当前列出该方向及在线简历入口。",
    };
  });
}

async function nowcoderJobs(fetcher,checkedAt){
  const company="中城交（上海）科技有限公司";
  const roles=[
    {id:"463748",title:"Agent 开发工程师（实习）",type:"日常实习",salary:"200–500 元 / 天",internship:"每周至少 4 天，至少 3 个月，可转正"},
    {id:"463747",title:"Agent 开发工程师",type:"校园招聘",salary:"20–50K / 月 · 12 薪",salaryMonthly:20000},
  ];
  const results=await Promise.allSettled(roles.map(async role=>{
    const url="https://www.nowcoder.com/jobs/detail/"+role.id;
    const html=await getHtml(fetcher,url);
    const title=clean(html.match(/<title>([^<]+)<\/title>/)?.[1]??"");
    if(!title.includes(company)||!title.includes("Agent开发工程师"))throw new Error("牛客招聘详情无法读取");
    const status=html.match(/<span>\s*(立即申请|已结束)\s*(?:<!--\s*-->)?\s*<\/span>/)?.[1];
    if(status==="已结束")return null;
    if(status!=="立即申请")throw new Error("牛客招聘状态无法读取");
    const job=makeJob({
      ...role,id:"team-nc-"+role.id,company,cities:["上海"],source:"牛客 · 企业招聘账号",
      sourceUrl:url,applyUrl:url,status:"verified",checkedAt,
      keywords:"Agent Harness 工具调用 多智能体 上下文 Python",requirements:"本科及以上",
    });
    return {...job,companySize:"20 人以下",teamEvidenceUrl:"https://www.zhaopin.com/companydetail/CZL1502106840.htm",
      deadline:"2027-08-31",salary:role.salary,salaryMonthly:role.salaryMonthly??null,internship:role.internship??null,
      description:"为交通与城市治理场景开发 Agent，建设任务规划、工具调用和记忆模块。",
      verificationNote:"招聘原页显示可申请。用人单位规模引用智联招聘公司资料。"
    };
  }));
  if(results.every(result=>result.status==="rejected"))throw new Error("牛客中小团队岗位无法读取");
  return {jobs:results.flatMap(result=>result.status==="fulfilled"&&result.value?[result.value]:[]),
    partial:results.some(result=>result.status==="rejected")};
}

export async function getTeamJobs(fetcher,checkedAt){
  const results=await Promise.allSettled([
    indexedTeams(fetcher,checkedAt),
    veloxisJobs(fetcher,checkedAt).then(jobs=>({jobs,partial:false})),
    nowcoderJobs(fetcher,checkedAt),
  ]);
  if(results.every(result=>result.status==="rejected"))throw new Error("中小与创业团队招聘源无法读取");
  const jobs=dedupe([...results.flatMap(result=>result.status==="fulfilled"?result.value.jobs:[]),...manualJobs()]);
  return {jobs,partial:results.some(result=>result.status==="rejected"||result.value.partial)};
}
