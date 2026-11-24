'use strict';

const fs = require('fs');
const path = require('path');

const pluginSkillsRoot = path.join(__dirname, '..', 'plugins', 'mcu-workbench-devops', 'skills');
const canonicalSkills = ['tools-build', 'tools-linker', 'tools-flash', 'tools-git', 'tools-release'];

describe('DevOps canonical Skill source inventory', () => {
  test.each(canonicalSkills)('%s has a canonical plugin-owned SKILL.md', (skillId) => {
    expect(fs.existsSync(path.join(pluginSkillsRoot, skillId, 'SKILL.md'))).toBe(true);
  });
});
