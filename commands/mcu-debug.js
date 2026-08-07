const { getDebugPlan, startDebugSession } = require('../lib/debugger');
const { getMonitorPlan, startMonitorSession } = require('../lib/monitor');

function startDebug(options) {
  const planOptions = {
    platform: options.platform,
    probe: options.probe,
    device: options.device,
    chip: options.chip,
    elf: options.elf,
    gdbPort: options.gdbPort
  };

  if (options.execute) {
    return startDebugSession({
      ...planOptions,
      cwd: process.cwd(),
      logger: options.quiet ? () => {} : console.log
    });
  }

  const plan = getDebugPlan(planOptions);
  const serverLine = `${plan.serverCommand.command} ${plan.serverCommand.args.join(' ')}`;
  const gdbLine = `${plan.gdbCommand.command} ${plan.gdbCommand.args.join(' ')}`;
  const gdbPort = options.gdbPort === undefined ? 3333 : Number(options.gdbPort);

  const result = {
    success: true,
    probe: plan.probe,
    gdbCommand: gdbLine,
    port: gdbPort,
    output: 'Debug plan (dry-run; use --execute to start the real session)'
  };
  if (plan.probe === 'openocd') result.openocdCommand = serverLine;
  else result.jlinkServerCommand = serverLine;
  return result;
}

const monitor = {
  name: 'mcu-monitor',
  description: '启动串口/RTT/SWO 监控',
  options: [
    { name: '--channel', description: '监控通道 (serial|rtt|swo)', default: 'serial' },
    { name: '--port', description: '串口端口', default: 'COM3' },
    { name: '--baud-rate', description: '波特率', default: 115200 },
    { name: '--rtt-channel', description: 'RTT 通道号', default: 0 },
    { name: '--chip', description: 'J-Link 芯片名（rtt/swo 用）' },
    { name: '--tool', description: '强制指定监控工具' }
  ],
  handler: async (options) => {
    const planOptions = {
      channel: options.channel,
      port: options.port,
      baudRate: options.baudRate,
      rttChannel: options.rttChannel,
      chip: options.chip,
      tool: options.tool
    };

    if (options.execute) {
      return startMonitorSession({
        ...planOptions,
        cwd: process.cwd(),
        logger: options.quiet ? () => {} : console.log
      });
    }

    const plan = getMonitorPlan(planOptions);
    return {
      success: true,
      channel: plan.channel,
      command: `${plan.command} ${plan.args.join(' ')}`.trim(),
      port: options.port === undefined ? 'COM3' : options.port,
      baudRate: Number(options.baudRate === undefined ? 115200 : options.baudRate)
    };
  }
};

const debug = {
  name: 'mcu-debug',
  description: '启动调试会话',
  options: [
    { name: '--device', description: 'OpenOCD 接口配置 (interface/<device>.cfg)', default: 'stlink' },
    { name: '--platform', description: '目标平台', required: true },
    { name: '--probe', description: '调试探针 (openocd|jlink)', default: 'openocd' },
    { name: '--chip', description: 'J-Link 芯片名 (jlink 探针用)' },
    { name: '--elf', description: '固件 ELF 路径', default: 'build/firmware.elf' },
    { name: '--gdb-port', description: 'GDB 端口', default: 3333 }
  ],
  handler: startDebug
};

module.exports = debug;
module.exports.monitor = monitor;
