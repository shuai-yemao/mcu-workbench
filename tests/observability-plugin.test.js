const fs = require('fs');
const path = require('path');
const { pluginSkills } = require('../skills/catalog');
const { pluginDomainSkills } = require('../lib/agent-domains');
const { descriptor, createObservabilityPlugin } = require('../plugins/mcu-workbench-observability');

const ROOT = path.resolve(__dirname, '..');

describe('observability plugin projection', () => {
  test('projects canonical and external skills to the physical plugin directory', () => {
    const skills = pluginSkills('mcu-workbench-observability');
    expect(skills.map((skill) => skill.id)).toEqual(expect.arrayContaining([
      'tools-debug',
      'tools-observability',
      'debug-gdb-openocd',
      'serial-monitor',
      'can-debug',
      'modbus-debug',
      'visa-debug'
    ]));
    for (const skill of skills) {
      expect(fs.existsSync(path.join(ROOT, skill.pluginPath, 'SKILL.md'))).toBe(true);
    }
  });

  test('derives the observability plugin skill ids without changing legacy routing', () => {
    expect(pluginDomainSkills('mcu-workbench-observability')).toEqual(
      expect.arrayContaining(['tools-debug', 'tools-observability', 'serial-shell'])
    );
  });

  test('validates descriptor and supports idempotent disposal', () => {
    expect(descriptor.id).toBe('mcu-workbench-observability');
    const plugin = createObservabilityPlugin();
    plugin.dispose();
    plugin.dispose();
    expect(plugin.disposed).toBe(true);
  });
});
