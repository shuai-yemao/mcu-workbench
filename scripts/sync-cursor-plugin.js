#!/usr/bin/env node
/**
 * 生成 Cursor 插件清单，并把下划线 canonical id 适配成 Cursor 允许的连字符技能名。
 *
 * Cursor 只在 skills 路径的下一层查找 SKILL.md，且 name 只能是小写字母、数字和连字符。
 * 本仓库的技能按层级嵌套，platform/impl/service/vendor 仍使用下划线 id。
 * 连字符技能继续从原目录加载；下划线技能通过 cursor-skills/<kebab>/SKILL.md 转接，
 * 正文要求读取原 SKILL.md，避免复制 references 后相对链接失效。
 *
 * 用法：
 *   node scripts/sync-cursor-plugin.js           # 写回清单和适配技能
 *   node scripts/sync-cursor-plugin.js --check   # 只检查工作区是否与生成结果一致
 *   node scripts/sync-cursor-plugin.js --install # 写回后复制到 ~/.cursor/plugins/local
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const { SKILL_CATALOG } = require('../skills/catalog');
const { parseSkillMeta } = require('../skills/loader');

const ROOT = path.resolve(__dirname, '..');
const CURSOR_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DESCRIPTION_LIMIT = 1024;
const ALIAS_ROOT = 'cursor-skills';
const activeSkills = SKILL_CATALOG.filter((skill) => !skill.archived);
const INSTALL_COPY = [
  '.cursor-plugin',
  'agents',
  'commands',
  'cursor-skills',
  'rules',
  'skills'
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function cursorName(id) {
  return id.replace(/_/g, '-');
}

function skillFile(skill) {
  return path.join(ROOT, skill.path, 'SKILL.md');
}

function parentPosix(skill) {
  return skill.path.split('/').slice(0, -1).join('/');
}

function quoteYaml(value) {
  return JSON.stringify(value);
}

function aliasDocument(skill, description) {
  const name = cursorName(skill.id);
  return `---
name: ${name}
description: ${quoteYaml(description)}
---

# ${name}

Cursor 调用名是 \`${name}\`。工作流、目录和代码里的 canonical id 仍是 \`${skill.id}\`。

执行前读取并遵守同插件中的 canonical skill，包括它引用的 references：

[${skill.id}](../../${skill.path}/SKILL.md)

不要改写该 skill 的输入、输出、交接对象和禁止事项。本文件只提供 Cursor 可加载的连字符名称。
`;
}

function buildPlan() {
  const errors = [];
  const byParent = new Map();
  for (const skill of activeSkills) {
    const parent = parentPosix(skill);
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent).push(skill);
    if (!fs.existsSync(skillFile(skill))) errors.push(`缺少 ${skill.path}/SKILL.md`);
  }

  const skillRoots = [];
  const aliases = [];
  const names = new Map();
  for (const [parent, skills] of [...byParent.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const legal = skills.every((skill) => CURSOR_NAME.test(skill.id));
    if (legal) skillRoots.push(`./${parent}`);
    for (const skill of skills) {
      const content = fs.existsSync(skillFile(skill)) ? fs.readFileSync(skillFile(skill), 'utf8') : '';
      const meta = parseSkillMeta(content);
      if (!meta.description) errors.push(`${skill.path}: 缺少 description`);
      if (meta.description && meta.description.length > DESCRIPTION_LIMIT) {
        errors.push(`${skill.path}: description 超过 ${DESCRIPTION_LIMIT} 字符`);
      }
      if (legal) {
        if (names.has(skill.id)) errors.push(`重复的 Cursor 技能名 ${skill.id}`);
        names.set(skill.id, skill.path);
        continue;
      }
      const name = cursorName(skill.id);
      if (!CURSOR_NAME.test(name)) errors.push(`${skill.id}: 无法转换成 Cursor 技能名`);
      if (names.has(name)) errors.push(`Cursor 技能名冲突 ${name}`);
      names.set(name, `${ALIAS_ROOT}/${name}`);
      aliases.push({
        path: `${ALIAS_ROOT}/${name}/SKILL.md`,
        content: aliasDocument(skill, meta.description || skill.description || skill.id)
      });
    }
  }
  if (aliases.length) skillRoots.push(`./${ALIAS_ROOT}`);

  const pkg = readJson('package.json');
  const manifest = {
    name: 'mcu-workbench',
    version: pkg.version,
    description: '面向 STM32、GR5526、ESP32 和 Cortex-M 的嵌入式开发 Skills 与工具集。',
    author: { name: 'MCU-Workbench Team' },
    homepage: 'https://github.com/shuai-yemao/mcu-workbench',
    repository: 'https://github.com/shuai-yemao/mcu-workbench',
    license: 'MIT',
    keywords: ['embedded', 'mcu', 'stm32', 'gr5526', 'esp32', 'firmware'],
    skills: skillRoots
  };
  const files = new Map([
    ['.cursor-plugin/plugin.json', `${JSON.stringify(manifest, null, 2)}\n`]
  ]);
  for (const alias of aliases) files.set(alias.path, alias.content.replace(/\r\n/g, '\n'));

  return { errors, files, manifest, names, aliases };
}

function discoverInstalledSkills(root, skillRoots) {
  const found = [];
  for (const relativeRoot of skillRoots) {
    const dir = path.join(root, relativeRoot);
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillFilePath = path.join(dir, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillFilePath)) continue;
      const meta = parseSkillMeta(fs.readFileSync(skillFilePath, 'utf8'));
      found.push({ directory: entry.name, name: meta.name, description: meta.description, file: skillFilePath });
    }
  }
  return found;
}

function listAliasFiles() {
  const dir = path.join(ROOT, ALIAS_ROOT);
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    files.push(`${ALIAS_ROOT}/${entry.name}/SKILL.md`);
  }
  return files;
}

function diffAgainstDisk(plan) {
  const errors = [...plan.errors];
  const expected = new Set(plan.files.keys());
  for (const relativePath of listAliasFiles()) {
    if (!expected.has(relativePath)) errors.push(`多余的 Cursor 适配技能：${relativePath}`);
  }
  for (const [relativePath, content] of plan.files) {
    const full = path.join(ROOT, relativePath);
    if (!fs.existsSync(full)) {
      errors.push(`缺少 ${relativePath}`);
      continue;
    }
    const actual = fs.readFileSync(full, 'utf8');
    if (actual !== content) errors.push(`${relativePath} 与生成结果不一致，请运行 npm run cursor:sync`);
  }
  return errors;
}

function writePlan(plan) {
  for (const relativePath of listAliasFiles()) {
    if (!plan.files.has(relativePath)) fs.rmSync(path.join(ROOT, path.dirname(relativePath)), { recursive: true, force: true });
  }
  for (const [relativePath, content] of plan.files) {
    const full = path.join(ROOT, relativePath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
}

function moveDir(from, to) {
  try {
    fs.renameSync(from, to);
  } catch (error) {
    if (error.code !== 'EPERM' && error.code !== 'EXDEV') throw error;
    fs.cpSync(from, to, { recursive: true });
    fs.rmSync(from, { recursive: true, force: true });
  }
}

function installLocal(plan) {
  const dest = path.join(os.homedir(), '.cursor', 'plugins', 'local', 'mcu-workbench');
  const staging = `${dest}.staging`;
  const backup = `${dest}.bak`;
  fs.rmSync(staging, { recursive: true, force: true });
  fs.mkdirSync(staging, { recursive: true });
  for (const relativePath of INSTALL_COPY) {
    const source = path.join(ROOT, relativePath);
    if (!fs.existsSync(source)) throw new Error(`无法安装，缺少 ${relativePath}`);
    fs.cpSync(source, path.join(staging, relativePath), { recursive: true });
  }
  fs.rmSync(backup, { recursive: true, force: true });
  if (fs.existsSync(dest)) moveDir(dest, backup);
  moveDir(staging, dest);
  fs.rmSync(backup, { recursive: true, force: true });
  return { dest, discovered: discoverInstalledSkills(dest, plan.manifest.skills) };
}

function main() {
  const plan = buildPlan();
  const check = process.argv.includes('--check');
  const install = process.argv.includes('--install');
  const errors = check ? diffAgainstDisk(plan) : plan.errors;
  if (errors.length) {
    console.error(`Cursor 插件适配失败（${errors.length} 项）：`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  if (!check) writePlan(plan);
  const discovered = discoverInstalledSkills(ROOT, plan.manifest.skills);
  console.log(`Cursor 插件技能 ${discovered.length} 个，其中适配名 ${plan.aliases.length} 个。`);
  if (!install) return;
  const installed = installLocal(plan);
  console.log(`已安装到 ${installed.dest}，加载技能 ${installed.discovered.length} 个。`);
  console.log('请执行 Developer: Reload Window 后，在 Customize 中确认 mcu-workbench。');
}

if (require.main === module) main();

module.exports = {
  ALIAS_ROOT,
  CURSOR_NAME,
  DESCRIPTION_LIMIT,
  ROOT,
  buildPlan,
  cursorName,
  diffAgainstDisk,
  discoverInstalledSkills,
  installLocal,
  writePlan
};
