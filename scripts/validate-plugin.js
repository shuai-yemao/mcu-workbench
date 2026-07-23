#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { SKILL_CATALOG, resolveSkillId, SKILL_BY_CANONICAL_ID } = require('../skills/catalog');

const ROOT = path.resolve(__dirname, '..');
const NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+){1,3}$/;
const ABSOLUTE_PATH_PATTERN = /(?:\b[A-Za-z]:[\\/]|file:\/\/\/|\{USER_HOME\})/;

function readJson(relativePath, errors) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
  } catch (error) {
    errors.push(`${relativePath}: 无法读取 JSON（${error.message}）`);
    return null;
  }
}

function getFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : null;
}

function getScalar(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:[ \\t]*([^\\r\\n]+)`, 'm'));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : '';
}

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
    const file = path.join(agentsRoot, entry.name);
    const content = fs.readFileSync(file, 'utf8');
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
  const nonMarkdownFiles = entries.filter((entry) => entry.isFile() && path.extname(entry.name) !== '.md');
  for (const entry of nonMarkdownFiles) errors.push(`agents: 不支持的文件 ${entry.name}`);
  const nestedDirectories = entries.filter((entry) => entry.isDirectory());
  for (const entry of nestedDirectories) errors.push(`agents: 不支持嵌套目录 ${entry.name}`);
  if (files.length !== EXPECTED_AGENTS.size) errors.push(`agents: 期望 ${EXPECTED_AGENTS.size} 个 agent，实际 ${files.length} 个`);
  return { count: files.length, names: names.sort() };
}

function findSkillDirectories(root) {
  const result = [];
  if (!fs.existsSync(root)) return result;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const current = path.join(root, entry.name);
    if (!entry.isDirectory()) continue;
    if (fs.existsSync(path.join(current, 'SKILL.md'))) result.push(current);
    result.push(...findSkillDirectories(current));
  }
  return result;
}

function findTextFiles(root) {
  const result = [];
  if (!fs.existsSync(root)) return result;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const current = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...findTextFiles(current));
    if (entry.isFile() && ['.md', '.yaml'].includes(path.extname(entry.name))) result.push(current);
  }
  return result;
}

function validateLocalMarkdownLinks(skillFile, content, errors) {
  const directory = path.dirname(skillFile);
  const links = [...content.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1].trim());
  for (const link of links) {
    if (!link || link.startsWith('#') || /^(?:https?:|mailto:)/.test(link)) continue;
    const target = link.split('#')[0];
    if (!target || target.includes('$') || target.includes('{')) continue;
    const resolved = path.resolve(directory, target.replace(/\\/g, '/'));
    if (!resolved.startsWith(ROOT + path.sep) || !fs.existsSync(resolved)) {
      errors.push(`${path.relative(ROOT, skillFile)}: 本地链接不存在或越界（${link}）`);
    }
  }
}

function summarize(catalog) {
  const countByLayer = {};
  const countByPrefix = {};
  for (const skill of catalog) {
    countByLayer[skill.layer] = (countByLayer[skill.layer] || 0) + 1;
    const prefix = skill.id.split('-')[0];
    countByPrefix[prefix] = (countByPrefix[prefix] || 0) + 1;
  }
  return {
    count: catalog.length,
    canonicalCount: catalog.filter((skill) => skill.canonical).length,
    countByLayer,
    countByPrefix
  };
}

function validatePlugin() {
  const errors = [];
  const agentSummary = validateAgents(errors);
  const manifest = readJson('.claude-plugin/plugin.json', errors);
  if (manifest) {
    if (manifest.name !== 'mcu-workbench') errors.push('manifest: name 必须为 mcu-workbench');
    if (!Array.isArray(manifest.skills)) errors.push('manifest: skills 必须为数组');
  }

  const ids = new Set();
  const legacyIds = new Set();
  const expectedDirectories = new Set();
  const expectedLayers = new Set();
  for (const skill of SKILL_CATALOG) {
    if (!NAME_PATTERN.test(skill.id)) errors.push(`catalog: 非法名称 ${skill.id}`);
    if (ids.has(skill.id)) errors.push(`catalog: 重复名称 ${skill.id}`);
    if (legacyIds.has(skill.legacyId)) errors.push(`catalog: 重复旧名称 ${skill.legacyId}`);
    ids.add(skill.id);
    legacyIds.add(skill.legacyId);
    expectedLayers.add(skill.layer);

    const directory = path.join(ROOT, skill.path);
    const skillFile = path.join(directory, 'SKILL.md');
    expectedDirectories.add(path.resolve(directory));
    if (!fs.existsSync(skillFile)) {
      errors.push(`catalog: 缺少 ${skill.path}/SKILL.md`);
      continue;
    }

    const content = fs.readFileSync(skillFile, 'utf8');
    const frontmatter = getFrontmatter(content);
    if (!frontmatter) {
      errors.push(`${skill.path}: 缺少 YAML frontmatter`);
      continue;
    }
    if (getScalar(frontmatter, 'name') !== skill.id) errors.push(`${skill.path}: name 必须为 ${skill.id}`);
    if (!getScalar(frontmatter, 'description')) errors.push(`${skill.path}: 缺少非空 description`);
    if (ABSOLUTE_PATH_PATTERN.test(content)) errors.push(`${skill.path}: 包含机器私有绝对路径或 USER_HOME 占位符`);
    validateLocalMarkdownLinks(skillFile, content, errors);
  }

  const actualDirectories = findSkillDirectories(path.join(ROOT, 'skills')).map((directory) => path.resolve(directory));
  for (const directory of actualDirectories) {
    if (!expectedDirectories.has(directory)) errors.push(`未登记的 skill 目录：${path.relative(ROOT, directory)}`);
  }

  // 经过重命名的 skill 不得在当前 active 文档或 agent 配置中继续以旧标识被引用。
  // `embedded` 和 `devlog` 同时是普通词，不做这种文本级强制检查。
  const activeText = findTextFiles(path.join(ROOT, 'skills'))
    .map((file) => ({ file, content: fs.readFileSync(file, 'utf8') }));
  for (const skill of SKILL_CATALOG) {
    if (!skill.canonical || skill.legacyId === skill.id || ['embedded', 'devlog'].includes(skill.legacyId)) continue;
    const oldName = new RegExp(`(?<![A-Za-z0-9-])${skill.legacyId}(?![A-Za-z0-9-])`);
    for (const text of activeText) {
      if (oldName.test(text.content)) {
        errors.push(`${path.relative(ROOT, text.file)}: 仍引用旧 skill 名称 ${skill.legacyId}`);
      }
    }
  }

  if (manifest && Array.isArray(manifest.skills)) {
    const expectedManifestPaths = new Set([...expectedLayers].map((layer) => `./skills/${layer}/`));
    const actualManifestPaths = new Set(manifest.skills);
    for (const skillPath of expectedManifestPaths) {
      if (!actualManifestPaths.has(skillPath)) errors.push(`manifest: 缺少 skills 路径 ${skillPath}`);
    }
    for (const skillPath of actualManifestPaths) {
      if (!expectedManifestPaths.has(skillPath)) errors.push(`manifest: 未登记 skills 路径 ${skillPath}`);
    }
  }

  return { errors, summary: { ...summarize(SKILL_CATALOG), agents: agentSummary.count, agentNames: agentSummary.names } };
}

if (require.main === module) {
  const result = validatePlugin();
  if (result.errors.length) {
    console.error(`插件结构校验失败（${result.errors.length} 项）：`);
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(`插件结构校验通过：${result.summary.count} 个 skills，${result.summary.agents} 个 agents，${Object.keys(result.summary.countByLayer).length} 个架构层。`);
    console.log(`按层级统计：${JSON.stringify(result.summary.countByLayer)}`);
    console.log(`按名称前缀统计：${JSON.stringify(result.summary.countByPrefix)}`);
  }
}

module.exports = { NAME_PATTERN, EXPECTED_AGENTS, parseAgentFrontmatter, summarize, validatePlugin };
