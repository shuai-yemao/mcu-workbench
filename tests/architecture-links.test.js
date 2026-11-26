'use strict';

const fs = require('fs');
const path = require('path');
const { validateSkillLinks } = require('../lib/skill-links');

const pluginRoot = path.join(__dirname, '..', 'plugins', 'mcu-workbench-architecture');
const sharedManifest = path.join(pluginRoot, 'references', 'shared-sources.json');

describe('Architecture plugin link closure', () => {
  test('keeps every local Markdown link inside the self-contained package', () => {
    const result = validateSkillLinks({ root: pluginRoot, boundaryRoot: pluginRoot });
    expect(result.summary.errors).toBe(0);
  });

  test('records the complete generated shared-reference closure', () => {
    expect(fs.existsSync(sharedManifest)).toBe(true);
    if (!fs.existsSync(sharedManifest)) return;
    const manifest = JSON.parse(fs.readFileSync(sharedManifest, 'utf8'));
    expect(manifest.files).toHaveLength(88);
    for (const item of manifest.files) {
      expect(fs.existsSync(path.join(pluginRoot, item.packagePath))).toBe(true);
      expect(item.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(item.sourcePath.startsWith('skills/')).toBe(true);
      expect(typeof item.ownerPlugin).toBe('string');
      if (item.ownerPluginSourcePath) {
        expect(fs.existsSync(path.join(__dirname, '..', item.ownerPluginSourcePath))).toBe(true);
        expect(item.ownerPluginSha256).toMatch(/^[a-f0-9]{64}$/);
        expect(typeof item.ownerDiffersFromSnapshotSource).toBe('boolean');
      }
    }
  });

  test('exposes the shared-reference preparation command', () => {
    const packageMetadata = require('../plugins/mcu-workbench-architecture/package.json');
    expect(packageMetadata.scripts['prepare-links']).toBe('node scripts/prepare-skill-links.js');
  });
});
