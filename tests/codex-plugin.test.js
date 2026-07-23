const fs = require('fs');
const path = require('path');
const { CANONICAL_SKILLS } = require('../skills/catalog');
const { validatePlugin } = require('../scripts/validate-plugin');

const ROOT = path.resolve(__dirname, '..');

describe('Codex plugin adapter', () => {
  test('provides a valid Codex manifest without Claude-only agent fields', () => {
    const manifestPath = path.join(ROOT, '.codex-plugin', 'plugin.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.name).toBe('mcu-workbench');
    expect(manifest.skills).toBe('./skills/');
    expect(manifest.interface.displayName).toBe('MCU-Workbench');
    expect(manifest).not.toHaveProperty('agents');
    expect(manifest).not.toHaveProperty('hooks');
    expect(manifest).not.toHaveProperty('mcpServers');
  });

  test('Codex manifest points to every canonical skill source', () => {
    for (const skill of CANONICAL_SKILLS) {
      expect(fs.existsSync(path.join(ROOT, skill.path, 'SKILL.md'))).toBe(true);
    }
  });

  test('shared plugin validation includes the Codex manifest', () => {
    const result = validatePlugin();
    expect(result.errors).toEqual([]);
    expect(result.summary.codexManifest).toBe(true);
  });
});
