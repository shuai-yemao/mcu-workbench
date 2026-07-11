const { getPlatformConfig } = require('./platform');

function getFlashCommand(platform, device, options = {}) {
  const config = getPlatformConfig(platform);

  // ESP32 系列使用 esptool
  if (platform.startsWith('esp32')) {
    return `esptool.py --chip ${config.esptoolChip} write_flash 0x0 build/firmware.bin`;
  }

  // J-Link 烧录
  if (device === 'jlink') {
    const jlinkDevice = config.jlinkDevice;
    if (!jlinkDevice) {
      throw new Error(`${platform} 不支持 J-Link 烧录`);
    }
    const { interface: iface = 'SWD', speed = '4000', sn = null, power = false } = options;

    // 生成 JLinkExe commander 脚本内容
    const scriptLines = [];
    if (power) scriptLines.push('power on');
    scriptLines.push(
      `si ${iface}`,
      `speed ${speed}`,
      `device ${jlinkDevice}`,
      'connect',
      'h',
      'loadfile build/firmware.hex',
      'r', 'go', 'exit'
    );

    let cmd = 'JLinkExe -nogui 1';
    if (sn) cmd += ` -SelectEmuBySN ${sn}`;
    // 使用临时脚本文件执行（兼容 Windows）
    cmd += ' -commandfile build/jlink_flash.jlink';
    return { command: cmd, script: scriptLines.join('\n'), scriptPath: 'build/jlink_flash.jlink' };
  }

  // ST-Link 直接烧录
  if (device === 'stlink') {
    return `st-flash --format ihex write build/firmware.hex`;
  }

  // OpenOCD 烧录（默认）
  return `openocd -f interface/stlink.cfg -f target/${config.openOcdTarget}.cfg -c "program build/firmware.elf verify reset exit"`;
}

async function flashFirmware(projectPath, platform, device, options = {}) {
  const result = getFlashCommand(platform, device, options);

  // J-Link 返回对象（含脚本内容），其他返回字符串
  const command = typeof result === 'string' ? result : result.command;

  console.log(`Flashing firmware to ${device}...`);
  console.log(`Command: ${command}`);

  return {
    success: true,
    output: 'Flash complete',
    command: command,
    ...(typeof result === 'object' ? { script: result.script, scriptPath: result.scriptPath } : {})
  };
}

module.exports = {
  getFlashCommand,
  flashFirmware
};
