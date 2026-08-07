const fs = require('fs');
const path = require('path');
const { SKILL_CATALOG } = require('../../skills/catalog');
const {
  ROOT,
  NAME_PATTERN,
  ABSOLUTE_PATH_PATTERN,
  getFrontmatter,
  getScalar,
  findSkillDirectories,
  findTextFiles,
  validateLocalMarkdownLinks
} = require('./common');
const { validateClaudeManifestSkillPaths } = require('./manifest');

function validateSkillCatalogAndFilesystem(manifest, errors) {
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
    if (!skill.archived) expectedLayers.add(skill.layer);

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

  // D12/阶段 2 门禁：Platform 层只允许头文件与文档，禁止任何实现（.c / .cpp）。
  const platformRoot = path.join(ROOT, 'skills', 'platform');
  if (fs.existsSync(platformRoot)) {
    const implFiles = (function collect(dir, results) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) collect(full, results);
        else if (/\.(?:c|cpp)$/.test(entry.name)) results.push(full);
      }
      return results;
    })(platformRoot, []);
    for (const impl of implFiles) {
      errors.push(`Platform 层禁止实现文件：${path.relative(ROOT, impl)}（Platform 只定义接口）`);
    }
  }

  // D8/阶段 5 门禁：App 只调 Service——App 目录禁止 include Vendor / Impl / HAL 符号。
  const appRoot = path.join(ROOT, 'skills', 'app');
  if (fs.existsSync(appRoot)) {
    const appSkillFiles = (function collect(dir, results) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) collect(full, results);
        else if (/\.md$/.test(entry.name)) results.push(full);
      }
      return results;
    })(appRoot, []);
    const forbiddenAppPattern = /(?:^|[^A-Za-z_])(?:#include\s*[<"][^>"]+[>"]|HAL_[A-Za-z_]+|xTask[A-Za-z_]*|impl_[a-z_]+|vendor_[a-z_]+)/gm;
    for (const file of appSkillFiles) {
      const content = fs.readFileSync(file, 'utf8');
      // 剥离反引号代码引用、行内链接目标与禁止性描述行，只检查"正文实际调用"形态。
      const sanitized = content
        .replace(/`[^`]*`/g, '')          // 反引号代码 token
        .replace(/\[[^\]]*\]\([^)]*\)/g, '') // markdown 链接
        .split(/\r?\n/)
        .filter((line) => !/禁止|不得|不直接|不调用|不允许|only|forbid|ban|不 include|不引用/i.test(line))
        .join('\n');
      const matches = sanitized.match(forbiddenAppPattern) || [];
      if (matches.length) {
        errors.push(`App 层禁止底层依赖：${path.relative(ROOT, file)}（App 只调 Service；命中：${matches.slice(0, 3).map((m) => m.trim()).join(', ')}）`);
      }
    }
  }

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

  validateClaudeManifestSkillPaths(manifest, expectedLayers, errors);
}

module.exports = {
  validateSkillCatalogAndFilesystem
};
