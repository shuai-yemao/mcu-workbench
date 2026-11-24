'use strict';

const fs = require('fs');
const path = require('path');
const { pluginSkills } = require('../../../skills/catalog');
const { validateManifests } = require('./validate-manifests');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const EXPECTED_SKILL_COUNT = 39;

function validateArchitecturePlugin() {
  const errors = [...validateManifests().errors];
  const skills = pluginSkills('mcu-workbench-architecture');
  if (skills.length !== EXPECTED_SKILL_COUNT) {
    errors.push(`expected ${EXPECTED_SKILL_COUNT} registered Skills, found ${skills.length}`);
  }
  for (const skill of skills) {
    const skillFile = path.join(PLUGIN_ROOT, 'skills', skill.id, 'SKILL.md');
    if (!fs.existsSync(skillFile)) errors.push(`missing plugin Skill: ${skill.id}`);
  }
  return { valid: errors.length === 0, skillCount: skills.length, errors };
}

if (require.main === module) {
  const result = validateArchitecturePlugin();
  if (!result.valid) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
  } else console.log(`Architecture plugin validation passed: ${result.skillCount} Skills`);
}

module.exports = { validateArchitecturePlugin };
