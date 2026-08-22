const LAYER_NAMES = Object.freeze([
  'app',
  'service',
  'platform_common',
  'platform_mcu',
  'platform_os',
  'platform_bsp',
  'platform_middleware',
  'impl_mcu',
  'impl_os',
  'impl_bsp_driver',
  'impl_bsp_handle',
  'impl_bsp_port',
  'impl_board',
  'impl_middleware',
  'vendor',
  'build'
]);

const KIND_TO_RENDERER = Object.freeze({
  app: 'contract.app',
  service: 'contract.service',
  core: 'platform-mcu.core',
  bsp: 'impl-bsp.model-first',
  bsp_model: 'platform-bsp.model',
  bsp_driver: 'impl-bsp.driver',
  bsp_handle: 'impl-bsp.handle',
  bsp_port: 'impl-bsp.port',
  platform_common: 'platform-common.foundation',
  platform_os: 'contract.platform_os',
  platform_middleware: 'contract.platform_middleware',
  impl_mcu: 'contract.impl_mcu',
  impl_os: 'contract.impl_os',
  impl_middleware: 'contract.impl_middleware',
  vendor: 'contract.vendor',
  build: 'contract.build',
  impl_board: 'impl-board.composition'
});

const KIND_TO_LAYER = Object.freeze({
  app: 'app',
  service: 'service',
  core: 'platform_mcu',
  bsp: 'platform_bsp',
  bsp_model: 'platform_bsp',
  bsp_driver: 'impl_bsp_driver',
  bsp_handle: 'impl_bsp_handle',
  bsp_port: 'impl_bsp_port',
  platform_common: 'platform_common',
  platform_os: 'platform_os',
  platform_middleware: 'platform_middleware',
  impl_mcu: 'impl_mcu',
  impl_os: 'impl_os',
  impl_middleware: 'impl_middleware',
  vendor: 'vendor',
  build: 'build',
  impl_board: 'impl_board'
});

function fail(message) {
  const error = new Error(message);
  error.code = 'CODEGEN_REQUEST';
  throw error;
}

function normalizeLayers(value) {
  const values = value === undefined ? [] : Array.isArray(value) ? value : [value];
  const layers = [];
  for (const raw of values) {
    const layer = String(raw || '').trim().toLowerCase();
    if (!LAYER_NAMES.includes(layer)) fail(`Unsupported generation layer: ${raw}`);
    if (!layers.includes(layer)) layers.push(layer);
  }
  return layers;
}

function normalizeGenerationRequest(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    fail('A generation request object is required.');
  }

  const kind = String(request.kind || request.type || '').trim().toLowerCase();
  if (!KIND_TO_RENDERER[kind]) {
    fail(`Unsupported generation request kind: ${kind || '<empty>'}.`);
  }

  const requestedLayers = normalizeLayers(request.requestedLayers);
  const layer = KIND_TO_LAYER[kind];
  if (requestedLayers.length && !requestedLayers.includes(layer)) {
    fail(`${kind} generation must include the ${layer} layer.`);
  }

  return Object.freeze({
    ...request,
    kind,
    requestedLayers: requestedLayers.length ? requestedLayers : [layer],
    rendererId: request.rendererId || KIND_TO_RENDERER[kind]
  });
}

function normalizeGenerationRequests(request) {
  const requests = Array.isArray(request && request.requests)
    ? request.requests
    : Array.isArray(request && request.operations)
      ? request.operations
      : [request];
  if (!requests.length) fail('At least one generation request is required.');
  return requests.map(normalizeGenerationRequest);
}

module.exports = {
  KIND_TO_RENDERER,
  KIND_TO_LAYER,
  LAYER_NAMES,
  normalizeGenerationRequest,
  normalizeGenerationRequests
};
