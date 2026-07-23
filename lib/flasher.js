const { getPlatformConfig } = require('./platform');
const { runShellCommand } = require('./process-runner');

function getFlashCommand(platform, device) {
  const config = getPlatformConfig(platform);
  if (!device || !/^[a-z0-9_-]+$/i.test(device)) {
    throw new Error('Flash device must contain only letters, numbers, hyphens, or underscores');
  }

  if (platform.startsWith('esp32')) {
    return `esptool.py --chip ${config.esptoolChip} write_flash 0x0 build/firmware.bin`;
  }

  if (device === 'stlink') {
    return `st-flash --format ihex write build/firmware.hex`;
  }

  return `openocd -f interface/stlink.cfg -f target/${config.openOcdTarget}.cfg -c "program build/firmware.elf verify reset exit"`;
}

async function flashFirmware(projectPath, platform, device, options = {}) {
  const { execute = false, logger = console.log } = options;
  const command = getFlashCommand(platform, device);

  logger(`Flashing firmware to ${device}...`);
  logger(`Command: ${command}`);

  if (execute) {
    const result = await runShellCommand(command, projectPath);
    return {
      success: true,
      output: result.stdout.trim() || 'Flash complete',
      command
    };
  }

  return {
    success: true,
    output: 'Flash complete (dry-run plan; use --execute to run)',
    command
  };
}

module.exports = {
  getFlashCommand,
  flashFirmware
};
