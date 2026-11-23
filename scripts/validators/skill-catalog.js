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
