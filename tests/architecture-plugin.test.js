'use strict';

const fs = require('fs');
const path = require('path');
const { validateDescriptor } = require('../packages/contracts');

const pluginRoot = path.join(__dirname, '..', 'plugins', 'mcu-workbench-architecture');
const descriptorPath = path.join(pluginRoot, 'descriptor.json');
const packagePath = path.join(pluginRoot, 'package.json');
const validatorPath = path.join(pluginRoot, 'scripts', 'validate.js');
const hostManifestPaths = [
  path.join(pluginRoot, '.codex-plugin', 'plugin.json'),
  path.join(pluginRoot, '.cursor-plugin', 'plugin.json')
];

describe('Architecture plugin package contract', () => {
  test('provides descriptor, package metadata, and a standalone validator', () => {
    expect(fs.existsSync(descriptorPath)).toBe(true);
    expect(fs.existsSync(packagePath)).toBe(true);
    expect(fs.existsSync(validatorPath)).toBe(true);
    if (![descriptorPath, packagePath, validatorPath].every(fs.existsSync)) return;

    const descriptor = JSON.parse(fs.readFileSync(descriptorPath, 'utf8'));
    const packageMetadata = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    expect(validateDescriptor(descriptor).valid).toBe(true);
    expect(descriptor.id).toBe('mcu-workbench-architecture');
    expect(packageMetadata.name).toBe(descriptor.id);
    expect(packageMetadata.version).toBe(descriptor.version);
  });

  test('declares the same Skill root for Codex and Cursor', () => {
    for (const manifestPath of hostManifestPaths) expect(fs.existsSync(manifestPath)).toBe(true);
    if (!hostManifestPaths.every(fs.existsSync)) return;

    const manifests = hostManifestPaths.map((filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8')));
    for (const manifest of manifests) {
      expect(manifest.name).toBe('mcu-workbench-architecture');
      expect(Array.isArray(manifest.skills) ? manifest.skills : [manifest.skills]).toContain('./skills/');
    }
  });
});
