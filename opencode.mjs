import { createRequire } from "node:module";
import { readFile, readdir } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { tool } from "@opencode-ai/plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const require = createRequire(import.meta.url);

const { CANONICAL_SKILLS, resolveSkillId } = require("./skills/catalog.js");
const { getSkillContent } = require("./skills/loader.js");
const { domainSkills, rankAgentsForRequest } = require("./lib/agent-domains.js");
const { version: PLUGIN_VERSION } = require("./package.json");
const yaml = require("js-yaml");

// ========================
//  Agent 加载
// ========================

let _agentCache = null;
let _agentCacheVersion = null;

/**
 * 解析 agent 文件的 YAML frontmatter 和正文
 */
function parseAgentFile(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;
  try {
    const frontmatter = yaml.load(match[1]);
    const body = match[2].trim();
    return { frontmatter, body };
  } catch {
    return null;
  }
}

/**
 * 加载全部 agents，结果按插件版本缓存（版本变化即失效）。
 * 技能集从领域注册表派生，不读取 frontmatter 中的技能清单。
 */
async function loadAgents() {
  if (_agentCache && _agentCacheVersion === PLUGIN_VERSION) return _agentCache;
  const agentsDir = join(__dirname, "agents");
  const entries = await readdir(agentsDir, { withFileTypes: true });
  const agents = [];

  for (const entry of entries) {
    if (!entry.isFile() || extname(entry.name) !== ".md") continue;
    const content = await readFile(join(agentsDir, entry.name), "utf-8");
    const parsed = parseAgentFile(content);
    if (!parsed) continue;

    const id = parsed.frontmatter.name || basename(entry.name, ".md");
    const domain = parsed.frontmatter.domain || null;
    agents.push({
      id,
      description: parsed.frontmatter.description || "",
      domain,
      scope: parsed.frontmatter.scope || "",
      model: parsed.frontmatter.model || null,
      effort: parsed.frontmatter.effort || null,
      maxTurns: parsed.frontmatter.maxTurns || null,
      skills: domain ? domainSkills(domain) : [],
      systemPrompt: parsed.body,
      file: entry.name,
      layer: "agent",
    });
  }

  _agentCache = agents;
  _agentCacheVersion = PLUGIN_VERSION;
  return agents;
}

/**
 * Agent tool 名称
 */
function toolNameForAgent(agentId) {
  return `mcu_agent_${agentId.replace(/-/g, "_")}`;
}

// ========================
//  Skill 函数
// ========================

async function readSkillContent(skillId) {
  const resolved = resolveSkillId(skillId);
  if (!resolved) return null;
  return getSkillContent(resolved);
}

function toolNameForSkill(skillId) {
  return `mcu_workbench_${skillId.replace(/-/g, "_")}`;
}

function buildRequirementsIntake(request, projectRoot, agents) {
  const ranked = rankAgentsForRequest(request, agents);
  const analysisAgents = ["embedded-lead"];
  for (const { agent, score } of ranked) {
    if (score > 0 && !analysisAgents.includes(agent.id)) analysisAgents.push(agent.id);
  }
  if (analysisAgents.length === 1 && !analysisAgents.includes("system-architect")) {
    analysisAgents.push("system-architect");
  }

  const questions = [
    "项目绝对路径、当前分支/提交和目标交付物是什么？",
    "目标 MCU/板卡、引脚/总线/供电资源和可用测量条件是什么？",
    "OS/FreeRTOS、编译器、SDK/HAL、构建、烧录和观测工具版本是什么？",
    "涉及哪些任务、优先级、栈、周期、队列/消息、同步原语和 ISR 约束？",
    "必须遵守哪些分层边界、功能/非功能约束、优先级和依赖关系？",
    "验收需要哪些静态、主机、构建、目标运行、日志或实物证据？",
  ];

  const fields = [
    "项目背景", "硬件资源", "软件环境", "FreeRTOS 任务与队列约束",
    "分层架构约束", "功能需求", "非功能约束", "优先级", "依赖关系",
    "验收标准", "人工确认问题",
  ];

  return {
    request,
    entrySkill: "workflow-requirements-router",
    status: "analysis-required",
    projectRoot,
    agentPlan: {
      coordinator: "embedded-lead",
      analysts: analysisAgents,
      parallel: analysisAgents.length > 2,
      rule: "各 Agent 只分析自身领域，embedded-lead 汇总证据、冲突和阻塞",
    },
    requiredContext: fields.map((name) => ({ name, status: "unverified", value: null, evidence: [] })),
    questions,
    nextSkill: null,
    requirementsConstraintPackagePrompt: [
      "请基于以下用户需求和证据生成 Requirement Constraint Package（RCP）。",
      "所有字段必须标记 confirmed、user-confirmed、inferred 或 unverified，并附证据位置。",
      `用户需求：${request}`,
      `项目路径：${projectRoot || "待用户提供"}`,
      `必须覆盖：${fields.join("、")}`,
      "RCP 完成前不得生成实现代码；完成后将 RCP 固定交接给 workflow-project-integration，由其完成分层/审计/迁移设计后分发实现层 Skill。",
    ].join("\n"),
  };
}

async function discoverProjectEvidence(projectRoot) {
  if (!projectRoot) return { status: "not-provided", entries: [] };
  try {
    const entries = await readdir(projectRoot, { withFileTypes: true });
    return {
      status: "top-level-discovered",
      entries: entries.map((entry) => ({ name: entry.name, type: entry.isDirectory() ? "directory" : "file" })),
      note: "仅列出项目根目录候选证据，未将文件名当作已确认约束；下游需读取并记录证据位置。",
    };
  } catch (error) {
    return { status: "unavailable", entries: [], error: error.message };
  }
}

