const { createGenerationIr } = require('./generation-ir');
const { createArchitectureProfile } = require('./architecture-profile');
const { createLifecycleModel } = require('./lifecycle-model');
const { createResourceProfile } = require('./resource-profile');
const { listCapabilities } = require('./capabilities');
const { attachManifest, createBatchManifest, createManifest } = require('./manifest');
const { normalizeGenerationRequests } = require('./request-schema');
const {
  getRenderer,
  hasRenderer,
  listRenderers: listRegisteredRenderers,
  registerRenderer
} = require('./registry');
const platformMcuCoreRenderer = require('./renderers/platform-mcu-core');
const implBspModelFirstRenderer = require('./renderers/impl-bsp-model-first');
const platformBspModelRenderer = require('./renderers/platform-bsp-model');
const implBspDriverRenderer = require('./renderers/impl-bsp-driver');
const implBspHandleRenderer = require('./renderers/impl-bsp-handle');
const implBspPortRenderer = require('./renderers/impl-bsp-port');
const platformCommonFoundationRenderer = require('./renderers/platform-common-foundation');
const implBoardCompositionRenderer = require('./renderers/impl-board-composition');
const { createContractRenderers } = require('./contract-renderer');
const { hashGeneratedFiles, sortGeneratedFiles } = require('./deterministic');

function registerBuiltInRenderers() {
  for (const renderer of createContractRenderers()) {
    if (!hasRenderer(renderer.id)) registerRenderer(renderer);
  }
  if (!hasRenderer('platform-mcu.core')) {
    registerRenderer(platformMcuCoreRenderer);
  }
  if (!hasRenderer('impl-bsp.model-first')) {
    registerRenderer(implBspModelFirstRenderer);
  }
  if (!hasRenderer('platform-bsp.model')) {
    registerRenderer(platformBspModelRenderer);
  }
  if (!hasRenderer('impl-bsp.driver')) {
    registerRenderer(implBspDriverRenderer);
  }
  if (!hasRenderer('impl-bsp.handle')) {
    registerRenderer(implBspHandleRenderer);
  }
  if (!hasRenderer('impl-bsp.port')) {
    registerRenderer(implBspPortRenderer);
  }
  if (!hasRenderer('platform-common.foundation')) {
    registerRenderer(platformCommonFoundationRenderer);
  }
  if (!hasRenderer('impl-board.composition')) {
    registerRenderer(implBoardCompositionRenderer);
  }
}

async function generate(request) {
  registerBuiltInRenderers();
  const normalizedRequests = normalizeGenerationRequests(request);
  const outputFiles = [];
  const entries = [];
  const outputPaths = new Set();

  for (const normalized of normalizedRequests) {
    const renderer = getRenderer(normalized.rendererId);
    const profiles = {
      architecture: createArchitectureProfile({ requestedLayers: normalized.requestedLayers }),
      resources: createResourceProfile(normalized.resources || []),
      lifecycle: createLifecycleModel(normalized.lifecycleActions)
    };
    const ir = createGenerationIr(normalized, renderer, profiles);
    const files = await renderer.render(normalized, ir);
    if (!Array.isArray(files)) throw new Error(`Renderer ${renderer.id} must return a file array.`);
    const manifest = createManifest({
      request: normalized,
      renderer,
      ir,
      files,
      legacyManifest: files.manifest
    });
    for (const file of files) {
      if (outputPaths.has(file.path)) {
        const error = new Error(`Multiple renderers generated the same path: ${file.path}`);
        error.code = 'CODEGEN_OUTPUT_COLLISION';
        throw error;
      }
      outputPaths.add(file.path);
      outputFiles.push(file);
    }
    entries.push({ request: normalized, renderer, ir, manifest });
  }

  const orderedFiles = sortGeneratedFiles(outputFiles);
  const manifest = entries.length === 1
    ? {
      ...entries[0].manifest,
      generatedFiles: orderedFiles.map((file) => file.path),
      generatedFileHashes: hashGeneratedFiles(orderedFiles)
    }
    : createBatchManifest(entries, orderedFiles);
  return attachManifest(orderedFiles, manifest);
}

function listRenderers() {
  registerBuiltInRenderers();
  return listRegisteredRenderers();
}

module.exports = {
  generate,
  listCapabilities,
  listRenderers,
  registerRenderer
};
