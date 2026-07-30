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
const yaml = require("js-yaml");

// ========================
//  Agent 加载
// ========================

let _agentCache = null;

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
 * 加载全部 agents，结果被缓存
 */
async function loadAgents() {
  if (_agentCache) return _agentCache;
  const agentsDir = join(__dirname, "agents");
  const entries = await readdir(agentsDir, { withFileTypes: true });
  const agents = [];

  for (const entry of entries) {
    if (!entry.isFile() || extname(entry.name) !== ".md") continue;
    const content = await readFile(join(agentsDir, entry.name), "utf-8");
    const parsed = parseAgentFile(content);
    if (!parsed) continue;

    agents.push({
      id: parsed.frontmatter.name || basename(entry.name, ".md"),
      description: parsed.frontmatter.description || "",
      model: parsed.frontmatter.model || null,
      effort: parsed.frontmatter.effort || null,
      maxTurns: parsed.frontmatter.maxTurns || null,
      skills: parsed.frontmatter.skills || [],
      systemPrompt: parsed.body,
      file: entry.name,
      layer: "agent",
    });
  }

  _agentCache = agents;
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

function recommendSkill(request) {
  const lowerRequest = request.toLowerCase();
  const words = lowerRequest
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .map((w) => w.replace(/[^a-z0-9-]/g, ""));

  for (const skill of CANONICAL_SKILLS) {
    const desc = (skill.description || "").toLowerCase();
    if (words.some((w) => desc.includes(w))) {
      return { id: skill.id, description: skill.description, layer: skill.layer };
    }
  }

  for (const skill of CANONICAL_SKILLS) {
    const id = skill.id.toLowerCase();
    if (words.some((w) => id.includes(w))) {
      return { id: skill.id, description: skill.description, layer: skill.layer };
    }
  }

  return null;
}

async function readSkillContent(skillId) {
  const resolved = resolveSkillId(skillId);
  if (!resolved) return null;
  return getSkillContent(resolved);
}

function toolNameForSkill(skillId) {
  return `mcu_workbench_${skillId.replace(/-/g, "_")}`;
}

// ========================
//  插件入口
// ========================

export default async (_ctx) => {
  const tools = {};
  const agents = await loadAgents();

  // ---- Skill 路由 ----
  tools.mcu_workbench_route = tool({
    description: "根据嵌入式开发请求推荐最合适的 mcu-workbench skill",
    args: {
      request: tool.schema.string().describe("用户的嵌入式开发请求，例如 'STM32 HAL 开发' 或 'J-Link 调试'"),
    },
    async execute(args) {
      const recommended = recommendSkill(args.request);
      if (!recommended) {
        return {
          request: args.request,
          availableSkills: CANONICAL_SKILLS.slice(0, 10).map((s) => ({
            id: s.id,
            description: s.description,
            layer: s.layer,
          })),
          message: "未找到精确匹配的 skill，请从以上列表中选择或提供更具体的关键词。",
        };
      }

      const content = await readSkillContent(recommended.id);
      return {
        request: args.request,
        recommended: {
          id: recommended.id,
          description: recommended.description,
          layer: recommended.layer,
        },
        preview: content ? content.slice(0, 2000) : null,
      };
    },
  });

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
      "列出所有 7 个 MCU-Workbench agent 及其角色、领域和写入范围。当需要嵌入式开发协助时，先调用此 tool 了解团队。",
    args: {},
    async execute() {
      return {
        team: agents.map((a) => ({
          id: a.id,
          tool: toolNameForAgent(a.id),
          command: `/mcu-${a.id}`,
          description: a.description,
          skills: a.skills,
          scope:
            a.id === "embedded-lead"
              ? ".mcu-workbench/, docs/devlog/"
              : a.id === "system-architect"
                ? "docs/architecture/"
                : a.id === "firmware-engineer"
                  ? "项目固件目录与配置"
                  : a.id === "hardware-integration"
                    ? "hardware/, docs/verification/"
                    : a.id === "toolchain-engineer"
                      ? "工具配置, docs/verification/"
                      : a.id === "verification-engineer"
                        ? "测试目录, docs/verification/"
                        : "docs/devlog/, docs/notes/",
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
      const lowerRequest = args.request.toLowerCase();
      const keywords = lowerRequest
        .replace(/[，,。.；;！!？?\s]+/g, " ")
        .split(" ")
        .filter((w) => w.length >= 2);

      const domainKeywords = {
        "embedded-lead": [
          "项目", "初始化", "架构", "总览", "统筹", "编排", "协调",
          "project", "init", "orchestrate", "coordinate", "overview",
        ],
        "system-architect": [
          "分层", "架构", "设计", "接口", "迁移", "解耦",
          "architecture", "layer", "design", "interface", "migration", "decouple",
        ],
        "firmware-engineer": [
          "固件", "驱动", "hal", "bsp", "app", "实现", "代码", "编写", "i2c", "spi", "uart", "gpio", "adc", "定时器",
          "firmware", "driver", "implement", "code", "bsp", "hal",
        ],
        "hardware-integration": [
          "硬件", "电路", "原理图", "pcb", "引脚", "连接", "测量", "示波器",
          "hardware", "schematic", "pin", "connection", "measurement", "oscilloscope",
        ],
        "toolchain-engineer": [
          "编译", "构建", "烧录", "flash", "j-link", "openocd", "gdb", "调试", "链接", "map",
          "build", "compile", "linker", "toolchain", "debug", "gdb",
        ],
        "verification-engineer": [
          "测试", "验证", "回归", "质量", "审查", "静态分析",
          "test", "verify", "regression", "quality", "review", "static analysis",
        ],
        "knowledge-engineer": [
          "文档", "笔记", "日志", "记录", "学习",
          "document", "note", "log", "record", "learn",
        ],
      };

      const scored = agents.map((a) => {
        let score = 0;
        const domKeys = domainKeywords[a.id] || [];
        for (const kw of keywords) {
          if (domKeys.some((dk) => dk === kw)) score += 3;
          if (domKeys.some((dk) => dk.includes(kw) || kw.includes(dk))) score += 1;
        }
        return { agent: a, score };
      });

      scored.sort((a, b) => b.score - a.score);
      const best = scored[0].score > 0 ? scored[0].agent : null;

      return {
        request: args.request,
        recommended: best
          ? {
              id: best.id,
              tool: toolNameForAgent(best.id),
              command: `/mcu-${best.id}`,
              description: best.description,
            }
          : null,
        allAgents: agents.map((a) => ({
          id: a.id,
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

    const scope =
      agent.id === "embedded-lead"
        ? ".mcu-workbench/、docs/devlog/"
        : agent.id === "system-architect"
          ? "docs/architecture/"
          : agent.id === "firmware-engineer"
            ? "项目固件目录与配置"
            : agent.id === "hardware-integration"
              ? "hardware/、docs/verification/"
              : agent.id === "toolchain-engineer"
                ? "工具配置、docs/verification/"
                : agent.id === "verification-engineer"
                  ? "测试目录、docs/verification/"
                  : "docs/devlog/、docs/notes/";

    tools[agentToolName] = tool({
      description: `MCU-Workbench Agent「${agent.id}」：${agent.description}。写入范围：${scope}。调用此 tool 获取该角色的完整工作指令。`,
      args: {
        task: tool.schema.string().optional().describe(`委托给 ${agent.id} 的具体任务`),
      },
      async execute(args) {
        return {
          role: agent.id,
          command: `/mcu-${agent.id}`,
          description: agent.description,
          skills: agent.skills,
          maxTurns: agent.maxTurns,
          scope,
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
