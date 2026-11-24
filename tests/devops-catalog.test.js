'use strict';

const { SKILL_BY_ID, PLUGIN_SKILL_IDS, pluginSkills, resolveSkillId } = require('../skills/catalog');
const rootPackage = require('../package.json');

const devopsSkills = [
  'tools-build', 'tools-linker', 'tools-flash', 'tools-git', 'tools-release',
  'build-cmake', 'build-iar', 'build-idf', 'build-keil', 'build-makefile', 'build-platformio',
  'flash-idf', 'flash-jlink', 'flash-keil', 'flash-openocd', 'flash-platformio'
];

describe('DevOps catalog ownership and compatibility', () => {
  test('registers each DevOps Skill once under the DevOps plugin', () => {
    expect(PLUGIN_SKILL_IDS['mcu-workbench-devops']).toEqual(devopsSkills);
    expect(pluginSkills('mcu-workbench-devops').map(({ id }) => id)).toEqual(devopsSkills);
  });

  test('resolves legacy tool names to existing canonical Skills', () => {
    expect(resolveSkillId('build-cmake')).toBe('tools-build');
    expect(resolveSkillId('flash-jlink')).toBe('tools-flash');
    expect(resolveSkillId('linker-scatter')).toBe('tools-linker');
    expect(SKILL_BY_ID['build-cmake'].path).toBe('skills/build-cmake');
    expect(pluginSkills('mcu-workbench-devops').find(({ id }) => id === 'build-cmake').pluginPath)
      .toBe('plugins/mcu-workbench-devops/skills/build-cmake');
  });

  test('exposes root compatibility commands for DevOps package validation and sync', () => {
    expect(rootPackage.scripts['validate:devops']).toBe('node plugins/mcu-workbench-devops/scripts/validate.js');
    expect(rootPackage.scripts['sync:devops-skills']).toBe('node plugins/mcu-workbench-devops/scripts/sync-skills.js');
  });
});
