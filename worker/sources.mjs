
const indexOrigin = "https://jobs.ultraai.site";
const baiduOrigin = "https://talent.baidu.com";
const cityFocus = ["上海","杭州","绍兴"];
const officialHosts = new Set([
  "jobs.bytedance.com","talent.antgroup.com","campus-talent.alibaba.com","careers.aliyun.com",
  "talent.taotian.com","talent.dingtalk.com","talent.quark.cn","talent-holding.alibaba.com",
  "careers-tongyi.alibaba.com","talent.ele.me","hr.163.com","job.ctrip.com",
  "jobs.bilibili.com","careers.tencent.com","jobs.meituan.com","talent.baidu.com",
  "jobs.kuaishou.cn","jobs.xiaohongshu.com",
]);
const technology = [
  ["Agent Harness",/harness/i],["Runtime",/runtime|运行时/i],["沙箱",/sandbox|沙箱/i],
  ["评测",/eval|评测|评估/i],["MCP",/\bMCP\b/i],["RAG",/\bRAG\b|检索增强/i],
  ["多智能体",/多智能体|multi.agent|多\s*agent/i],["工具调用",/工具调用|tool call/i],
  ["上下文",/上下文|context/i],["Coding Agent",/coding agent|代码智能体/i],
  ["Python",/\bPython\b/i],["TypeScript",/\bTypeScript\b/i],["Go",/\bGo(?:lang)?\b/i],
  ["推理服务",/serving|推理服务/i],["Kubernetes",/kubernetes|\bk8s\b/i],["GPU",/\bGPU\b/i],
];
const infra = /harness|runtime|沙箱|sandbox|运行时|agent infra|智能体基础设施|(?:agent|智能体).{0,7}平台|工具执行引擎|智能体框架/i;
const modelInfra = /推理加速|推理服务|推理部署|算力基础设施|GPU 调度|LLM Serving|\bAI\s*Infra(?:structure)?\b/i;
const coreTitle = /agent|智能体|harness|运行时|大模型应用|AI 基础设施|AI Infra/i;
const nonEngineering = /运营|商业化经理|GTM|增长产品|市场专员|实习生.{0,3}运营/i;
const titleNoise = /^(?:岗位详情|职位详情|招聘官网|加入字节跳动)$/i;
const entityMap = {"amp":"&","lt":"<","gt":">","quot":'"',"apos":"'","nbsp":" "};

export function clean(html){
  return html.replace(/<[^>]*>/g," ").replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi,(entity,key)=>{
    if (key[0]!=="#") return entityMap[key]??entity;
    const code=key[1]==="x"?parseInt(key.slice(2),16):Number(key.slice(1));
    return code>=0&&code<=0x10ffff?String.fromCodePoint(code):entity;
  }).replace(/\s+/g," ").trim();
}

export function parseCities(place){
  return [...new Set(place.split(/[、，,／/]/).map(city=>city.trim().replace(/市$/,"")).filter(Boolean))];
}

function eligibility(text){
  const degree=text.match(/本科及以上|本科或研究生|本科(?:学历|在读)|硕士及以上|硕士(?:学历|在读)|硕博在读|博士在读|学历不限/);
  if(!degree) return "unknown";
  if(degree[0].startsWith("本科"))return "bachelor";
  if(degree[0]==="学历不限")return "any";
  // "硕士在读优先" is a preference; it does not establish a minimum.
  if(/硕士(?:在读|学历)?(?:优先|者优先)/.test(text))return "unknown";
  return "master";
}

