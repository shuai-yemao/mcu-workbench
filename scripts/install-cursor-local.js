#!/usr/bin/env node
/**
 * 以用户全局作用域安装 MCU-Workbench。
 * Skills 进入 ~/.cursor/skills，MCP 进入 ~/.cursor/mcp.json，插件本体进入
 * ~/.cursor/plugins/local。这些位置对所有工程生效，不写入项目 .cursor/。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { listCursorSkills } = require('./validators/manifest');

const ROOT = path.resolve(__dirname, '..');
const SKIP = new Set(['.git', 'node_modules', 'coverage', 'integration-test', 'test-project']);
const GLOBAL_MCP_NAME = 'mcu-workbench';

function copyEntry(src, dest) {
  const stat = fs.lstatSync(src);
  if (stat.isSymbolicLink()) {
    fs.symlinkSync(fs.readlinkSync(src), dest);
    return;
  }
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      if (SKIP.has(entry)) continue;
      copyEntry(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }
  if (stat.isFile()) fs.copyFileSync(src, dest);
}

function readJsonObject(file) {
  if (!fs.existsSync(file)) return {};
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${file} 必须是 JSON 对象`);
  }
  return parsed;
}

function writeGlobalMcp(mcpPath, pluginDir) {
  const config = readJsonObject(mcpPath);
  const servers = config.mcpServers && typeof config.mcpServers === 'object' && !Array.isArray(config.mcpServers)
    ? config.mcpServers
    : {};
  servers[GLOBAL_MCP_NAME] = {
    command: 'node',
    args: [path.join(pluginDir, 'mcp', 'server.js')]
  };
  config.mcpServers = servers;
  fs.mkdirSync(path.dirname(mcpPath), { recursive: true });
  fs.writeFileSync(mcpPath, `${JSON.stringify(config, null, 2)}\n`);
}

function ensureCursorSkillLinks(root) {
  const dest = path.join(root, 'cursor-skills');
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  for (const skill of listCursorSkills()) {
    const source = path.join(root, skill.path);
    if (!fs.existsSync(path.join(source, 'SKILL.md'))) throw new Error(`缺少 ${skill.path}/SKILL.md`);
    fs.symlinkSync(path.relative(dest, source), path.join(dest, skill.id));
  }
}

function linkGlobalSkills(skillsRoot, pluginDir) {
  fs.rmSync(path.join(skillsRoot, 'mcu-workbench'), { recursive: true, force: true });
  fs.mkdirSync(skillsRoot, { recursive: true });
  for (const skill of listCursorSkills()) {
    const source = path.join(pluginDir, 'cursor-skills', skill.id);
    if (!fs.existsSync(source)) throw new Error(`缺少 cursor skill ${skill.id}`);
    const link = path.join(skillsRoot, skill.id);
    fs.rmSync(link, { recursive: true, force: true });
    fs.symlinkSync(path.relative(skillsRoot, source), link);
  }
}

function registerInstalledPlugin(pluginsDir, pluginDir) {
  const file = path.join(pluginsDir, 'installed.json');
  const config = fs.existsSync(file) ? readJsonObject(file) : {};
  const local = config.local && typeof config.local === 'object' && !Array.isArray(config.local)
    ? config.local
    : {};
  local[GLOBAL_MCP_NAME] = pluginDir;
  config.local = local;
  const user = Array.isArray(config.user) ? config.user.filter((name) => name !== GLOBAL_MCP_NAME) : [];
  user.push(GLOBAL_MCP_NAME);
  config.user = user;
  fs.mkdirSync(pluginsDir, { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
  return file;
}

function installCursorPlugin(options = {}) {
  const home = options.home || os.homedir();
  const pluginDir = options.pluginDir || path.join(home, '.cursor', 'plugins', 'local', 'mcu-workbench');
  const mcpPath = options.mcpPath || path.join(home, '.cursor', 'mcp.json');
  const skillsDir = options.skillsDir || path.join(home, '.cursor', 'skills');

  fs.rmSync(pluginDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(pluginDir), { recursive: true });
  copyEntry(ROOT, pluginDir);
  ensureCursorSkillLinks(pluginDir);
  fs.rmSync(path.join(pluginDir, '.cursor'), { recursive: true, force: true });
  writeGlobalMcp(mcpPath, pluginDir);
  linkGlobalSkills(skillsDir, pluginDir);
  const installedJson = registerInstalledPlugin(path.join(home, '.cursor', 'plugins'), pluginDir);

  return {
    scope: 'user',
    pluginDir,
    mcpPath,
    skillsDir,
    installedJson
  };
}

if (require.main === module) {
  const installed = installCursorPlugin();
  process.stdout.write(`Cursor 插件已按用户全局作用域安装\n`);
  process.stdout.write(`插件：${installed.pluginDir}\n`);
  process.stdout.write(`Skills：${installed.skillsDir}\n`);
  process.stdout.write(`MCP：${installed.mcpPath}\n`);
  process.stdout.write('请执行 Developer: Reload Window。该插件对所有工程生效。\n');
}

module.exports = {
  GLOBAL_MCP_NAME,
  ensureCursorSkillLinks,
  installCursorPlugin
};
