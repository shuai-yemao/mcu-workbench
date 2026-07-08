const { flashFirmware } = require('../lib/flasher');

module.exports = {
  name: 'mcu-flash',
  description: '烧录固件到目标设备',
  options: [
    { name: '--device', description: '烧录设备', required: true },
    { name: '--platform', description: '目标平台', required: true }
  ],
  handler: async (options) => {
    const { device, platform } = options;

    if (!device) {
      throw new Error('Flash device is required');
    }

    if (!platform) {
      throw new Error('Platform is required');
    }

    return await flashFirmware(process.cwd(), platform, device);
  }
};