export function makeJob({id, company, title, cities, type, source, sourceUrl, status, duties="", requirements="", publishedAt=null, graduationYear=null, checkedAt, applyUrl=null, indexedAt=null}){
  const text = [title,duties,requirements].join(" ");
  const tags = technology.filter(([,pattern])=>pattern.test(text)).map(([label])=>label);
  const isAgentInfra = infra.test(title)||/开发.{0,15}(?:运行时|沙箱|执行引擎|Agent Harness)|构建.{0,18}(?:Agent Harness|调度框架|沙箱执行)/i.test(duties);
  const category = isAgentInfra?"agent-infra":modelInfra.test(title)?"ai-infra":"agent-application";
  const specialty = isAgentInfra?"Runtime / Harness":category==="ai-infra"?"模型服务":/coding agent|代码智能体/i.test(title)?"Coding Agent":"Agent 开发";
  return {
    id:"live-"+id,live:true,company,initials:company.slice(0,2),title,city:cities.join(" / "),cities,
    primaryCategory:category,relatedCategories:[],specialty,salary:null,salaryMonthly:null,
    education:eligibility(requirements),companySize:"规模未公开",recruitmentType:type,
    graduationYear,techStack:tags.slice(0,8),
    description:company+"在"+cities.join("、")+"发布的"+type+"岗位。岗位职责和具体资格可在招聘原页查看。",
    responsibilities:tags.length?["原文涉及 "+tags.slice(0,6).join("、")+"。"]:[ ],
    requirements:[],
    categoryEvidence:"按职位标题和公开职责中的工程关键词归类。",
    freshGraduate:type==="校园招聘"?true:null,noExperience:false,remote:cities.includes("远程"),
    internship:null,publishedAt,updatedAt:indexedAt??checkedAt,sourceCheckedAt:checkedAt,lastVerifiedAt:status==="verified"?checkedAt:null,
    source,sourceUrl,applyUrl,status,
    verificationNote:status==="verified"?"已在官方招聘列表中核对职位。实际投递资格与名额以官网为准。":"已从招聘索引找到对应职位的官网入口。请在官网确认当前状态及资格。",
  };
}

