const { getPlatformConfig } = require('../lib/platform');

async function startDebug(options) {
  const { device, platform, debugger: debuggerType = 'openocd', gdbPort = 3333, jlinkSpeed = '4000', jlinkInterface = 'SWD' } = options;

  if (!device) {
    throw new Error('Debug device is required');
  }

  if (!platform) {
    throw new Error('Platform is required');
  }

  const config = getPlatformConfig(platform);
  let serverCmd, gdbCmd;

  if (debuggerType === 'jlink') {
    // J-Link GDB Server 调试
    const jlinkDevice = config.jlinkDevice;
    if (!jlinkDevice) {
      throw new Error(`${platform} 不支持 J-Link 调试`);
    }
    serverCmd = `JLinkGDBServer -device ${jlinkDevice} -if ${jlinkInterface} -speed ${jlinkSpeed} -port ${gdbPort}`;
    gdbCmd = `arm-none-eabi-gdb build/firmware.elf -ex "target remote :${gdbPort}"`;
  } else if (debuggerType === 'probe-rs') {
    // probe-rs GDB Server（需安装 embedded-debugger-mcp）
    const chipName = config.jlinkDevice || device;
    serverCmd = `probe-rs gdb-server --chip ${chipName}`;
    gdbCmd = `arm-none-eabi-gdb build/firmware.elf -ex "target remote :${gdbPort}"`;
  } else {
    // OpenOCD 调试（默认）
    serverCmd = `openocd -f interface/${device}.cfg -f target/${config.openOcdTarget}.cfg`;
    gdbCmd = `arm-none-eabi-gdb build/firmware.elf -ex "target remote :${gdbPort}"`;
  }

  console.log(`Starting debug session (${debuggerType})...`);
  console.log(`Server: ${serverCmd}`);
  console.log(`GDB: ${gdbCmd}`);

  return {
    success: true,
    serverCommand: serverCmd,
    gdbCommand: gdbCmd,
    port: gdbPort,
    debugger: debuggerType
  };
}

async function startMonitor(options) {
  const { port = 'COM3', baudRate = 115200 } = options;

  console.log(`Starting serial monitor on ${port} @ ${baudRate}...`);

  return {
    success: true,
    port: port,
    baudRate: baudRate
  };
}

module.exports = {
  name: 'mcu-debug',
  description: '启动调试会话（支持 OpenOCD / J-Link / probe-rs）',
  options: [
    { name: '--device', description: '调试设备（如 stlink, jlink, cmsis-dap）', required: true },
    { name: '--platform', description: '目标平台（如 stm32f4, stm32f1）', required: true },
    { name: '--debugger', description: '调试器类型：openocd（默认）、jlink、probe-rs', default: 'openocd' },
    { name: '--gdb-port', description: 'GDB 端口', default: 3333 },
    { name: '--jlink-speed', description: 'J-Link 接口速度 kHz（仅 jlink 模式）', default: '4000' },
    { name: '--jlink-interface', description: 'J-Link 接口类型：SWD 或 JTAG（仅 jlink 模式）', default: 'SWD' }
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
