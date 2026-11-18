import type {Metadata} from "next";
import {Shell} from "@/components/shell";
import "./globals.css";
import "./hire.css";
export const metadata: Metadata = {
  title: { default: "AgentHire · 多行业校招与实习", template: "%s · AgentHire" },
  description: "按城市、学历和岗位方向查找计算机与 AI、财会、运营、制造等方向的校招与实习机会。",
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN" data-scroll-behavior="smooth"><body><Shell>{children}</Shell></body></html>;}
