'use strict';

const fs = require('fs');
const path = require('path');

const pluginRoot = path.join(__dirname, '..', 'plugins', 'mcu-workbench-architecture');
const validatorPath = path.join(pluginRoot, 'scripts', 'validate-manifests.js');

describe('Architecture plugin manifests', () => {
  test('keeps package, descriptor, Codex, and Cursor identity/version aligned', () => {
    const descriptor = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'descriptor.json'), 'utf8'));
    const packageMetadata = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'package.json'), 'utf8'));
    const manifests = [
      '.codex-plugin/plugin.json',
      '.cursor-plugin/plugin.json'
    ].map((relative) => JSON.parse(fs.readFileSync(path.join(pluginRoot, relative), 'utf8')));

    expect(descriptor.id).toBe('mcu-workbench-architecture');
    expect(packageMetadata.name).toBe(descriptor.id);
    expect(packageMetadata.version).toBe(descriptor.version);
    for (const manifest of manifests) {
      expect(manifest.name).toBe(descriptor.id);
      expect(manifest.version).toBe(descriptor.version);
      expect(Array.isArray(manifest.skills) ? manifest.skills : [manifest.skills]).toContain('./skills/');
    }
  });

  test('provides an independently runnable manifest validator', () => {
    expect(fs.existsSync(validatorPath)).toBe(true);
    if (!fs.existsSync(validatorPath)) return;
    const { validateManifests } = require('../plugins/mcu-workbench-architecture/scripts/validate-manifests');
    expect(validateManifests()).toMatchObject({ valid: true, errors: [] });
  });
});
