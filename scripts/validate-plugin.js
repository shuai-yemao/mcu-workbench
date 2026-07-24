#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { SKILL_CATALOG, resolveSkillId, SKILL_BY_CANONICAL_ID } = require('../skills/catalog');
const { buildCapabilityMigrationPlan, materializeSkillCapabilities } = require('./materialize-skill-capabilities');

const ROOT = path.resolve(__dirname, '..');
const NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+){1,3}$/;
const ABSOLUTE_PATH_PATTERN = /(?:\b[A-Za-z]:[\\/]|file:\/\/\/|\{USER_HOME\})/;
const LVGL_SKILL_ROOT = path.join(ROOT, 'skills', 'middleware', 'middleware-lvgl');
const LVGL_GRAPH_PATH = path.join(LVGL_SKILL_ROOT, 'references', 'lvgl-knowledge-graph.json');
const ARCH_GRAPH_ROOT = path.join(ROOT, 'skills', 'workflow', 'workflow-project-integration', 'references');
const ARCH_GRAPH_PATH = path.join(ARCH_GRAPH_ROOT, 'software-architecture-knowledge-graph.json');
const TUTOR_SKILL_ROOT = path.join(ROOT, 'skills', 'tools', 'tools-learning-tutor');

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
const FORBIDDEN_CODEX_KEYS = new Set(['agents', 'hooks', 'mcpServers']);

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

