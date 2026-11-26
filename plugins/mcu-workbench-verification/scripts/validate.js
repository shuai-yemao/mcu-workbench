'use strict';

const fs = require('fs');
const path = require('path');
const { validateDescriptor } = require('../../../packages/contracts');
const plugin = require('../plugin.json');
const descriptor = require('../descriptor.json');
const skills = require('../index').createVerificationPlugin().sourceSkills;
const root = path.resolve(__dirname, '../../..');
const errors = [];
if (plugin.id !== descriptor.id) errors.push('plugin and descriptor ids differ');
if (plugin.version !== descriptor.version) errors.push('plugin and descriptor versions differ');
const checked = validateDescriptor(descriptor);
if (!checked.valid) errors.push(...checked.errors);
for (const id of skills) {
  const file = path.join(root, 'plugins/mcu-workbench-verification/skills', id, 'SKILL.md');
  if (!fs.existsSync(file)) errors.push('missing plugin Skill: ' + id);
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log('verification plugin validation passed: ' + skills.length + ' Skills');

