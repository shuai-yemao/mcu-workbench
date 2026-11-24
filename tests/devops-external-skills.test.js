'use strict';

const fs = require('fs');
const path = require('path');

const pluginSkillsRoot = path.join(__dirname, '..', 'plugins', 'mcu-workbench-devops', 'skills');
const externalSkills = [
  'build-cmake', 'build-iar', 'build-idf', 'build-keil', 'build-makefile', 'build-platformio',
  'flash-idf', 'flash-jlink', 'flash-keil', 'flash-openocd', 'flash-platformio'
];

describe('DevOps external Skill inventory', () => {
  test.each(externalSkills)('%s has a plugin-owned Skill source', (skillId) => {
    expect(fs.existsSync(path.join(pluginSkillsRoot, skillId, 'SKILL.md'))).toBe(true);
  });
});
