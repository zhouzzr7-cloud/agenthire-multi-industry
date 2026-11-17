import Link from "next/link";
export default function NotFound(){return <div className="container empty-state"><span className="eyebrow">404 / A DIFFERENT PATH</span><h1>这个机会还未出现。</h1><p>页面不存在，或岗位地址已变更。</p><Link className="button primary" href="/jobs">返回全部岗位 →</Link></div>;}