export async function getHtml(fetcher,url){
  const response = await fetcher(url,{signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error("HTTP "+response.status);
  return response.text();
}

function baiduRows(html,track){
  const match = html.match(/__INITIAL_DATA__\s*=\s*({[\s\S]*?});\s*window\.prefix/);
  if(!match)throw new Error("百度招聘列表格式变更");
  const {listData} = JSON.parse(match[1].replace(/(:\s*)undefined(?=[,}])/g,"$1null"));
  if(listData?.recruitType!==track||!Array.isArray(listData.listDetailData))throw new Error("百度招聘分类不匹配");
  return listData.listDetailData;
}

export async function getBaiduJobs(fetcher,checkedAt){
  const searches = ["Agent","智能体","Harness","大模型应用","Agent Infra","Coding Agent"];
  const feeds = ["GRADUATE","INTERN"].flatMap(track=>searches.map(query=>({track,query})));
  const answers = [];
  for(let i=0;i<feeds.length;i+=4){
    answers.push(...await Promise.allSettled(feeds.slice(i,i+4).map(async({track,query})=>{
    const params=new URLSearchParams({recruitType:track,search:query});
    const html=await getHtml(fetcher,baiduOrigin+"/jobs/list?"+params);
    return baiduRows(html,track).flatMap(post=>{
      const title=post.name??"";
      const cities=parseCities(post.workPlace??"");
      if(!/^[a-f0-9-]{36}$/.test(post.postId)||!cities.length||!coreTitle.test(title)||nonEngineering.test(title)||post.postType!=="技术")return [];
      const url=baiduOrigin+"/jobs/detail/"+track+"/"+post.postId;
      const year=title.match(/20\d{2}(?=\s*届)/)?.[0];
      return [makeJob({
        id:"baidu-"+post.postId,company:"百度",title,cities,
        type:track==="GRADUATE"?"校园招聘":"日常实习",
        source:"百度官方招聘",sourceUrl:url,applyUrl:url,status:"verified",
        duties:post.workContent,requirements:post.serviceCondition,publishedAt:post.publishDate||null,
        graduationYear:year?Number(year):null,checkedAt,
      })];
    });
    })));
  }
  const jobs = dedupe(answers.flatMap(answer=>answer.status==="fulfilled"?answer.value:[]));
  if(!jobs.length)throw new Error("百度招聘未返回有效技术岗位");
  return {jobs,partial:answers.some(answer=>answer.status==="rejected")};
}

function catalogRows(html){
  const rows=[];
  const cards=html.matchAll(/<a href="(\/jobs\/[a-z0-9_]+\/[^"/?#]+)">\s*<div class="theme-job__main">([\s\S]*?)<\/a>/g);
  for(const [,path,card] of cards){
    const title=clean(card.match(/<strong[^>]*>([\s\S]*?)<\/strong>/)?.[1]??"");
    const meta=clean(card.match(/<span class="theme-job__meta">([\s\S]*?)<\/span>/)?.[1]??"");
    const [company,place]=meta.split(" · ");
    const cities=parseCities(place??"");
    const track=clean(card.match(/theme-job__aside">\s*<span>([^<]*)<\/span>/)?.[1]??"");
    const indexedAt=card.match(/<time datetime="(\d{4}-\d{2}-\d{2})"/)?.[1]??null;
    if(company&&cities.length&&coreTitle.test(title)&&!nonEngineering.test(title)&&!titleNoise.test(title)){
      rows.push({path,title,company,cities,track,indexedAt});
    }
  }
  return rows;
}

function officialLink(html){
  const value=html.match(/<a class="(?:mobile-hero-apply|primary-action)" href="([^"]+)"/)?.[1];
  if(!value)return null;
  const url=new URL(value.replaceAll("&amp;","&"));
  if(url.protocol!=="https:"||!officialHosts.has(url.hostname)||url.username||url.password)return null;
  if(url.pathname==="/"&&!url.hash)return null;
  return url.href;
}

function sectionText(html,id){
  const marker='id="'+id+'"';
  const index=html.indexOf(marker);
  if(index===-1)return "";
  return clean(html.slice(index,html.indexOf("</section>",index)).replace(/^.*?<\/h2>/s,""));
}

export async function getIndexJobs(fetcher,checkedAt){
  const pages=await Promise.allSettled(Array.from({length:6},(_,index)=>getHtml(fetcher,indexOrigin+"/topics/agent?page="+(index+1)).then(catalogRows)));
  const entries=Array.from(new Map(pages.flatMap(result=>result.status==="fulfilled"?result.value:[]).map(row=>[row.path,row])).values());
  const weight = row => (row.cities.some(city=>cityFocus.includes(city))?4:0) + (row.track!=="社招"?2:0);
  const selected=entries.filter(row=>!row.path.startsWith("/jobs/baidu")).sort((a,b)=>weight(b)-weight(a)).slice(0,27);
  const results=[];
  for(let i=0;i<selected.length;i+=7){
    results.push(...await Promise.allSettled(selected.slice(i,i+7).map(async row=>{
      const html=await getHtml(fetcher,indexOrigin+row.path);
      if(/当前岗位已下线|该岗位已下线|该岗位已关闭/.test(clean(html.slice(0,11000))))return null;
      const url=officialLink(html);
      if(!url)return null;
      const year=row.title.match(/20\d{2}(?=\s*届)/)?.[0];
      const type=row.track==="校招"?"校园招聘":row.track==="实习"||row.title.includes("实习生")?"日常实习":"社会招聘";
      return makeJob({
        ...row,id:row.path.slice(6).replaceAll("/","-").replace(/%3A|:/g,"-"),type,
        source:"招聘索引 · 官网入口",sourceUrl:url,status:"unverified",checkedAt,
        duties:sectionText(html,"job-responsibilities-heading"),requirements:sectionText(html,"job-requirements-heading"),
        graduationYear:year?Number(year):null,
      });
    })));
  }
  const jobs=dedupe(results.flatMap(result=>result.status==="fulfilled"&&result.value?[result.value]:[]));
  if(jobs.length<5)throw new Error("招聘索引未返回足够的职位链接");
  return {jobs,partial:pages.some(result=>result.status==="rejected")||results.filter(result=>result.status==="rejected").length>2};
}

export function dedupe(jobs){
  const seen=new Set();
  return jobs.filter(job=>{
    const key=job.sourceUrl;
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  });
}

