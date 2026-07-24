const fs = require('fs');
const path = require('path');
const { resolveSkillId, SKILL_BY_CANONICAL_ID } = require('../../skills/catalog');
const {
  ROOT,
  NAME_PATTERN,
  ABSOLUTE_PATH_PATTERN,
  getFrontmatter
} = require('./common');

const EXPECTED_AGENTS = new Set([
  'embedded-lead', 'system-architect', 'firmware-engineer',
  'hardware-integration', 'toolchain-engineer', 'verification-engineer',
  'knowledge-engineer'
]);
const FORBIDDEN_AGENT_KEYS = new Set(['hooks', 'mcpServers', 'permissionMode']);

function parseAgentFrontmatter(frontmatter) {
  const lines = frontmatter.split(/\r?\n/);
  const values = {};
  const skills = [];
  let inSkills = false;
  for (const line of lines) {
    const key = line.match(/^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/);
    if (key) {
      const [, name, value] = key;
      if (name === 'skills') { inSkills = true; values.skills = skills; continue; }
      inSkills = false;
      values[name] = value.trim().replace(/^['"]|['"]$/g, '');
      continue;
    }
    const item = line.match(/^\s+-\s+(.+)$/);
    if (inSkills && item) skills.push(item[1].trim().replace(/^['"]|['"]$/g, ''));
  }
  return values;
}

function validateAgents(errors) {
  const agentsRoot = path.join(ROOT, 'agents');
  if (!fs.existsSync(agentsRoot)) {
    errors.push('agents: 缺少插件根目录 agents/');
    return { count: 0, names: [] };
  }
  const entries = fs.readdirSync(agentsRoot, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && path.extname(entry.name) === '.md');
  const names = [];
  for (const entry of files) {
    const relative = path.posix.join('agents', entry.name);
    const content = fs.readFileSync(path.join(agentsRoot, entry.name), 'utf8');
    const frontmatter = getFrontmatter(content);
    if (!frontmatter) { errors.push(`${relative}: 缺少 YAML frontmatter`); continue; }
    const parsed = parseAgentFrontmatter(frontmatter);
    const name = parsed.name || path.basename(entry.name, '.md');
    names.push(name);
    if (!NAME_PATTERN.test(name)) errors.push(`${relative}: 非法 agent name ${name}`);
    if (name !== path.basename(entry.name, '.md')) errors.push(`${relative}: name 必须与文件名一致`);
    if (!parsed.description) errors.push(`${relative}: 缺少 description`);
    if (parsed.model !== 'sonnet') errors.push(`${relative}: model 必须为 sonnet`);
    if (parsed.effort !== 'medium') errors.push(`${relative}: effort 必须为 medium`);
    if (!/^\d+$/.test(parsed.maxTurns || '') || Number(parsed.maxTurns) <= 0) errors.push(`${relative}: maxTurns 必须为正整数`);
    if (!Array.isArray(parsed.skills) || parsed.skills.length === 0) errors.push(`${relative}: skills 不能为空`);
    for (const skillId of parsed.skills || []) {
      const resolved = resolveSkillId(skillId);
      const hardwareSkill = resolved && resolved.startsWith('hardware-');
      if (!resolved || (!SKILL_BY_CANONICAL_ID[resolved] && !hardwareSkill)) errors.push(`${relative}: skill 引用不是 canonical skill: ${skillId}`);
    }
    for (const line of frontmatter.split(/\r?\n/)) {
      const key = line.match(/^([A-Za-z][A-Za-z0-9_]*):/);
      if (key && FORBIDDEN_AGENT_KEYS.has(key[1])) errors.push(`${relative}: 禁止 agent 字段 ${key[1]}`);
    }
    const requiredSections = [
      /##\s+Inputs|##\s+输入/i, /##\s+Evidence|##\s+证据/i,
      /##\s+Scope and write policy|##\s+产出|##\s+写入/i,
      /##\s+Outputs and acceptance|##\s+验收/i, /##\s+Handoff|##\s+交接/i
    ];
    for (const section of requiredSections) if (!section.test(content)) errors.push(`${relative}: 缺少统一协议章节`);
    if (ABSOLUTE_PATH_PATTERN.test(content)) errors.push(`${relative}: 包含机器私有绝对路径`);
  }
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
  for (const name of duplicates) errors.push(`agents: agent name 重复 ${name}`);
  for (const expected of EXPECTED_AGENTS) if (!names.includes(expected)) errors.push(`agents: 缺少 ${expected}`);
  for (const name of names) if (!EXPECTED_AGENTS.has(name)) errors.push(`agents: 未登记 agent ${name}`);
  for (const entry of entries.filter((item) => item.isFile() && path.extname(item.name) !== '.md')) errors.push(`agents: 不支持的文件 ${entry.name}`);
  for (const entry of entries.filter((item) => item.isDirectory())) errors.push(`agents: 不支持嵌套目录 ${entry.name}`);
  if (files.length !== EXPECTED_AGENTS.size) errors.push(`agents: 期望 ${EXPECTED_AGENTS.size} 个 agent，实际 ${files.length} 个`);
  return { count: files.length, names: names.sort() };
}

module.exports = {
  EXPECTED_AGENTS,
  parseAgentFrontmatter,
  validateAgents
};
