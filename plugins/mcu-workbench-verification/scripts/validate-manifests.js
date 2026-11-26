'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const expected = ['.codex-plugin/plugin.json', '.cursor-plugin/plugin.json'];
const errors = [];
for (const relative of expected) {
  const file = path.join(root, relative);
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (manifest.name !== 'mcu-workbench-verification') errors.push(relative + ': plugin name mismatch');
  if (!manifest.version) errors.push(relative + ': missing version');
  if (!manifest.skills) errors.push(relative + ': missing skills entry');
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log('Codex and Cursor manifests are structurally valid.');
