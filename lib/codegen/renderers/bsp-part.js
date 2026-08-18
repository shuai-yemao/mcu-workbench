const { generateBspDriver } = require('./impl-bsp-model-first');

const PART_MATCHERS = Object.freeze({
  model: (file) => file.path.includes('/03_Platform/platform_bsp/') || file.path.includes('03_Platform/platform_bsp/'),
  driver: (file) => file.path.includes('/04_Impl/impl_bsp/impl_bsp_hal_driver/') || file.path.includes('04_Impl/impl_bsp/impl_bsp_hal_driver/'),
  handle: (file) => file.path.includes('/04_Impl/impl_bsp/impl_bsp_handle/') || file.path.includes('04_Impl/impl_bsp/impl_bsp_handle/'),
  port: (file) => file.path.includes('/04_Impl/impl_bsp/impl_bsp_port/') || file.path.includes('04_Impl/impl_bsp/impl_bsp_port/')
});

function selectPart(files, part) {
  const matcher = PART_MATCHERS[part];
  if (!matcher) throw new Error(`Unknown BSP generation part: ${part}`);
  const selected = files.filter(matcher);
  Object.defineProperty(selected, 'manifest', {
    enumerable: false,
    value: {
      ...(files.manifest || {}),
      bspPart: part,
      generatedFiles: selected.map((file) => file.path)
    }
  });
  return selected;
}

async function generateBspPart(request, part) {
  return selectPart(await generateBspDriver(request), part);
}

module.exports = { generateBspPart, selectPart };
