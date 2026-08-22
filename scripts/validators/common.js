const fs = require('fs');
const path = require('path');
const { validateMarkdownFileLinks } = require('../../lib/skill-links');

const ROOT = path.resolve(__dirname, '..', '..');
// D11：新技能采用下划线命名（service_battery / vendor_stm32 等），兼容旧连字符 id。
const NAME_PATTERN = /^[a-z][a-z0-9]*(?:[-_][a-z0-9]+){1,3}$/;
const ABSOLUTE_PATH_PATTERN = /(?:\b[A-Za-z]:[\\/]|file:\/\/\/|\{USER_HOME\})/;

function readJson(relativePath, errors) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
  } catch (error) {
    errors.push(`${relativePath}: 无法读取 JSON：${error.message}`);
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
  void content;
  for (const finding of validateMarkdownFileLinks({
    filePath: skillFile,
    displayRoot: ROOT,
    boundaryRoot: ROOT
  })) {
    errors.push(`${finding.file}:${finding.line}: 本地链接不存在或越界：${finding.target}`);
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

module.exports = {
  ROOT,
  NAME_PATTERN,
  ABSOLUTE_PATH_PATTERN,
  readJson,
  getFrontmatter,
  getScalar,
  findSkillDirectories,
  findTextFiles,
  validateLocalMarkdownLinks,
  summarize
};
