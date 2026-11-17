import type {Job} from "./jobs";

type Entry = Pick<Job,"id"|"company"|"initials"|"title"|"city"|"primaryCategory"|"recruitmentType"|"majorRequirement"|"sourceUrl"|"deadline"> & Partial<Job>;
const steelSource = "https://www.career.zju.edu.cn/jyxt/sczp/zpztgl/ckZpgwXq.zf?zpxxbh=5C3125E5F10872ECE0653A68DD0E9B18";
const entries: Entry[] = [
  {
    id:"career-wuchan-finance-intern",company:"物产中大欧泰",initials:"物产",title:"财务实习生",city:"杭州",
    primaryCategory:"finance",recruitmentType:"日常实习",majorRequirement:"财务、会计等相关专业",
    internship:"每周至少 4 天，连续 3 个月以上",description:"协助银行账户资料、对账及会计档案整理。",
    sourceUrl:"https://www.shixiseng.com/intern/inn_3qi3hk1slf1k",deadline:"2027-01-17",
  },
  {
    id:"career-didi-media-intern",company:"滴滴",initials:"滴滴",title:"新媒体运营实习生（代驾事业部）",city:"杭州",
    primaryCategory:"operations",recruitmentType:"日常实习",majorRequirement:"汉语言、新闻、广告、新媒体、市场营销等专业优先",
    internship:"每周 5 天，实习 6 个月",description:"参与新媒体内容策划、产出与日常运营。",
    sourceUrl:"https://www.shixiseng.com/intern/inn_a8ju23sads9x",deadline:"2026-12-30",
  },
  {
    id:"career-jgsteel-process-2027",company:"长江精工钢结构（集团）股份有限公司",initials:"精工",title:"工艺工程师（2027 届）",
    city:"绍兴 / 宿迁 / 上海 / 六安",cities:["绍兴","宿迁","上海","六安"],primaryCategory:"manufacturing",recruitmentType:"校园招聘",
    graduationYear:2027,freshGraduate:true,companySize:"500 人以上",majorRequirement:"焊接工程、材料成型及控制工程、机械设计制造及其自动化、土木类",
    description:"集团校招公告中列出的工艺工程方向，岗位及地点以公告为准。",
    source:"浙江大学就业服务平台",sourceUrl:steelSource,deadline:"2027-06-01",publishedAt:"2026-09-28",
  },
  {
    id:"career-jgsteel-finance-2027",company:"长江精工钢结构（集团）股份有限公司",initials:"精工",title:"财务管理（2027 届）",
    city:"绍兴 / 上海 / 欧洲",cities:["绍兴","上海","欧洲"],primaryCategory:"finance",recruitmentType:"校园招聘",
    graduationYear:2027,freshGraduate:true,companySize:"500 人以上",majorRequirement:"会计学、财务管理",
    description:"集团校招公告中列出的财务管理方向，岗位及地点以公告为准。",
    source:"浙江大学就业服务平台",sourceUrl:steelSource,deadline:"2027-06-01",publishedAt:"2026-09-28",
  },
];

const dateInChina = new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"});

export function getCareerJobs(now = new Date()): Job[] {
  const today = dateInChina.format(now);
  const labels = {finance:"财会",operations:"运营",manufacturing:"制造"} as const;
  return entries.map(entry => {
    const closed = Boolean(entry.deadline && entry.deadline < today);
    const specialty = labels[entry.primaryCategory as keyof typeof labels];
    return {
      relatedCategories:[],salary:null,salaryMonthly:null,education:"bachelor",educationText:"本科可投",
      companySize:"规模未公开",graduationYear:null,techStack:[],responsibilities:[],
      requirements:entry.majorRequirement?[entry.majorRequirement]:[],freshGraduate:null,noExperience:false,remote:false,
      internship:null,publishedAt:null,updatedAt:"2026-11-17",sourceCheckedAt:"2026-11-17",lastVerifiedAt:null,
      source:"实习僧",specialty,categoryEvidence:"根据招聘公告的岗位名称及专业要求归类。",
      verificationNote:closed?"原公告公布的投递截止日期已过。":"来自公开招聘页面，当前名额与投递资格请在原页确认。",
      description:"完整岗位信息见招聘原页。",
      ...entry,status:closed?"closed":"unverified",applyUrl:closed?null:entry.sourceUrl,
    };
  });
}
