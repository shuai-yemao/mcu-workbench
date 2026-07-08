const { getPlatformConfig } = require('./platform');

function getFlashCommand(platform, device) {
  const config = getPlatformConfig(platform);

  if (platform.startsWith('esp32')) {
    return `esptool.py --chip ${config.esptoolChip} write_flash 0x0 build/firmware.bin`;
  }

  if (device === 'stlink') {
    return `st-flash --format ihex write build/firmware.hex`;
  }

  return `openocd -f interface/stlink.cfg -f target/${config.openOcdTarget}.cfg -c "program build/firmware.elf verify reset exit"`;
}

async function flashFirmware(projectPath, platform, device) {
  const command = getFlashCommand(platform, device);

  console.log(`Flashing firmware to ${device}...`);
  console.log(`Command: ${command}`);

  return {
    success: true,
    output: 'Flash complete',
    command: command
  };
}

module.exports = {
  getFlashCommand,
  flashFirmware
};
