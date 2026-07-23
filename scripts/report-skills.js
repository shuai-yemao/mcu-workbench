#!/usr/bin/env node

const { SKILL_CATALOG, CANONICAL_SKILLS } = require('../skills/catalog');

function countBy(items, getKey) {
  return items.reduce((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

console.log(`# MCU-Workbench Skills 统计：${CANONICAL_SKILLS.length} 个 canonical，${SKILL_CATALOG.length} 个含兼容目录\n`);
console.log('## Canonical 入口\n');
for (const skill of CANONICAL_SKILLS) console.log(`- ${skill.id}: ${skill.description}`);
console.log('\n## 全部目录按层级\n');
for (const [layer, count] of Object.entries(countBy(SKILL_CATALOG, (skill) => skill.layer)).sort()) {
  console.log(`- ${layer}: ${count}`);
}
console.log('\n## 迁移入口\n');
console.log('| 旧名称 | 解析结果 |');
console.log('|---|---|');
for (const skill of SKILL_CATALOG.filter((entry) => !entry.canonical && entry.legacyId !== entry.id)) {
  console.log(`| ${skill.legacyId} | ${skill.id} |`);
}
