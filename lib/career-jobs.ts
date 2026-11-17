import type {Job} from "./jobs";

type Entry = Pick<Job,"id"|"company"|"initials"|"title"|"city"|"primaryCategory"|"recruitmentType"|"majorRequirement"|"sourceUrl"|"deadline"> & Partial<Job>;
const steelSource = "https://www.career.zju.edu.cn/jyxt/sczp/zpztgl/ckZpgwXq.zf?zpxxbh=5C3125E5F10872ECE0653A68DD0E9B18";
const steelCampusDetails = {
  educationText:"本科或硕士",
  detailsCheckedAt:"2026-11-17",
  recruitmentNoticeUrl:"https://chengjian.yangtzeu.edu.cn/info/1024/3735.htm",
  recruitmentNotes:[
    "国内院校面向 2027 届应届毕业生，以毕业证时间为准。",
    "海外及港澳台院校毕业时间以学位证为准，公告列出的时间范围为 2026 年 9 月 1 日至 2027 年 12 月 31 日。",
    "校招流程包括提交简历、筛选、面试、发放录用通知和签订三方协议。",
  ],
};
const entries: Entry[] = [
  {
    id:"career-wuchan-finance-intern",company:"物产中大欧泰",initials:"物产",title:"财务实习生",city:"杭州",
    primaryCategory:"finance",recruitmentType:"日常实习",majorRequirement:"财务、会计等相关专业",
    internship:"每周至少 4 天，连续 3 个月以上",description:"协助银行账户资料、对账及会计档案整理。",
    responsibilities:["协助整理银行账户资料。","协助对账和会计档案归档。"],
    sourceUrl:"https://www.shixiseng.com/intern/inn_3qi3hk1slf1k",deadline:"2027-01-17",
  },
  {
    id:"career-didi-media-intern",company:"滴滴",initials:"滴滴",title:"新媒体运营实习生（代驾事业部）",city:"杭州",
    primaryCategory:"operations",recruitmentType:"日常实习",majorRequirement:"汉语言、新闻、广告、新媒体、市场营销等专业优先",
    internship:"每周 5 天，实习 6 个月",description:"参与新媒体内容策划、产出与日常运营。",
    responsibilities:["参与新媒体选题与内容策划。","协助内容制作和账号日常运营。"],
    sourceUrl:"https://www.shixiseng.com/intern/inn_a8ju23sads9x",deadline:"2026-12-30",
  },
  {
    ...steelCampusDetails,
    id:"career-jgsteel-process-2027",company:"长江精工钢结构（集团）股份有限公司",initials:"精工",title:"工艺工程师（2027 届）",
    city:"绍兴 / 宿迁 / 上海 / 六安",cities:["绍兴","宿迁","上海","六安"],primaryCategory:"manufacturing",recruitmentType:"校园招聘",
    graduationYear:2027,freshGraduate:true,companySize:"500 人以上",majorRequirement:"焊接工程、材料成型及控制工程、机械设计制造及其自动化、土木类",
    description:"精工钢构 2027 届技术类校招岗位。公告列出的工艺工程方向面向焊接、材料成型、机械制造和土木相关专业，工作地点覆盖绍兴、宿迁、上海和六安。",
    categoryEvidence:"集团校招简章将工艺工程师列为技术类岗位，并列出焊接、材料成型及机械制造等相关专业，因此归入制造方向。",
    alternateApplyUrl:"https://hr.600496.com/index.php/home/campus/index.html?type_id=2",
    source:"浙江大学就业服务平台",sourceUrl:steelSource,deadline:"2027-06-01",publishedAt:"2026-09-28",
  },
  {
    ...steelCampusDetails,
    id:"career-jgsteel-finance-2027",company:"长江精工钢结构（集团）股份有限公司",initials:"精工",title:"财务管理（2027 届）",
    city:"绍兴 / 上海 / 欧洲",cities:["绍兴","上海","欧洲"],primaryCategory:"finance",recruitmentType:"校园招聘",
    graduationYear:2027,freshGraduate:true,companySize:"500 人以上",majorRequirement:"会计学、财务管理",
    description:"精工钢构 2027 届职能类校招岗位。财务管理方向面向会计和财务管理专业，公告列出的工作地点包括绍兴、上海和欧洲。",
    categoryEvidence:"集团校招简章将该岗位列为职能类，专业集中在会计与财务管理，因此归入财会方向。",
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
