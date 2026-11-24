'use strict';

const { validateDescriptor } = require('../packages/contracts');
const plugin = require('../plugins/mcu-workbench-devops').createDevopsPlugin();
const packageMetadata = require('../plugins/mcu-workbench-devops/package.json');
const { validatePlugin } = require('../plugins/mcu-workbench-devops/scripts/validate');
const hostManifests = [
  require('../plugins/mcu-workbench-devops/.codex-plugin/plugin.json'),
  require('../plugins/mcu-workbench-devops/.cursor-plugin/plugin.json')
];

describe('DevOps plugin package contract', () => {
  test('exposes a valid descriptor and canonical source Skill IDs', () => {
    expect(validateDescriptor(plugin.descriptor).valid).toBe(true);
    expect(plugin.descriptor.id).toBe('mcu-workbench-devops');
    expect(plugin.sourceSkills).toEqual([
      'tools-build', 'tools-linker', 'tools-flash', 'tools-git', 'tools-release'
    ]);
  });

  test('keeps package and Codex/Cursor manifest identity aligned', () => {
    expect(packageMetadata.name).toBe('mcu-workbench-devops');
    expect(hostManifests).toHaveLength(2);
    for (const manifest of hostManifests) {
      expect(manifest.name).toBe('mcu-workbench-devops');
      expect(manifest.skills).toContain('./skills/');
    }
  });

  test('provides a passing standalone plugin validator', () => {
    expect(validatePlugin()).toMatchObject({ valid: true, skillCount: 16 });
  });
});
