const { hashGeneratedFiles } = require('./deterministic');

function createManifest({ request, renderer, ir, files, legacyManifest }) {
  return {
    schemaVersion: 'codegen-manifest-v1',
    generator: 'mcu-workbench-codegen',
    renderer: { id: renderer.id, version: renderer.version || '1' },
    kind: request.kind,
    requestedLayers: [...request.requestedLayers],
    generatedFiles: files.map((file) => file.path),
    generatedFileHashes: hashGeneratedFiles(files),
    ir: {
      schemaVersion: ir.schemaVersion,
      unresolved: [...ir.unresolved],
      profiles: ir.profiles
    },
    ...(legacyManifest || {}),
    unresolved: [
      ...new Set([
        ...(legacyManifest && Array.isArray(legacyManifest.unresolved) ? legacyManifest.unresolved : []),
        ...ir.unresolved
      ])
    ]
  };
}

function attachManifest(files, manifest) {
  if (Object.prototype.hasOwnProperty.call(files, 'manifest')) {
    Object.assign(files.manifest, manifest);
    return files;
  }
  Object.defineProperty(files, 'manifest', {
    enumerable: false,
    configurable: true,
    value: manifest
  });
  return files;
}

function createBatchManifest(entries, files) {
  return {
    schemaVersion: 'codegen-manifest-v1',
    generator: 'mcu-workbench-codegen',
    requestCount: entries.length,
    requests: entries.map((entry) => ({
      kind: entry.request.kind,
      requestedLayers: [...entry.request.requestedLayers],
      renderer: { id: entry.renderer.id, version: entry.renderer.version || '1' }
    })),
    generatedFiles: files.map((file) => file.path),
    generatedFileHashes: hashGeneratedFiles(files),
    unresolved: [...new Set(entries.flatMap((entry) => entry.manifest.unresolved || []))]
  };
}

module.exports = { attachManifest, createBatchManifest, createManifest };
