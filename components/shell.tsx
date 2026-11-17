"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {createContext,useContext,useEffect,useState,useRef, type ReactNode} from "react";
import {ArrowUpRight, ArrowRight, Bookmark, Menu, X, Check} from "lucide-react";
import gsap from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useGSAP} from "@gsap/react";
import Lenis from "lenis";
gsap.registerPlugin(ScrollTrigger,useGSAP);
const FavoritesContext=createContext({ids:[] as string[],ready:false,toggle:(_id:string)=>{},error:""});
export function useFavorites(){return useContext(FavoritesContext);}
export function Logo(){return <span className="brand"><span className="brand-symbol" aria-hidden="true">a<span>↗</span></span>AgentHire<span className="brand-dot">®</span></span>;}
export function Shell({children}:{children:ReactNode}){
  const path=usePathname(); const [ids,setIds]=useState<string[]>([]); const [ready,setReady]=useState(false); const [menu,setMenu]=useState(false);const [error,setError]=useState("");
  useEffect(()=>{try{const v=JSON.parse(localStorage.getItem("agenthire:favorites")??"[]");setIds(Array.isArray(v)?v.filter(x=>typeof x==="string"):[]);}catch{setError("浏览器未允许读取收藏，本次收藏可能无法保留。");}setReady(true);},[]);
  useEffect(()=>{setMenu(false);window.scrollTo(0,0);},[path]);
  useEffect(()=>{const listener=(e:StorageEvent)=>{if(e.key==="agenthire:favorites"){try{const v=JSON.parse(e.newValue??"[]");if(Array.isArray(v))setIds(v.filter(x=>typeof x==="string"));}catch{}}};window.addEventListener("storage",listener);return()=>window.removeEventListener("storage",listener);},[]);
  function toggle(id:string){setIds(old=>{const next=old.includes(id)?old.filter(x=>x!==id):[...old,id];try{localStorage.setItem("agenthire:favorites",JSON.stringify(next));}catch{setError("收藏仅在当前页面有效：浏览器存储不可用。");}return next;});}
  return <FavoritesContext.Provider value={{ids,ready,toggle,error}}><a className="skip-link" href="#main">跳到主要内容</a><header className="header"><div className="nav-wrap"><Link href="/" aria-label="AgentHire 首页"><Logo/></Link><nav className={menu?"nav open":"nav"} aria-label="主要导航"><Link className={path.startsWith("/jobs")?"active":""} href="/jobs">探索岗位</Link><Link className={path==="/agent-infra"?"active":""} href="/agent-infra">技术方向</Link><Link className={path==="/favorites"?"active":""} href="/favorites">收藏 {ids.length>0&&<span className="nav-count">{ids.length}</span>}</Link><Link className={path==="/about"?"active":""} href="/about">数据说明</Link></nav><Link className="nav-cta" href="/jobs">查看岗位 <ArrowUpRight size={15}/></Link><button className="mobile-toggle icon-button" aria-label={menu?"关闭导航":"打开导航"} aria-expanded={menu} onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button></div></header>{error&&<div className="storage-error" role="status">{error}</div>}<main id="main">{children}</main><footer><div className="footer-top"><Link href="/"><Logo/></Link><p>面向 Agent 工程师的招聘索引<br/><span>应用 · 运行时 · 基础设施</span></p><Link href="/jobs">浏览招聘 <ArrowUpRight size={18}/></Link></div><div className="footer-bottom"><span>© {new Date().getFullYear()} AgentHire</span><span>Shanghai · Hangzhou · Shaoxing · Everywhere</span><Link href="/about">数据来源与说明 <ArrowUpRight size={12}/></Link></div></footer></FavoritesContext.Provider>;
}
export function SaveButton({id,full=false}:{id:string;full?:boolean}){const{ids,toggle,ready}=useFavorites();const saved=ids.includes(id);return <button disabled={!ready} type="button" className={full?"button secondary":"icon-button save-button"} aria-label={saved?"取消收藏":"收藏岗位"} aria-pressed={saved} onClick={()=>toggle(id)}>{saved?<Bookmark size={17} fill="currentColor"/>:<Bookmark size={17}/>} {full&&(saved?"已收藏":"收藏岗位")}</button>;}
export function CopyButton(){const[done,setDone]=useState(false);const[error,setError]=useState(false);return <button className="button secondary" onClick={async()=>{try{await navigator.clipboard.writeText(location.href);setDone(true);setTimeout(()=>setDone(false),2000);}catch{setError(true);}}}>{done?<Check size={16}/>:<ArrowUpRight size={16}/>} {done?"已复制":error?"请复制地址栏链接":"复制链接"}</button>;}
export function HomeMotion({children}:{children:ReactNode}){const root=useRef<HTMLDivElement>(null);
  useGSAP(()=>{if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;const lenis=new Lenis({duration:.9,anchors:true});lenis.on("scroll",ScrollTrigger.update);const tick=(time:number)=>lenis.raf(time*1000);gsap.ticker.add(tick);
    gsap.from(".hero-line span",{y:65,opacity:0,duration:.85,stagger:.12,ease:"power3.out"});
    gsap.from(".hero-reveal",{y:15,opacity:0,duration:.65,stagger:.08,delay:.25,ease:"power2.out"});
    gsap.utils.toArray<HTMLElement>(".section-reveal").forEach(el=>gsap.from(el,{y:24,opacity:0,duration:.7,scrollTrigger:{trigger:el,start:"top 92%",once:true}}));
    return()=>{gsap.ticker.remove(tick);lenis.destroy();};
  },{scope:root});return <div ref={root}>{children}</div>;
}
export function ArrowLink({href,children,primary=false}:{href:string;children:ReactNode;primary?:boolean}){return <Link className={primary?"button primary":"text-link"} href={href}>{children}<ArrowRight size={17}/></Link>;}
