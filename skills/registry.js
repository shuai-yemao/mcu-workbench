const {
  SKILL_CATALOG,
  SKILL_BY_ID,
  SKILL_BY_LEGACY_ID,
  resolveSkillId
} = require('./catalog');

/**
 * 兼容旧调用方的对象式 registry。catalog 是唯一可编辑的事实源。
 */
const SKILLS = Object.fromEntries(SKILL_CATALOG.map((skill) => [skill.id, {
  name: skill.id,
  description: skill.description,
  category: skill.layer,
  platforms: ['all'],
  legacyName: skill.legacyId
}]));

function getAllSkills() {
  return { ...SKILLS };
}

function getSkillsByCategory(category) {
  return Object.fromEntries(
    Object.entries(SKILLS).filter(([, skill]) => skill.category === category)
  );
}

function getSkillsByPlatform(platform) {
  return Object.fromEntries(
    Object.entries(SKILLS).filter(([, skill]) =>
      skill.platforms.includes(platform) || skill.platforms.includes('all')
    )
  );
}

function listSkillNames() {
  return Object.keys(SKILLS);
}

function getSkillAliases() {
  return Object.fromEntries(SKILL_CATALOG.map((skill) => [skill.legacyId, skill.id]));
}

module.exports = {
  SKILLS,
  SKILL_CATALOG,
  SKILL_BY_ID,
  SKILL_BY_LEGACY_ID,
  getAllSkills,
  getSkillsByCategory,
  getSkillsByPlatform,
  getSkillAliases,
  listSkillNames,
  resolveSkillId
};
