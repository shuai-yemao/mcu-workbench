const fs = require('fs');
const path = require('path');
const { CANONICAL_SKILLS } = require('../skills/catalog');
const { validatePlugin } = require('../scripts/validate-plugin');
const { validateClaudeManifestSkillPaths } = require('../scripts/validators/manifest');

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

  test('Claude manifest validation rejects missing skill directories', () => {
    const errors = [];
    validateClaudeManifestSkillPaths(
      { skills: ['./skills/workflow/', './skills/not-real/'] },
      new Set(['workflow', 'not-real']),
      errors
    );
    expect(errors).toContain('manifest: skills 路径不存在 ./skills/not-real/');
  });
});
