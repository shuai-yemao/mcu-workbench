const path = require('path');
const { generateCorePeripheral, writeGeneratedFiles } = require('../lib/generator');

async function generateCore(options) {
  const files = await generateCorePeripheral(options.peripheral, options.platform);
  const result = {
    success: true,
    files,
    peripheral: options.peripheral === 'iic' ? 'i2c' : options.peripheral,
    platform: options.platform
  };
  if (options.write) {
    const outputDir = path.resolve(process.cwd(), options.output || '.');
    result.written = await writeGeneratedFiles(files, outputDir, { force: Boolean(options.force) });
  }
  return result;
}

module.exports = {
  name: 'mcu-core',
  description: '生成 MCU Core 外设抽象代码',
  options: [
    { name: '--peripheral', description: 'Core 外设（iic 是 i2c 输入别名）', required: true },
    { name: '--platform', description: '目标平台', required: true },
    { name: '--write', description: '将生成文件写入输出目录', default: false },
    { name: '--force', description: '允许覆盖已存在的生成文件', default: false },
    { name: '--output', description: '输出目录', default: '.' }
  ],
  handler: generateCore,
  generateCore
};
