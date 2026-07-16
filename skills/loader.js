const fs = require('fs');
const path = require('path');
const { SKILL_CATALOG, resolveSkillId } = require('./catalog');

const PLUGIN_ROOT = path.resolve(__dirname, '..');

function getSkillFile(skill) {
  return path.join(PLUGIN_ROOT, skill.path, 'SKILL.md');
}

function parseSkillMeta(content) {
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) return {};

  const field = (key) => {
    const match = frontmatter[1].match(new RegExp(`^${key}:[ \\t]*([^\\r\\n]+)`, 'm'));
    return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : '';
  };

  return { name: field('name'), description: field('description') };
}

function loadSkillsFromPlugin() {
  return Object.fromEntries(SKILL_CATALOG.map((skill) => {
    const skillFile = getSkillFile(skill);
    if (!fs.existsSync(skillFile)) return [skill.id, null];

    const content = fs.readFileSync(skillFile, 'utf8');
    const meta = parseSkillMeta(content);
    return [skill.id, {
      name: meta.name || skill.id,
      description: meta.description || skill.description,
      path: path.dirname(skillFile),
      content,
      category: skill.layer,
      legacyName: skill.legacyId
    }];
  }).filter(([, skill]) => skill));
}

function getSkillContent(skillName) {
  const resolved = resolveSkillId(skillName);
  if (!resolved) return null;
  const skill = SKILL_CATALOG.find((entry) => entry.id === resolved);
  const skillFile = getSkillFile(skill);
  return fs.existsSync(skillFile) ? fs.readFileSync(skillFile, 'utf8') : null;
}

function listAvailableSkills() {
  return SKILL_CATALOG.map((skill) => skill.id);
}

module.exports = {
  getSkillContent,
  listAvailableSkills,
  loadSkillsFromPlugin,
  parseSkillMeta
};
