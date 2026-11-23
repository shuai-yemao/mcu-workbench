const LAYER_DEPENDENCIES = Object.freeze({
  app: Object.freeze(['service']),
  service: Object.freeze(['platform_common', 'platform_bsp', 'platform_os']),
  platform_common: Object.freeze([]),
  platform_mcu: Object.freeze(['platform_common']),
  platform_os: Object.freeze(['platform_common']),
  platform_bsp: Object.freeze(['platform_common']),
  platform_middleware: Object.freeze(['platform_common']),
  impl_mcu: Object.freeze(['platform_mcu', 'vendor']),
  impl_os: Object.freeze(['platform_os']),
  impl_bsp_driver: Object.freeze(['platform_bsp', 'platform_mcu']),
  impl_bsp_handle: Object.freeze(['platform_bsp', 'impl_bsp_driver', 'platform_os']),
  impl_bsp_port: Object.freeze(['platform_bsp', 'impl_bsp_driver', 'impl_bsp_handle']),
  impl_board: Object.freeze(['impl_bsp_port', 'impl_mcu', 'impl_os']),
  impl_middleware: Object.freeze(['platform_middleware', 'vendor']),
  vendor: Object.freeze([]),
  build: Object.freeze([])
});

function createArchitectureProfile({ requestedLayers = [] } = {}) {
  const layers = [...new Set(requestedLayers.map((layer) => String(layer).trim().toLowerCase()))];
  const unknown = layers.filter((layer) => !Object.prototype.hasOwnProperty.call(LAYER_DEPENDENCIES, layer));
  if (unknown.length) throw new Error(`Unknown architecture layers: ${unknown.join(', ')}`);
  return {
    schemaVersion: 'architecture-profile-v1',
    layers,
    dependencies: Object.fromEntries(layers.map((layer) => [layer, [...LAYER_DEPENDENCIES[layer]]]))
  };
}

module.exports = { LAYER_DEPENDENCIES, createArchitectureProfile };