function validateCodexManifest(errors) {
  const manifestPath = path.join(ROOT, '.codex-plugin', 'plugin.json');
  if (!fs.existsSync(manifestPath)) return false;
  const manifest = readJson('.codex-plugin/plugin.json', errors);
  if (!manifest) return false;
  if (manifest.name !== 'mcu-workbench') errors.push('codex manifest: name 必须为 mcu-workbench');
  if (manifest.skills !== './skills/') errors.push('codex manifest: skills 必须为 ./skills/');
  if (!manifest.interface || manifest.interface.displayName !== 'MCU-Workbench') errors.push('codex manifest: 缺少 interface.displayName');
  if (!manifest.interface || !manifest.interface.shortDescription) errors.push('codex manifest: 缺少 interface.shortDescription');
  if (!manifest.interface || !manifest.interface.longDescription) errors.push('codex manifest: 缺少 interface.longDescription');
  for (const key of FORBIDDEN_CODEX_KEYS) if (Object.prototype.hasOwnProperty.call(manifest, key)) errors.push(`codex manifest: 当前适配禁止字段 ${key}`);
  if (!fs.existsSync(path.join(ROOT, 'skills'))) errors.push('codex manifest: skills 目录不存在');
  return true;
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

function validateLvglReferences(errors) {
  const requiredFiles = [
    'SKILL.md',
    'references/lvgl-knowledge-graph.md',
    'references/lvgl-knowledge-graph.json',
    'references/version-compatibility.md',
    'references/porting-contract.md',
    'references/ui-runtime-performance.md',
    'references/config-build-validation.md'
  ];
  for (const relative of requiredFiles) {
    if (!fs.existsSync(path.join(LVGL_SKILL_ROOT, relative))) {
      errors.push(`skills/middleware/middleware-lvgl: 缺少 ${relative}`);
    }
  }

  if (!fs.existsSync(LVGL_GRAPH_PATH)) return null;
  let graph;
  try {
    graph = JSON.parse(fs.readFileSync(LVGL_GRAPH_PATH, 'utf8'));
  } catch (error) {
    errors.push('skills/middleware/middleware-lvgl: 知识图谱 JSON 无法解析');
    return null;
  }

  if (graph.schema_version !== 1) errors.push('skills/middleware/middleware-lvgl: 知识图谱 schema_version 必须为 1');
  for (const key of ['generated_at', 'sources', 'versions', 'nodes', 'edges']) {
    if (!Object.prototype.hasOwnProperty.call(graph, key)) errors.push(`skills/middleware/middleware-lvgl: 知识图谱缺少 ${key}`);
  }
  if (!Array.isArray(graph.sources) || !Array.isArray(graph.versions) || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) return graph;

  const sourceIds = new Set();
  for (const source of graph.sources) {
    if (!source || !source.id || sourceIds.has(source.id)) errors.push('skills/middleware/middleware-lvgl: source id 缺失或重复');
    if (source && source.id) sourceIds.add(source.id);
    for (const key of ['repository', 'role', 'version']) {
      if (!source || !source[key]) errors.push(`skills/middleware/middleware-lvgl: source 缺少 ${key}`);
    }
  }

  const nodeIds = new Set();
  for (const node of graph.nodes) {
    if (!node || !node.id || nodeIds.has(node.id)) errors.push('skills/middleware/middleware-lvgl: node id 缺失或重复');
    if (node && node.id) nodeIds.add(node.id);
    if (!node || !node.kind || !node.label || !node.path || !sourceIds.has(node.source_id)) {
      errors.push('skills/middleware/middleware-lvgl: node 字段不完整或 source_id 无效');
    }
  }

  const edgeIds = new Set();
  for (const edge of graph.edges) {
    if (!edge || !edge.id || edgeIds.has(edge.id)) errors.push('skills/middleware/middleware-lvgl: edge id 缺失或重复');
    if (edge && edge.id) edgeIds.add(edge.id);
    if (!edge || !nodeIds.has(edge.from) || !nodeIds.has(edge.to) || !edge.relation) {
      errors.push('skills/middleware/middleware-lvgl: edge 引用无效或 relation 缺失');
    }
  }

  const versionIds = new Set((graph.versions || []).map((version) => version && version.id));
  for (const required of ['lvgl-8.3', 'lvgl-9.3', 'lvgl-9-latest']) {
    if (!versionIds.has(required)) errors.push(`skills/middleware/middleware-lvgl: 缺少版本矩阵 ${required}`);
  }
  return graph;
}

function validateSoftwareArchitectureGraph(errors) {
  const requiredFiles = [
    'software-architecture-knowledge-graph.md',
    'software-architecture-knowledge-graph.json'
  ];
  for (const relative of requiredFiles) {
    if (!fs.existsSync(path.join(ARCH_GRAPH_ROOT, relative))) {
      errors.push(`workflow-project-integration: 缺少 references/${relative}`);
    }
  }
  if (!fs.existsSync(ARCH_GRAPH_PATH)) return null;

  let graph;
  try {
    graph = JSON.parse(fs.readFileSync(ARCH_GRAPH_PATH, 'utf8'));
  } catch (error) {
    errors.push('workflow-project-integration: 软件架构知识图谱 JSON 无法解析');
    return null;
  }

  if (graph.schema_version !== 1) errors.push('workflow-project-integration: 软件架构知识图谱 schema_version 必须为 1');
  for (const key of ['generated_at', 'sources', 'versions', 'nodes', 'edges']) {
    if (!Object.prototype.hasOwnProperty.call(graph, key)) errors.push(`workflow-project-integration: 知识图谱缺少 ${key}`);
  }
  if (!Array.isArray(graph.sources) || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) return graph;

  const sourceIds = new Set();
  for (const source of graph.sources) {
    if (!source || !source.id || sourceIds.has(source.id)) errors.push('workflow-project-integration: source id 缺失或重复');
    if (source && source.id) sourceIds.add(source.id);
    for (const key of ['repository', 'role', 'paths']) {
      if (!source || !source[key]) errors.push(`workflow-project-integration: source 缺少 ${key}`);
    }
    if (source && source.commit !== null && source.commit !== undefined && !/^[0-9a-f]{40}$/.test(source.commit)) {
      errors.push(`workflow-project-integration: source commit 格式无效 ${source.id}`);
    }
  }

  const nodeIds = new Set();
  for (const node of graph.nodes) {
    if (!node || !node.id || nodeIds.has(node.id)) errors.push('workflow-project-integration: node id 缺失或重复');
    if (node && node.id) nodeIds.add(node.id);
    if (!node || !node.kind || !node.label || !node.path || !sourceIds.has(node.source_id)) {
      errors.push('workflow-project-integration: node 字段不完整或 source_id 无效');
    }
  }

  const edgeIds = new Set();
  for (const edge of graph.edges) {
    if (!edge || !edge.id || edgeIds.has(edge.id)) errors.push('workflow-project-integration: edge id 缺失或重复');
    if (edge && edge.id) edgeIds.add(edge.id);
    if (!edge || !nodeIds.has(edge.from) || !nodeIds.has(edge.to) || !edge.relation || !edge.evidence) {
      errors.push('workflow-project-integration: edge 引用无效或缺少 evidence');
    }
  }

  for (const required of [
    'skill-app-architecture', 'skill-middleware-communication', 'skill-os-abstraction',
    'skill-bsp-adapter', 'skill-core-mcu', 'skill-driver-vendor', 'skill-tools-build',
    'skill-software-system'
  ]) {
    if (!nodeIds.has(required)) errors.push(`workflow-project-integration: 缺少架构节点 ${required}`);
  }
  for (const required of ['app-forbids-core', 'app-forbids-driver', 'core-to-driver']) {
    if (!edgeIds.has(required)) errors.push(`workflow-project-integration: 缺少架构边 ${required}`);
  }
  return graph;
}

function validateLearningTutorReferences(errors) {
  const requiredFiles = [
    'SKILL.md',
    'references/learning-modes.md',
    'references/project-scan-and-evidence.md',
    'references/question-bank.md',
    'references/note-template.md',
    'references/coverage-checklist.md',
    'references/obsidian-write-protocol.md',
    'references/session-state.md'
  ];
  for (const relative of requiredFiles) {
    if (!fs.existsSync(path.join(TUTOR_SKILL_ROOT, relative))) {
      errors.push(`tools-learning-tutor: 缺少 ${relative}`);
    }
  }

  const skillPath = path.join(TUTOR_SKILL_ROOT, 'SKILL.md');
  if (!fs.existsSync(skillPath)) return;
  const content = fs.readFileSync(skillPath, 'utf8');
  for (const reference of requiredFiles.slice(1)) {
    if (!content.includes(`references/${path.basename(reference)}`)) {
      errors.push(`tools-learning-tutor: SKILL.md 未直接链接 ${reference}`);
    }
  }

  const capabilityAnchors = [
    'tutor', 'code-audit', 'note-refresh', 'project-note',
    '逐节', 'Q&A', 'Mermaid', 'WikiLink', 'Obsidian', '未验证', '薄弱点'
  ];
  for (const anchor of capabilityAnchors) {
    if (!content.includes(anchor)) errors.push(`tools-learning-tutor: 主入口缺少能力标记 ${anchor}`);
  }
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

function validateCapabilityMigration(errors) {
  const result = materializeSkillCapabilities({ write: false });
  for (const message of result.errors) errors.push(`capability migration: ${message}`);
  for (const message of result.missing) errors.push(`capability migration: 缺少已内化资料 ${message}`);
  for (const targetId of result.staleIndexes) errors.push(`capability migration: ${targetId}/capability-index.md 缺失或过期`);
  for (const message of result.staleLegacyPaths) errors.push(`capability migration: ${message} 未清理`);

  const { groups } = buildCapabilityMigrationPlan();
  for (const [targetId, entries] of groups) {
    const target = SKILL_BY_CANONICAL_ID[targetId];
    if (!target) continue;
    const skillPath = path.join(ROOT, target.path, 'SKILL.md');
    const skillContent = fs.readFileSync(skillPath, 'utf8');
    if (!skillContent.includes('references/capability-index.md')) {
      errors.push(`capability migration: ${targetId}/SKILL.md 未链接 references/capability-index.md`);
    }
    const indexPath = path.join(ROOT, target.path, 'references', 'capability-index.md');
    if (fs.existsSync(indexPath)) {
      validateLocalMarkdownLinks(indexPath, fs.readFileSync(indexPath, 'utf8'), errors);
    }
    for (const entry of entries) {
      if (!fs.existsSync(path.join(entry.destination, 'GUIDE.md'))) {
        errors.push(`capability migration: ${targetId} 缺少 ${entry.source.id}/GUIDE.md`);
      }
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
  const codexManifest = validateCodexManifest(errors);
  validateLvglReferences(errors);
  validateSoftwareArchitectureGraph(errors);
  validateLearningTutorReferences(errors);
  validateCapabilityMigration(errors);
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

  return { errors, summary: { ...summarize(SKILL_CATALOG), agents: agentSummary.count, agentNames: agentSummary.names, codexManifest } };
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

module.exports = {
  NAME_PATTERN,
  EXPECTED_AGENTS,
  parseAgentFrontmatter,
  summarize,
  validateLvglReferences,
  validateSoftwareArchitectureGraph,
  validateLearningTutorReferences,
  validateCapabilityMigration,
  validatePlugin
};
