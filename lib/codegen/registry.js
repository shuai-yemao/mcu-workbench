const RENDERERS = new Map();

function assertRendererId(id) {
  if (!/^[a-z][a-z0-9._-]*$/.test(id)) {
    throw new TypeError(`Invalid codegen renderer id: ${id}`);
  }
}

function registerRenderer(renderer) {
  if (!renderer || typeof renderer !== 'object') {
    throw new TypeError('A codegen renderer descriptor is required.');
  }
  const { id, layer, render } = renderer;
  assertRendererId(id);
  if (!/^[a-z][a-z0-9_-]*$/.test(layer)) {
    throw new TypeError(`Invalid codegen renderer layer: ${layer}`);
  }
  if (typeof render !== 'function') {
    throw new TypeError(`Codegen renderer ${id} must provide a render function.`);
  }
  if (RENDERERS.has(id)) {
    throw new Error(`Codegen renderer already registered: ${id}`);
  }
  const descriptor = Object.freeze({ ...renderer });
  RENDERERS.set(id, descriptor);
  return descriptor;
}

function getRenderer(id) {
  const renderer = RENDERERS.get(id);
  if (!renderer) throw new Error(`Unknown codegen renderer: ${id}`);
  return renderer;
}

function hasRenderer(id) {
  return RENDERERS.has(id);
}

function listRenderers() {
  return [...RENDERERS.values()].map((renderer) => ({ ...renderer, render: undefined }));
}

module.exports = {
  getRenderer,
  hasRenderer,
  listRenderers,
  registerRenderer
};
