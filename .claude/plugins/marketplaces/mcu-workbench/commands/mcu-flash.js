const { flashFirmware } = require('../lib/flasher');

module.exports = {
  name: 'mcu-flash',
  description: '烧录固件到目标设备（支持 OpenOCD / ST-Link / J-Link）',
  options: [
    { name: '--device', description: '烧录设备（stlink, jlink, openocd）', required: true },
    { name: '--platform', description: '目标平台（stm32f4, stm32f1 等）', required: true },
    { name: '--interface', description: 'J-Link 调试接口：SWD 或 JTAG（仅 jlink 模式）', default: 'SWD' },
    { name: '--speed', description: 'J-Link 接口速度 kHz（仅 jlink 模式）', default: '4000' },
    { name: '--sn', description: 'J-Link 探针序列号（多探针场景）' },
    { name: '--power', description: '通过 J-Link 向目标板供 3.3V', default: false }
  ],
  handler: async (options) => {
    const { device, platform, interface: iface, speed, sn, power } = options;

    if (!device) {
      throw new Error('Flash device is required');
    }

    if (!platform) {
      throw new Error('Platform is required');
    }

    // J-Link 专用选项
    const flashOptions = {};
    if (device === 'jlink') {
      if (iface) flashOptions.interface = iface;
      if (speed) flashOptions.speed = speed;
      if (sn) flashOptions.sn = sn;
      if (power) flashOptions.power = power;
    }

    return await flashFirmware(process.cwd(), platform, device, flashOptions);
  }
};
