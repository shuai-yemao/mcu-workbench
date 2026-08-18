function createGenerationIr(request, renderer, profiles = {}) {
  return Object.freeze({
    schemaVersion: 'generation-ir-v1',
    kind: request.kind,
    requestedLayers: [...request.requestedLayers],
    renderer: {
      id: renderer.id,
      layer: renderer.layer,
      version: renderer.version || '1'
    },
    inputs: Object.freeze({
      platform: request.platform,
      peripheral: request.peripheral,
      device: request.device,
      deviceType: request.deviceType,
      cores: request.cores
    }),
    profiles: Object.freeze({
      architecture: profiles.architecture || null,
      resources: profiles.resources || null,
      lifecycle: profiles.lifecycle || null
    }),
    unresolved: []
  });
}

module.exports = { createGenerationIr };
