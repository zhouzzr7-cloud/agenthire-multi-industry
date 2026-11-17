import type {Metadata} from "next";
import {Shell} from "@/components/shell";
import "./globals.css";
import "./hire.css";
export const metadata:Metadata={title:{default:"AgentHire — Build Agents. Build Your Future.",template:"%s · AgentHire"},description:"专注 Agent 应用开发、智能体运行时与 AI 基础设施的技术招聘平台。为本科生、应届生和初级工程师发现下一步。"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body><Shell>{children}</Shell></body></html>;}
