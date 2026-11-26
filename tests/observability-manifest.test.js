const fs = require('fs');
const path = require('path');
const { validateObservabilityPlugin } = require('../scripts/validate-observability-plugin');

const ROOT = path.resolve(__dirname, '..');

describe('observability plugin manifests', () => {
  test('validates the independent plugin package', () => {
    const result = validateObservabilityPlugin();
    expect(result.errors).toEqual([]);
  });

  test('registers the three content-reviewed external observation Skills', () => {
    const plugin = require('../plugins/mcu-workbench-observability/external-skills.json');
    expect(plugin.entries.map((entry) => entry.id)).toEqual(expect.arrayContaining(['can-debug', 'modbus-debug', 'visa-debug']));
    expect(plugin.entries).toHaveLength(10);
  });

  test('declares separate Codex and Cursor surfaces', () => {
    const codex = JSON.parse(fs.readFileSync(path.join(ROOT, 'plugins/mcu-workbench-observability/.codex-plugin/plugin.json'), 'utf8'));
    const cursor = JSON.parse(fs.readFileSync(path.join(ROOT, 'plugins/mcu-workbench-observability/.cursor-plugin/plugin.json'), 'utf8'));
    expect(codex.name).toBe('mcu-workbench-observability');
    expect(cursor.name).toBe('mcu-workbench-observability');
    expect(codex.skills).toBe('./skills/');
    expect(cursor.skills).toEqual(['./skills/']);
  });
});