// ========================
//  插件入口
// ========================

export default async (_ctx) => {
  const tools = {};
  const agents = await loadAgents();

  // ---- 首阶段需求约束路由（旧 route 名称保留兼容） ----
  const requirementsRouterTool = tool({
    description: "插件首阶段需求约束入口：分配一个或多个 Agent，补齐项目背景并生成下游 Skill 的需求约束包",
    args: {
      request: tool.schema.string().describe("用户的嵌入式需求描述"),
      projectRoot: tool.schema.string().optional().describe("可选的项目绝对路径；未提供时返回待用户确认问题"),
    },
    async execute(args) {
      const intake = buildRequirementsIntake(args.request, args.projectRoot || null, agents);
      intake.projectEvidence = await discoverProjectEvidence(args.projectRoot || null);
      return intake;
    },
  });
  tools.mcu_workbench_requirements_router = requirementsRouterTool;
  tools.mcu_workbench_route = requirementsRouterTool;

  // ---- Skill tools ----
  for (const skill of CANONICAL_SKILLS) {
    const toolName = toolNameForSkill(skill.id);
    tools[toolName] = tool({
      description: skill.description,
      args: {
        question: tool.schema.string().optional().describe("针对该 skill 的具体问题"),
      },
      async execute(args) {
        const content = await readSkillContent(skill.id);
        if (!content) {
          return {
            error: `Skill ${skill.id} 内容未找到`,
            id: skill.id,
          };
        }
        return {
          id: skill.id,
          description: skill.description,
          layer: skill.layer,
          question: args.question || null,
          content: content.slice(0, 4000),
          note: "以上是 SKILL.md 前 4000 字符，完整内容可在插件 skills 目录中查看。",
        };
      },
    });
  }

  // ---- Agent 团队信息（供 LLM 了解可用 agent）----
  tools.mcu_workbench_agent_team = tool({
    description:
      `列出全部 ${agents.length} 个 MCU-Workbench agent 及其角色、领域和写入范围。当需要嵌入式开发协助时，先调用此 tool 了解团队。`,
    args: {},
    async execute() {
      return {
        team: agents.map((a) => ({
          id: a.id,
          domain: a.domain,
          tool: toolNameForAgent(a.id),
          command: `/mcu-${a.id}`,
          description: a.description,
          skills: a.skills,
          scope: a.scope,
        })),
        workflow:
          "embedded-lead → system-architect → firmware-engineer → verification-engineer\n" +
          "                      ↓\n" +
          "              hardware-integration / toolchain-engineer\n" +
          "                      ↓\n" +
          "                knowledge-engineer",
        handoff:
          "每次交接需包含: Summary, Evidence, Changed files, Tests, Artifacts, Blockers, Next handoff",
      };
    },
  });

  // ---- Agent 路由 ----
  tools.mcu_workbench_agent_route = tool({
    description:
      "根据嵌入式开发请求推荐最合适的 agent，返回推荐 agent 的完整工作指令。支持中英文输入。",
    args: {
      request: tool.schema.string().describe("用户的嵌入式开发请求描述（中文或英文）"),
    },
    async execute(args) {
      const ranked = rankAgentsForRequest(args.request, agents);
      const best = ranked.length && ranked[0].score > 0 ? ranked[0].agent : null;

      return {
        request: args.request,
        recommended: best
          ? {
              id: best.id,
              domain: best.domain,
              tool: toolNameForAgent(best.id),
              command: `/mcu-${best.id}`,
              description: best.description,
            }
          : null,
        allAgents: agents.map((a) => ({
          id: a.id,
          domain: a.domain,
          tool: toolNameForAgent(a.id),
          command: `/mcu-${a.id}`,
          description: a.description,
          skills: a.skills,
        })),
        instruction: best
          ? `调用 ${toolNameForAgent(best.id)} 工具，传入任务参数获取该 agent 的完整工作指令，然后按照指令完成用户任务。也可让用户使用命令 /mcu-${best.id} 直接启动该 agent。`
          : "请从 allAgents 中选择并调用对应 tool，或使用 /mcu-<agent-id> 命令。",
      };
    },
  });

  // ---- Agent tools（每个 agent 一个 tool，调用后获取完整角色指令）----
  for (const agent of agents) {
    const agentToolName = toolNameForAgent(agent.id);

    tools[agentToolName] = tool({
      description: `MCU-Workbench Agent「${agent.id}」（领域 ${agent.domain}）：${agent.description}。写入范围：${agent.scope}。调用此 tool 获取该角色的完整工作指令。`,
      args: {
        task: tool.schema.string().optional().describe(`委托给 ${agent.id} 的具体任务`),
      },
      async execute(args) {
        return {
          role: agent.id,
          domain: agent.domain,
          command: `/mcu-${agent.id}`,
          description: agent.description,
          skills: agent.skills,
          maxTurns: agent.maxTurns,
          scope: agent.scope,
          task: args.task || null,
          instruction: `\n# 角色: ${agent.id}\n\n${agent.systemPrompt}\n\n## 当前任务\n${args.task || "请按角色指令自主开展工作。"}`,
          handoff: {
            summary: "完成的工作摘要",
            evidence: "文件路径、命令输出、测量数据",
            changedFiles: "修改的文件列表",
            tests: "测试结果",
            artifacts: "输出产物路径",
            blockers: "阻塞项",
            nextHandoff: "下一个交接目标",
          },
          usage:
            "收到上述角色指令后，请立即切换到该角色完成用户任务。完成后按 handoff 格式总结成果。",
        };
      },
    });
  }

  return { tool: tools };
};
