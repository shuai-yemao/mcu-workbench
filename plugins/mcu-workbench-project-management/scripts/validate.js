'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const required = ['descriptor.json', 'plugin.json', 'skill-map.json', 'index.js', '.codex-plugin/plugin.json', '.cursor-plugin/plugin.json'];
const missing = required.filter(file => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error(`Missing project-management plugin files: ${missing.join(', ')}`);
  process.exit(1);
}
const map = JSON.parse(fs.readFileSync(path.join(root, 'skill-map.json'), 'utf8'));
if (map.plugin !== 'mcu-workbench-project-management' || !Array.isArray(map.skills)) process.exit(1);
for (const skill of map.skills) {
  const skillPath = path.join(root, 'skills', skill.id === 'embedded-team-sync' ? 'embedded-team-sync' : 'workflow-document-context', 'SKILL.md');
  if (!fs.existsSync(skillPath)) throw new Error(`Missing skill source: ${skill.id}`);
}
console.log('Project-management plugin skeleton is valid.');
