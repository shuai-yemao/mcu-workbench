const { getPlatformConfig } = require('../lib/platform');

async function startDebug(options) {
  const { device, platform } = options;
  const gdbPort = Number(options.gdbPort === undefined ? 3333 : options.gdbPort);

  if (!device) {
    throw new Error('Debug device is required');
  }

  if (!platform) {
    throw new Error('Platform is required');
  }
  if (!/^[a-z0-9_-]+$/i.test(device)) {
    throw new Error('Debug device must contain only letters, numbers, hyphens, or underscores');
  }
  if (!Number.isInteger(Number(gdbPort)) || Number(gdbPort) < 1 || Number(gdbPort) > 65535) {
    throw new Error('GDB port must be an integer between 1 and 65535');
  }

  const config = getPlatformConfig(platform);

  const openocdCmd = `openocd -f interface/${device}.cfg -f target/${config.openOcdTarget}.cfg`;
  const gdbCmd = `arm-none-eabi-gdb build/firmware.elf -ex "target remote :${gdbPort}"`;

  if (!options.quiet) {
    console.log(`Starting debug session...`);
    console.log(`OpenOCD: ${openocdCmd}`);
    console.log(`GDB: ${gdbCmd}`);
  }

  return {
    success: true,
    openocdCommand: openocdCmd,
    gdbCommand: gdbCmd,
    port: gdbPort
  };
}

async function startMonitor(options) {
  const port = options.port === undefined ? 'COM3' : options.port;
  const baudRate = Number(options.baudRate === undefined ? 115200 : options.baudRate);

  if (!options.quiet) {
    console.log(`Starting serial monitor on ${port} @ ${baudRate}...`);
  }

  return {
    success: true,
    port: port,
    baudRate: baudRate
  };
}

module.exports = {
  name: 'mcu-debug',
  description: '启动调试会话',
  options: [
    { name: '--device', description: '调试设备', required: true },
    { name: '--platform', description: '目标平台', required: true },
    { name: '--gdb-port', description: 'GDB 端口', default: 3333 }
  ],
  handler: startDebug
};

module.exports.monitor = {
  name: 'mcu-monitor',
  description: '启动串口监控',
  options: [
    { name: '--port', description: '串口端口', default: 'COM3' },
    { name: '--baud-rate', description: '波特率', default: 115200 }
  ],
  handler: startMonitor
};
