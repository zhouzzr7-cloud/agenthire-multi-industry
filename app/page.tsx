import Link from "next/link";
import {ArrowRight, ArrowUpRight, Calculator, Factory, Laptop, MapPin, Megaphone, Search} from "lucide-react";
import {LiveSummary} from "@/components/live-jobs";
import {AIJobSearchForm} from "@/components/ai-job-search";
import {categories, priorityCities} from "@/lib/jobs";

const directions = [
  {key:"technology", icon:Laptop, label:"计算机与 AI", examples:"应用开发、系统、基础设施"},
  {key:"finance", icon:Calculator, label:categories.finance.name, examples:categories.finance.tech},
  {key:"operations", icon:Megaphone, label:categories.operations.name, examples:categories.operations.tech},
  {key:"manufacturing", icon:Factory, label:categories.manufacturing.name, examples:categories.manufacturing.tech},
];

export default function Home(){
  return <div className="hire-home">
    <section className="hire-hero">
      <div className="container hire-hero-grid">
        <div className="hire-hero-content">
          <h1>找校招，<br/><em>也找实习</em></h1>
          <p className="hire-lead">探索计算机与 AI、财会、运营和制造岗位，查看招聘原文，找到适合投递的机会。</p>
          <form action="/jobs/" className="hire-search">
            <Search size={21} aria-hidden="true"/>
            <input name="q" aria-label="搜索职位、公司或技能" placeholder="试试财务实习、工艺工程师"/>
            <button type="submit">搜索岗位 <ArrowRight size={17} aria-hidden="true"/></button>
          </form>
          <AIJobSearchForm/>
          <div className="hire-quick" aria-label="按城市浏览">
            <MapPin size={15} aria-hidden="true"/>
            {priorityCities.map(city=><Link key={city} href={`/jobs/?city=${encodeURIComponent(city)}`}>{city}</Link>)}
          </div>
        </div>
        <section className="hire-directions" id="directions" aria-labelledby="direction-heading">
          <h2 id="direction-heading">按岗位方向浏览</h2>
          <div className="hire-direction-grid">
            {directions.map(({key,icon:Icon,label,examples})=><Link href={`/jobs/?category=${key}`} key={key} className="hire-direction">
              <span className={`direction-icon direction-${key}`}><Icon size={21} aria-hidden="true"/></span>
              <span><strong>{label}</strong><small>{examples}</small></span>
              <ArrowUpRight className="direction-arrow" size={17} aria-hidden="true"/>
            </Link>)}
          </div>
        </section>
      </div>
    </section>
    <div className="container">
      <LiveSummary home/>
      <section className="hire-next" aria-labelledby="quick-filters">
        <h2 id="quick-filters">常用筛选</h2>
        <div>
          <Link href="/jobs/?track=internship">找实习 <ArrowUpRight size={16} aria-hidden="true"/></Link>
          <Link href="/jobs/?track=campus">看校招 <ArrowUpRight size={16} aria-hidden="true"/></Link>
          <Link href="/jobs/?bachelor=1">本科可投 <ArrowUpRight size={16} aria-hidden="true"/></Link>
          <Link href="/jobs/?team=1">中小与创业团队 <ArrowUpRight size={16} aria-hidden="true"/></Link>
        </div>
      </section>
    </div>
  </div>;
}
