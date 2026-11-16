const fs = require('fs');
const path = require('path');
const { ROOT, readJson } = require('./common');

const FORBIDDEN_CODEX_KEYS = new Set(['agents', 'hooks', 'mcpServers']);
const CURSOR_SKILL_LAYERS = [
  'workflow', 'rtos', 'bsp', 'platform', 'middleware', 'system', 'tools', 'hardware'
];

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
  if (Object.prototype.hasOwnProperty.call(manifest, 'mcpServers')) errors.push('cursor manifest: MCP 由根目录 mcp.json 声明');

  const expected = CURSOR_SKILL_LAYERS.map((layer) => `./skills/${layer}/`);
  const actual = Array.isArray(manifest.skills) ? manifest.skills : [];
  if (!Array.isArray(manifest.skills)) errors.push('cursor manifest: skills 必须为数组');
  for (const skillPath of expected) {
    if (!actual.includes(skillPath)) errors.push(`cursor manifest: 缺少 skills 路径 ${skillPath}`);
    const directory = path.join(ROOT, 'skills', skillPath.split('/')[2]);
    if (!fs.existsSync(directory)) errors.push(`cursor manifest: skills 路径不存在 ${skillPath}`);
  }
  for (const skillPath of actual) {
    if (!expected.includes(skillPath)) errors.push(`cursor manifest: 未登记 skills 路径 ${skillPath}`);
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

  const projectMcp = readJson('.cursor/mcp.json', errors);
  const projectServer = projectMcp && projectMcp.mcpServers && projectMcp.mcpServers['mcu-workbench'];
  if (!projectServer) errors.push('.cursor/mcp.json: 缺少 mcu-workbench 服务器');
  else if (!Array.isArray(projectServer.args) || projectServer.args.length !== 1 || projectServer.args[0] !== 'mcp/server.js') {
    errors.push('.cursor/mcp.json: args 必须为 ["mcp/server.js"]');
  }

  const marketplace = readJson('.cursor-plugin/marketplace.json', errors);
  if (marketplace) {
    if (marketplace.name !== 'mcu-workbench') errors.push('cursor marketplace: name 必须为 mcu-workbench');
    const plugins = Array.isArray(marketplace.plugins) ? marketplace.plugins : [];
    const entry = plugins.find((plugin) => plugin && plugin.name === 'mcu-workbench');
    if (!entry) errors.push('cursor marketplace: 缺少 mcu-workbench');
    else if (entry.source !== '.') errors.push('cursor marketplace: source 必须为 .');
  }

  for (const layer of CURSOR_SKILL_LAYERS) {
    const linkPath = path.join(ROOT, '.cursor', 'skills', layer);
    if (!fs.existsSync(linkPath)) {
      errors.push(`cursor skills: 缺少 .cursor/skills/${layer}`);
      continue;
    }
    if (!fs.lstatSync(linkPath).isSymbolicLink()) {
      errors.push(`cursor skills: .cursor/skills/${layer} 必须是符号链接`);
      continue;
    }
    if (fs.realpathSync(linkPath) !== path.join(ROOT, 'skills', layer)) {
      errors.push(`cursor skills: .cursor/skills/${layer} 必须指向 skills/${layer}`);
    }
  }

  if (!fs.existsSync(path.join(ROOT, 'mcp', 'server.js'))) errors.push('mcp/server.js 不存在');
  return true;
}

module.exports = {
  FORBIDDEN_CODEX_KEYS,
  CURSOR_SKILL_LAYERS,
  validateCodexManifest,
  validateClaudeManifestSkillPaths,
  validateCursorManifest
};
