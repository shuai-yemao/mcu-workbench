'use strict';

const fs = require('fs');
const path = require('path');
const { validateDescriptor } = require('../../../packages/contracts');
const { pluginSkills } = require('../../../skills/catalog');
const pluginRoot = path.resolve(__dirname, '..');
const descriptor = require('../descriptor.json');
const plugin = require('../plugin.json');
const packageMetadata = require('../package.json');

function validatePlugin() {
  const errors = [];
  if (plugin.id !== descriptor.id || packageMetadata.name !== descriptor.id) errors.push('plugin package IDs differ');
  if (plugin.version !== descriptor.version || packageMetadata.version !== descriptor.version) errors.push('plugin package versions differ');
  if (!validateDescriptor(descriptor).valid) errors.push(...validateDescriptor(descriptor).errors);
  const skills = pluginSkills('mcu-workbench-devops');
  if (!skills.length) errors.push('DevOps catalog has no plugin Skills');
  for (const skill of skills) {
    const skillFile = path.join(pluginRoot, 'skills', skill.id, 'SKILL.md');
    if (!fs.existsSync(skillFile)) errors.push(`missing plugin Skill: ${skill.id}`);
  }
  if (errors.length) return { valid: false, errors };
  return { valid: true, skillCount: skills.length };
}

if (require.main === module) {
  const result = validatePlugin();
  if (!result.valid) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
  } else console.log(`DevOps plugin validation passed: ${result.skillCount} Skills`);
}

module.exports = { validatePlugin };
