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

export function withReviewedDetails(job) {
  if (job.sourceUrl === "https://www.nowcoder.com/jobs/detail/463747" ||
      job.sourceUrl === "https://www.nowcoder.com/jobs/detail/463748") {
    return {...job,...nowcoderDetails};
  }
  return job;
}
