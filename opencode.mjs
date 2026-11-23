import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { tool } from "@opencode-ai/plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = new URL(".", import.meta.url).pathname;
const require = createRequire(import.meta.url);

// 复用现有 CommonJS 的 catalog 和 loader
const { CANONICAL_SKILLS, resolveSkillId } = require("./skills/catalog.js");
const { getSkillContent } = require("./skills/loader.js");

/**
 * 根据用户请求推荐最合适的 skill
 * @param {string} request
 * @returns {{ id: string, description: string, layer: string } | null}
 */
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

/**
 * 读取 skill 的 SKILL.md 内容
 * @param {string} skillId
 * @returns {Promise<string | null>}
 */
async function readSkillContent(skillId) {
  const resolved = resolveSkillId(skillId);
  if (!resolved) return null;
  return getSkillContent(resolved);
}

/**
 * 生成合法的 OpenCode tool 名称
 * @param {string} skillId
 * @returns {string}
 */
function toolNameForSkill(skillId) {
  return `mcu_workbench_${skillId.replace(/-/g, "_")}`;
}

export default async (_ctx) => {
  const tools = {};

  // 1. 路由 tool：根据用户请求推荐 skill
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

  // 2. 为每个 canonical skill 生成一个 tool
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

  return { tool: tools };
};
