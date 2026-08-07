/**
 * 技能查询视图层（Legacy Node API compatibility facade）。
 *
 * 职责边界：
 * - `catalog.js` 是唯一元数据事实源（目录、别名、迁移映射、ID 解析）；
 * - `registry.js` 在 catalog 事实之上派生查询视图（`SKILLS` 及 `get*` 查询函数），
 *   并转发 catalog 的事实导出以维持旧 Node API 兼容；
 * - `loader.js` 负责从磁盘加载 SKILL.md 内容。
 *
 * 新增或修改技能元数据只允许落在 `catalog-metadata.js` / `catalog.js`，
 * registry.js 不持有任何数据定义。
 */
const {
  SKILL_CATALOG,
  MIGRATION_MAP,
  SKILL_BY_ID,
  SKILL_BY_LEGACY_ID,
  resolveSkillId
} = require('./catalog');

const SKILLS = Object.fromEntries(SKILL_CATALOG.map((skill) => [skill.id, {
  name: skill.id,
  description: skill.description,
  category: skill.layer,
  platforms: ['all'],
  legacyName: skill.legacyId,
  aliases: skill.aliases || [],
  canonical: Boolean(skill.canonical),
  archived: Boolean(skill.archived)
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
  const aliases = {};
  for (const skill of SKILL_CATALOG) {
    const target = resolveSkillId(skill.id) || skill.id;
    if (skill.legacyId && skill.legacyId !== target) aliases[skill.legacyId] = target;
    for (const alias of skill.aliases || []) aliases[alias] = target;
  }
  for (const [alias, target] of Object.entries(MIGRATION_MAP)) aliases[alias] = target;
  return aliases;
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
