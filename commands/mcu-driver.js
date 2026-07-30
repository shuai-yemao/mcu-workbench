const path = require('path');
const { createError, generateBspDriver, writeGeneratedFiles } = require('../lib/generator');

function rejectLegacyPeripheral(options) {
  if (options.peripheral !== undefined) {
    throw createError(
      'MCUWB_E_DEPRECATED_PERIPHERAL: --peripheral is no longer supported. Use: mcu-workbench driver --device-type externflash --device W25Q64 --core spi --platform stm32f4'
    );
  }
}

async function generateDriver(options) {
  rejectLegacyPeripheral(options);
  const files = await generateBspDriver({
    deviceType: options.deviceType,
    device: options.device,
    cores: options.core,
    platform: options.platform,
    allowCustomDevice: Boolean(options.allowCustomDevice)
  });
  const result = {
    success: true,
    files,
    deviceType: options.deviceType,
    device: options.device,
    cores: Array.isArray(options.core) ? options.core : [options.core],
    platform: options.platform
  };
  if (options.write) {
    const outputDir = path.resolve(process.cwd(), options.output || '.');
    result.written = await writeGeneratedFiles(files, outputDir, { force: Boolean(options.force) });
  }
  return result;
}

module.exports = {
  name: 'mcu-driver',
  description: '生成分层 BSP Driver、Handle、Port 和 Wrapper 代码',
  options: [
    { name: '--device-type', description: '设备类别，例如 externflash', required: true },
    { name: '--device', description: '设备型号，例如 W25Q64', required: true },
    { name: '--core', description: '依赖的 Core 外设；可重复，iic 是 i2c 输入别名', required: true, repeatable: true },
    { name: '--platform', description: '目标平台', required: true },
    { name: '--allow-custom-device', description: '允许未内置设备配置', default: false },
    { name: '--write', description: '将生成文件写入输出目录', default: false },
    { name: '--force', description: '允许覆盖已存在的生成文件', default: false },
    { name: '--output', description: '输出目录', default: '.' }
  ],
  handler: generateDriver,
  generateDriver,
  rejectLegacyPeripheral
};
