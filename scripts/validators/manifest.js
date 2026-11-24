const fs = require('fs');
const path = require('path');
const { CANONICAL_SKILLS, SKILL_BY_ID } = require('../../skills/catalog');
const { ROOT, readJson } = require('./common');

const FORBIDDEN_CODEX_KEYS = new Set(['agents', 'hooks', 'mcpServers']);

function listCursorSkills() {
  const skills = [...CANONICAL_SKILLS];
  for (const skill of Object.values(SKILL_BY_ID)) {
    if (skill.layer === 'hardware' && !skill.archived && !skills.some((item) => item.id === skill.id)) {
      skills.push(skill);
    }
  }
  return skills;
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

function validateClaudeManifestSkillPaths(manifest, expectedLayers, errors) {
  if (!manifest || !Array.isArray(manifest.skills)) return;

  const expectedManifestPaths = new Set([...expectedLayers].map((layer) => `./skills/${layer}/`));
  const actualManifestPaths = new Set(manifest.skills);
  for (const skillPath of expectedManifestPaths) {
    if (!actualManifestPaths.has(skillPath)) errors.push(`manifest: 缺少 skills 路径 ${skillPath}`);
  }
  for (const skillPath of actualManifestPaths) {
    if (!expectedManifestPaths.has(skillPath)) errors.push(`manifest: 未登记 skills 路径 ${skillPath}`);
    if (!/^\.\/skills\/[a-z0-9-]+\/$/.test(skillPath)) {
      errors.push(`manifest: skills 路径格式无效 ${skillPath}`);
      continue;
    }
    const resolved = path.resolve(ROOT, skillPath.slice(2));
    const skillsRoot = path.join(ROOT, 'skills');
    if (!resolved.startsWith(skillsRoot + path.sep)) {
      errors.push(`manifest: skills 路径越界 ${skillPath}`);
      continue;
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      errors.push(`manifest: skills 路径不存在 ${skillPath}`);
    }
  }
}

function validateCursorManifest(errors) {
  const manifest = readJson('.cursor-plugin/plugin.json', errors);
  if (!manifest) return false;
  if (manifest.name !== 'mcu-workbench') errors.push('cursor manifest: name 必须为 mcu-workbench');
  if (manifest.agents !== './agents/') errors.push('cursor manifest: agents 必须为 ./agents/');
  if (Object.prototype.hasOwnProperty.call(manifest, 'hooks')) errors.push('cursor manifest: 不启用 hooks');
  if (manifest.skills !== './cursor-skills/') errors.push('cursor manifest: skills 必须为 ./cursor-skills/');
  if (manifest.mcpServers !== './mcp.json') errors.push('cursor manifest: mcpServers 必须为 ./mcp.json');
  if (manifest.displayName !== 'MCU-Workbench') errors.push('cursor manifest: displayName 必须为 MCU-Workbench');

  for (const skill of listCursorSkills()) {
    const linkPath = path.join(ROOT, 'cursor-skills', skill.id);
    if (!fs.existsSync(linkPath)) {
      errors.push(`cursor skills: 缺少 cursor-skills/${skill.id}`);
      continue;
    }
    if (!fs.lstatSync(linkPath).isSymbolicLink()) {
      errors.push(`cursor skills: cursor-skills/${skill.id} 必须是符号链接`);
      continue;
    }
    const resolved = fs.realpathSync(linkPath);
    if (resolved !== path.join(ROOT, skill.path)) {
      errors.push(`cursor skills: cursor-skills/${skill.id} 必须指向 ${skill.path}`);
    }
    if (!fs.existsSync(path.join(resolved, 'SKILL.md'))) {
      errors.push(`cursor skills: ${skill.id} 缺少 SKILL.md`);
    }
  }

  const mcp = readJson('mcp.json', errors);
  const server = mcp && mcp.mcpServers && mcp.mcpServers.skills;
  if (!server) errors.push('mcp.json: 缺少 skills 服务器');
  else {
    if (server.command !== 'node') errors.push('mcp.json: command 必须为 node');
    if (!Array.isArray(server.args) || server.args.length !== 1 || server.args[0] !== 'mcp/server.js') {
      errors.push('mcp.json: args 必须为 ["mcp/server.js"]');
    }
    if (server.cwd !== '${CURSOR_PLUGIN_ROOT}') errors.push('mcp.json: cwd 必须为 ${CURSOR_PLUGIN_ROOT}');
  }

  if (fs.existsSync(path.join(ROOT, '.cursor', 'mcp.json'))) {
    errors.push('cursor scope: 禁止项目级 .cursor/mcp.json，安装脚本写入用户全局 ~/.cursor/mcp.json');
  }
  if (fs.existsSync(path.join(ROOT, '.cursor', 'skills'))) {
    errors.push('cursor scope: 禁止项目级 .cursor/skills，安装脚本写入用户全局 ~/.cursor/skills/<skill-id>');
  }

  const marketplace = readJson('.cursor-plugin/marketplace.json', errors);
  if (marketplace) {
    if (marketplace.name !== 'mcu-workbench') errors.push('cursor marketplace: name 必须为 mcu-workbench');
    const plugins = Array.isArray(marketplace.plugins) ? marketplace.plugins : [];
    const entry = plugins.find((plugin) => plugin && plugin.name === 'mcu-workbench');
    if (!entry) errors.push('cursor marketplace: 缺少 mcu-workbench');
    else if (entry.source !== '.') errors.push('cursor marketplace: source 必须为 .');
  }

  if (!fs.existsSync(path.join(ROOT, 'mcp', 'server.js'))) errors.push('mcp/server.js 不存在');
  return true;
}

module.exports = {
  FORBIDDEN_CODEX_KEYS,
  listCursorSkills,
  validateCodexManifest,
  validateClaudeManifestSkillPaths,
  validateCursorManifest
};
