const path = require('path');
const { generateBspDriver, generateSystemAdapter, writeGeneratedFiles } = require('../lib/generator');

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
  const result = {
    success: true,
    files: allFiles,
    peripheral: peripheral,
    platform: platform
  };

  if (options.write) {
    const outputDir = path.resolve(process.cwd(), options.output || '.');
    result.written = await writeGeneratedFiles(allFiles, outputDir);
  }

  if (!options.quiet) {
    const suffix = result.written ? ` into ${result.written.length} files` : '';
    console.log(`Generated ${allFiles.length} files for ${peripheral} driver${suffix}`);
  }

  return result;
}

module.exports = {
  name: 'mcu-driver',
  description: '生成外部设备驱动代码',
  options: [
    { name: '--peripheral', description: '外设名称', required: true },
    { name: '--platform', description: '目标平台', required: true },
    { name: '--write', description: '将生成文件写入输出目录', default: false },
    { name: '--output', description: '输出目录', default: '.' }
  ],
  handler: generateDriver
};

// 保留早期 Node 原型的可测试函数接口；Claude Code 不使用此导出。
module.exports.generateDriver = generateDriver;
