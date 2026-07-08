const { generateBspDriver, generateSystemAdapter } = require('../lib/generator');

async function generateDriver(options) {
  const { peripheral, platform } = options;

  if (!peripheral) {
    throw new Error('Peripheral is required');
  }

  if (!platform) {
    throw new Error('Platform is required');
  }

  const bspFiles = await generateBspDriver(peripheral, platform);
  const systemFiles = await generateSystemAdapter(platform);

  const allFiles = [...bspFiles, ...systemFiles];

  console.log(`Generated ${allFiles.length} files for ${peripheral} driver`);

  return {
    success: true,
    files: allFiles,
    peripheral: peripheral,
    platform: platform
  };
}

module.exports = {
  name: 'mcu-driver',
  description: '生成外部设备驱动代码',
  options: [
    { name: '--peripheral', description: '外设名称', required: true },
    { name: '--platform', description: '目标平台', required: true }
  ],
  handler: generateDriver
};
