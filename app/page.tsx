import Link from "next/link";
import {ArrowRight, ArrowUpRight, Box, Code2, Layers3, MapPin, Search} from "lucide-react";
import {LiveSummary} from "@/components/live-jobs";
import {AIJobSearchForm} from "@/components/ai-job-search";

const directions = [
  {href:"agent-application", icon:Code2, label:"Agent 应用", title:"把 Agent 做成产品", tags:"RAG · MCP · 多智能体"},
  {href:"agent-infra", icon:Layers3, label:"Agent 基础设施", title:"让 Agent 稳定运行", tags:"Harness · Runtime · 沙箱"},
  {href:"ai-infra", icon:Box, label:"AI 基础设施", title:"为模型提供运行底座", tags:"推理服务 · GPU · 云原生"},
];

export default function Home(){
  return <div className="hire-home">
    <section className="hire-hero">
      <div className="container hire-hero-grid">
        <div className="hire-hero-content">
          <p className="hire-kicker"><span/> AGENT ENGINEERING JOB BOARD</p>
          <h1>下一站，<br/><em>做 Agent<span>.</span></em></h1>
          <p className="hire-lead">从应用开发到运行时，发现值得投递的岗位。<br className="desktop-only"/> 优先覆盖上海、杭州、绍兴的实习、校招和中小团队。</p>
          <form action="/jobs/" className="hire-search">
            <Search size={21} aria-hidden="true"/>
            <input name="q" aria-label="搜索职位、公司或技术" placeholder="试试 Agent 实习、Harness、商米"/>
            <button type="submit">搜索岗位 <ArrowRight size={17}/></button>
          </form>
          <AIJobSearchForm/>
          <div className="hire-quick"><MapPin size={15}/>{["上海","杭州","绍兴"].map(city=><Link key={city} href={`/jobs/?city=${encodeURIComponent(city)}`}>{city}</Link>)}<Link href="/jobs/?bachelor=1">本科可投 <ArrowUpRight size={13}/></Link><Link href="/jobs/?team=1">中小与创业团队 <ArrowUpRight size={13}/></Link></div>
        </div>
        <div className="hire-visual" aria-hidden="true">
          <div className="visual-label"><span><i/> AGENT / STACK</span><span>FIG. 01</span></div>
          <div className="visual-grid">
            <div className="stack-orbit orbit-one"/><div className="stack-orbit orbit-two"/>
            <div className="stack-chip chip-runtime"><Layers3/><span>RUNTIME<small>02 / EXECUTION</small></span></div>
            <div className="stack-chip chip-app"><Code2/><span>APPLICATION<small>01 / PRODUCT</small></span><ArrowUpRight className="chip-arrow"/></div>
            <div className="stack-chip chip-infra"><Box/><span>INFRA<small>03 / COMPUTE</small></span></div>
          </div>
          <div className="visual-label visual-bottom"><span>BUILD YOUR FUTURE</span><ArrowUpRight size={17}/></div>
        </div>
      </div>
    </section>
    <div className="container">
      <LiveSummary home/>
      <section className="hire-directions">
        <div className="hire-section-heading"><div><p className="hire-overline">EXPLORE THE STACK</p><h2>按方向找机会</h2></div><Link href="/jobs/">浏览全部岗位 <ArrowUpRight size={17}/></Link></div>
        <div className="hire-direction-grid">{directions.map(({href,icon:Icon,label,title,tags},i)=><Link href={`/jobs/?category=${href}`} key={href} className="hire-direction"><div><Icon size={24}/><span>0{i+1}</span></div><small>{label}</small><h3>{title}</h3><p>{tags}</p><ArrowUpRight className="direction-arrow" size={19}/></Link>)}</div>
      </section>
      <section className="hire-next">
        <div><p className="hire-overline">EARLY CAREERS</p><h2>找第一份 Agent 岗位</h2><p>从实习、校招和本科可投的机会开始筛选。</p></div>
        <div><Link href="/jobs/?track=internship">找实习 <ArrowUpRight size={18}/></Link><Link href="/jobs/?track=campus">看校招 <ArrowUpRight size={18}/></Link><Link href="/jobs/?bachelor=1">本科可投 <ArrowUpRight size={18}/></Link></div>
      </section>
    </div>
  </div>;
}
