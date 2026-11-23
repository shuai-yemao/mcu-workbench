const PLATFORMS = {
  stm32f1: {
    name: 'STM32F1',
    arch: 'arm_cortex_m3',
    vendorLib: 'stm32f1_hal',
    cmakePrefix: 'STM32F1',
    openOcdTarget: 'stm32f1x',
    stLinkChip: 'stm32f1x'
  },
  stm32f4: {
    name: 'STM32F4',
    arch: 'arm_cortex_m4',
    vendorLib: 'stm32f4_hal',
    cmakePrefix: 'STM32F4',
    openOcdTarget: 'stm32f4x',
    stLinkChip: 'stm32f4x'
  },
  stm32f7: {
    name: 'STM32F7',
    arch: 'arm_cortex_m7',
    vendorLib: 'stm32f7_hal',
    cmakePrefix: 'STM32F7',
    openOcdTarget: 'stm32f7x',
    stLinkChip: 'stm32f7x'
  },
  gd32f1: {
    name: 'GD32F1',
    arch: 'arm_cortex_m3',
    vendorLib: 'gd32f1_standard_peripheral',
    cmakePrefix: 'GD32F1',
    openOcdTarget: 'gd32f1x',
    stLinkChip: 'stm32f1x'
  },
  at32f4: {
    name: 'AT32F4',
    arch: 'arm_cortex_m4',
    vendorLib: 'at32f4_standard_peripheral',
    cmakePrefix: 'AT32F4',
    openOcdTarget: 'at32f4x',
    stLinkChip: 'stm32f4x'
  },
  esp32: {
    name: 'ESP32',
    arch: 'xtensa_lx6',
    vendorLib: 'esp-idf',
    cmakePrefix: 'ESP32',
    openOcdTarget: 'esp32',
    esptoolChip: 'esp32'
  },
  esp32s3: {
    name: 'ESP32-S3',
    arch: 'xtensa_lx7',
    vendorLib: 'esp-idf',
    cmakePrefix: 'ESP32S3',
    openOcdTarget: 'esp32s3',
    esptoolChip: 'esp32s3'
  },
  esp32c3: {
    name: 'ESP32-C3',
    arch: 'riscv',
    vendorLib: 'esp-idf',
    cmakePrefix: 'ESP32C3',
    openOcdTarget: 'esp32c3',
    esptoolChip: 'esp32c3'
  }
};

function listSupportedPlatforms() {
  return Object.keys(PLATFORMS);
}

function getPlatformConfig(platform) {
  if (!PLATFORMS[platform]) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  return { ...PLATFORMS[platform] };
}

function detectPlatform(options = {}) {
  const { vendorFiles = [] } = options;

  for (const [platform, config] of Object.entries(PLATFORMS)) {
    const vendorPrefix = config.vendorLib.split('_')[0].toLowerCase();
    if (vendorFiles.some(f => f.toLowerCase().includes(vendorPrefix))) {
      return platform;
    }
  }

  return null;
}

module.exports = {
  PLATFORMS,
  listSupportedPlatforms,
  getPlatformConfig,
  detectPlatform
};
