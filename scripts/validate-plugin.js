#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { SKILL_CATALOG } = require('../skills/catalog');

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
  return { count: catalog.length, countByLayer, countByPrefix };
}

function validatePlugin() {
  const errors = [];
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
    if (skill.legacyId === skill.id || ['embedded', 'devlog'].includes(skill.legacyId)) continue;
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

  return { errors, summary: summarize(SKILL_CATALOG) };
}

if (require.main === module) {
  const result = validatePlugin();
  if (result.errors.length) {
    console.error(`插件结构校验失败（${result.errors.length} 项）：`);
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(`插件结构校验通过：${result.summary.count} 个 skills，${Object.keys(result.summary.countByLayer).length} 个架构层。`);
    console.log(`按层级统计：${JSON.stringify(result.summary.countByLayer)}`);
    console.log(`按名称前缀统计：${JSON.stringify(result.summary.countByPrefix)}`);
  }
}

module.exports = { NAME_PATTERN, summarize, validatePlugin };
