const nowcoderDetails = {
  description: "为交通和城市治理业务开发企业智能体，工作涵盖架构设计、核心模块开发和上线后的效果迭代。",
  techStack: ["Python", "大模型应用", "Agent Harness", "任务规划", "工具调用", "上下文记忆", "多轮交互"],
  responsibilities: [
    "设计核心智能体的架构，完成从开发到业务落地的工作。",
    "开发和维护任务规划、工具调用、记忆管理和工作流编排模块。",
    "改进智能体的推理表现和执行稳定性，排查交互及任务执行中的问题。",
    "评估大模型和智能体相关的新技术，迭代现有架构并整理开发规范。",
  ],
  requirements: [
    "本科及以上学历，计算机、人工智能或软件工程等相关专业优先。",
    "熟悉大模型应用开发原理，能熟练运用 Agent Harness 工程体系和相关工具。",
    "熟练使用 Python，熟悉任务规划、工具调用、上下文记忆和多轮交互，能独立搭建和迭代核心智能体。",
    "具备架构设计和故障排查能力，能够独立推进项目并与团队协作。",
  ],
  preferredQualifications: [
    "有在企业业务中交付智能体项目的经验。",
    "了解常用的开源智能体框架，有模型微调或提示词工程实践。",
  ],
  majorRequirement: "计算机、人工智能、软件工程等相关专业优先",
  categoryEvidence: "职责集中在企业智能体的端到端开发与业务落地，涉及 Harness、任务规划、工具接入和记忆管理，因此归入 AI 应用开发。",
  applicationStart: "2026-08-27",
  deadline: "2027-08-31",
  detailsCheckedAt: "2026-11-17",
};

const agentiDetails = {
  description:"参与 AgentI 智能体服务平台的产品迭代，从需求整理和竞品调研到原型、验收和上线复盘。",
  responsibilities:[
    "汇总用户需求、使用反馈和待改进问题，协助产品负责人安排迭代。",
    "体验类似的 AI 与智能体产品，记录功能差异、使用体验和行业变化。",
    "协助编写需求文档、制作基础原型，向设计和研发说明功能需求。",
    "跟进设计、开发和测试进度，参与功能验收、问题记录与上线复盘。",
  ],
  requirements:[
    "面向在读本科生或研究生，专业不限。",
    "有基础的文档写作能力，能拆解问题并清楚说明。",
    "对 AI、大模型和智能体产品感兴趣，愿意主动体验相关产品。",
    "入职前需签署实习协议，并配合核验在读学籍。",
  ],
  preferredQualifications:[
    "计算机、设计、商科背景优先。",
    "有产品、运营或项目实践，或使用过原型工具者优先。",
  ],
  majorRequirement:"专业不限，计算机、设计和商科相关专业优先",
  educationText:"本科或研究生在读",
  internship:"每周可到岗 4–6 天，连续实习 3 个月以上优先",
  recruitmentNotes:[
    "需在上海浦东线下实习。正文和平台地址栏列出的具体地点不同，面试前请确认办公地址。",
    "正文标注日薪 120–150 元，另有每日 20 元餐补和 10 元交通补贴。",
    "表现优秀者毕业后有优先转正机会。",
  ],
  categoryEvidence:"该岗位为智能体服务平台的产品助理，职责集中在需求、竞品、原型和验收，按业务方向归入 AI 应用。",
  detailsCheckedAt:"2026-11-17",
};

export function withReviewedDetails(job) {
  if (job.sourceUrl === "https://www.nowcoder.com/jobs/detail/463747" ||
      job.sourceUrl === "https://www.nowcoder.com/jobs/detail/463748") {
    return {...job,...nowcoderDetails};
  }
  if (job.sourceUrl === "https://www.shixiseng.com/intern/inn_4gf2sw159kpo") return {...job,...agentiDetails};
  return job;
}
