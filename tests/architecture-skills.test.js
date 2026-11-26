'use strict';

const fs = require('fs');
const path = require('path');
const { pluginSkills } = require('../skills/catalog');

const expectedIds = [
  'app-architecture',
  'platform_mcu', 'platform_os', 'platform_bsp', 'platform_common', 'platform_middleware',
  'impl_os', 'impl_mcu', 'impl_board', 'impl_bsp', 'impl_middleware',
  'service_system', 'service_battery', 'service_backlight', 'service_calendar', 'service_diagnosis',
  'service_log', 'service_ota', 'service_power', 'service_sensor', 'service_storage', 'service_watchdog',
  'vendor_mcu', 'vendor_rtos', 'vendor_lvgl', 'vendor_stack', 'vendor_fatfs', 'vendor_fal',
  'vendor_flashdb', 'vendor_letter_shell', 'vendor_algorithm',
  'chip-driver-manual', 'chip-resource-finder', 'embedded-architecture-planner',
  'embedded-coding-standard', 'embedded-minimal-project-builder', 'embedded-prd-to-logic',
  'prd-to-hardware-solution', 'schematic-pinmap-analyzer', 'embedded-project-scaffold',
  'parsed-chip-datasheet', 'vendor-minimal-firmware'
];

describe('Architecture plugin Skill ownership', () => {
  test('includes a source map for all package Skills and their compatibility paths', () => {
    const mapPath = path.join(__dirname, '..', 'plugins', 'mcu-workbench-architecture', 'skill-map.json');
    expect(fs.existsSync(mapPath)).toBe(true);
    if (!fs.existsSync(mapPath)) return;
    const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    expect(map.plugin).toBe('mcu-workbench-architecture');
    expect(map.skills.map(({ id }) => id).sort()).toEqual([...expectedIds].sort());
    expect(map.skills.every(({ sourcePath, pluginPath, projectionPath }) =>
      sourcePath.startsWith('plugins/mcu-workbench-architecture/skills/')
      && pluginPath.startsWith('plugins/mcu-workbench-architecture/skills/')
      && projectionPath.startsWith('skills/'))).toBe(true);
  });

  test('stores all selected Skill sources inside the architecture package', () => {
    const pluginRoot = path.join(__dirname, '..', 'plugins', 'mcu-workbench-architecture', 'skills');
    const missing = expectedIds.filter((id) => !fs.existsSync(path.join(pluginRoot, id, 'SKILL.md')));
    expect(missing).toEqual([]);
  });

  test('registers exactly the 31 canonical and 11 matrix-owned Skills', () => {
    const skills = pluginSkills('mcu-workbench-architecture');
    expect(skills.map(({ id }) => id).sort()).toEqual([...expectedIds].sort());
    expect(new Set(skills.map(({ id }) => id)).size).toBe(42);
  });

  test('contains every registered Skill source inside the architecture plugin', () => {
    const pluginRoot = path.join(__dirname, '..', 'plugins', 'mcu-workbench-architecture', 'skills');
    const skills = pluginSkills('mcu-workbench-architecture');
    for (const skill of skills) {
      const sourcePath = path.join(pluginRoot, skill.id, 'SKILL.md');
      expect(fs.existsSync(sourcePath)).toBe(true);
    }
  });
});
