'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const ids = [
  'mcu-workbench-architecture', 'mcu-workbench-devops',
  'mcu-workbench-observability', 'mcu-workbench-verification', 'mcu-workbench-workflow'
];

describe('MCU Workbench host marketplace registration', () => {
  test('registers independent plugins in Codex and Cursor marketplaces', () => {
    const codex = JSON.parse(fs.readFileSync(path.join(root, '.agents/plugins/marketplace.json'), 'utf8'));
    const cursor = JSON.parse(fs.readFileSync(path.join(root, '.cursor-plugin/marketplace.json'), 'utf8'));
    expect(codex.plugins.map((item) => item.name)).toEqual(ids);
    expect(cursor.plugins.map((item) => item.name)).toEqual(ids);
    for (const id of ids) {
      const pluginRoot = path.join(root, 'plugins', id);
      expect(fs.existsSync(path.join(pluginRoot, '.codex-plugin/plugin.json'))).toBe(true);
      expect(fs.existsSync(path.join(pluginRoot, '.cursor-plugin/plugin.json'))).toBe(true);
      const codexEntry = codex.plugins.find((item) => item.name === id);
      const cursorEntry = cursor.plugins.find((item) => item.name === id);
      expect(path.resolve(root, codexEntry.source.path)).toBe(pluginRoot);
      expect(path.resolve(root, cursorEntry.source)).toBe(pluginRoot);
    }
  });
});
