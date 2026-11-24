'use strict';

const fs = require('fs');
const path = require('path');
const { validateDescriptor } = require('../../../packages/contracts');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const PLUGIN_ID = 'mcu-workbench-architecture';
const HOST_MANIFESTS = ['.codex-plugin/plugin.json', '.cursor-plugin/plugin.json'];

function readJson(relativePath, errors) {
  const filePath = path.join(PLUGIN_ROOT, relativePath);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`${relativePath}: ${error.message}`);
    return null;
  }
}

function skillRoots(manifest) {
  return Array.isArray(manifest.skills) ? manifest.skills : [manifest.skills];
}

function validateManifests() {
  const errors = [];
  const descriptor = readJson('descriptor.json', errors);
  const packageMetadata = readJson('package.json', errors);
  const pluginManifest = readJson('plugin.json', errors);
  const hostManifests = HOST_MANIFESTS.map((relativePath) => ({
    relativePath,
    manifest: readJson(relativePath, errors)
  }));

  if (descriptor && !validateDescriptor(descriptor).valid) {
    errors.push(...validateDescriptor(descriptor).errors);
  }
  for (const [label, value] of [
    ['package.json', packageMetadata], ['plugin.json', pluginManifest],
    ...hostManifests.map((item) => [item.relativePath, item.manifest])
  ]) {
    if (!value) continue;
    if ((value.name || value.id) !== PLUGIN_ID) errors.push(`${label}: plugin ID mismatch`);
    if (descriptor && value.version !== descriptor.version) errors.push(`${label}: version mismatch`);
  }
  for (const { relativePath, manifest } of hostManifests) {
    if (!manifest) continue;
    if (!skillRoots(manifest).includes('./skills/')) errors.push(`${relativePath}: missing ./skills/ root`);
  }
  if (packageMetadata && packageMetadata.name !== PLUGIN_ID) errors.push('package.json: package name mismatch');
  if (pluginManifest && pluginManifest.id !== PLUGIN_ID) errors.push('plugin.json: plugin ID mismatch');

  return { valid: errors.length === 0, errors };
}

if (require.main === module) {
  const result = validateManifests();
  if (!result.valid) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
  } else console.log('Architecture plugin manifests are valid.');
}

module.exports = { validateManifests };
