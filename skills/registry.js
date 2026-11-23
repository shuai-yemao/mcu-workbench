// Legacy Node API compatibility facade.
// All metadata and derived queries are implemented in catalog.js.
const {
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
} = require('./catalog');

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
