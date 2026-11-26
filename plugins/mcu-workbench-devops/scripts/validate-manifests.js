'use strict';

const { validateDescriptor } = require('../../../packages/contracts');
const descriptor = require('../descriptor.json');
const packageMetadata = require('../package.json');
const plugin = require('../plugin.json');
const codex = require('../.codex-plugin/plugin.json');
const cursor = require('../.cursor-plugin/plugin.json');

function validateManifests() {
  const errors = [];
  const checked = validateDescriptor(descriptor);
  if (!checked.valid) errors.push(...checked.errors);
  for (const [name, manifest] of Object.entries({ plugin, codex, cursor })) {
    if (manifest.id && manifest.id !== descriptor.id) errors.push(`${name} ID differs`);
    if (manifest.name && manifest.name !== descriptor.id) errors.push(`${name} name differs`);
    if (manifest.version !== descriptor.version) errors.push(`${name} version differs`);
  }
  if (packageMetadata.name !== descriptor.id || packageMetadata.version !== descriptor.version) {
    errors.push('package metadata identity differs');
  }
  if (JSON.stringify(plugin.hosts) !== JSON.stringify(['codex', 'cursor'])) errors.push('host list differs from approved MVP');
  for (const [name, manifest] of Object.entries({ plugin, codex, cursor })) {
    if (!manifest.skills) errors.push(`${name} has no skills root`);
  }
  return { valid: errors.length === 0, errors };
}

if (require.main === module) {
  const result = validateManifests();
  if (!result.valid) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
  } else console.log('DevOps manifests validated: package, plugin, Codex, Cursor');
}

module.exports = { validateManifests };
