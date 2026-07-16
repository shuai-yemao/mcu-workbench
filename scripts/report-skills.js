#!/usr/bin/env node

const { SKILL_CATALOG } = require('../skills/catalog');

function countBy(getKey) {
  return SKILL_CATALOG.reduce((counts, skill) => {
    const key = getKey(skill);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

console.log(`# MCU-Workbench Skills 统计（${SKILL_CATALOG.length} 项）\n`);
console.log('## 架构层统计\n');
for (const [layer, count] of Object.entries(countBy((skill) => skill.layer)).sort()) {
  console.log(`- ${layer}: ${count}`);
}
console.log('\n## 命名前缀统计\n');
for (const [prefix, count] of Object.entries(countBy((skill) => skill.id.split('-')[0])).sort()) {
  console.log(`- ${prefix}: ${count}`);
}
console.log('\n## 旧名迁移\n');
console.log('| 旧名 | 新名 | 架构层 |');
console.log('|---|---|---|');
for (const skill of SKILL_CATALOG) {
  console.log(`| ${skill.legacyId} | ${skill.id} | ${skill.layer} |`);
}
