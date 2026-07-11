const PLATFORMS = {
  stm32f1: {
    name: 'STM32F1',
    arch: 'arm_cortex_m3',
    vendorLib: 'stm32f1_hal',
    cmakePrefix: 'STM32F1',
    openOcdTarget: 'stm32f1x',
    stLinkChip: 'stm32f1x',
    jlinkDevice: 'STM32F103C8'  // J-Link 默认型号，用户可通过 --device 覆盖
  },
  stm32f4: {
    name: 'STM32F4',
    arch: 'arm_cortex_m4',
    vendorLib: 'stm32f4_hal',
    cmakePrefix: 'STM32F4',
    openOcdTarget: 'stm32f4x',
    stLinkChip: 'stm32f4x',
    jlinkDevice: 'STM32F411CE'  // J-Link 默认型号
  },
  stm32f7: {
    name: 'STM32F7',
    arch: 'arm_cortex_m7',
    vendorLib: 'stm32f7_hal',
    cmakePrefix: 'STM32F7',
    openOcdTarget: 'stm32f7x',
    stLinkChip: 'stm32f7x',
    jlinkDevice: 'STM32F767ZI'  // J-Link 默认型号
  },
  gd32f1: {
    name: 'GD32F1',
    arch: 'arm_cortex_m3',
    vendorLib: 'gd32f1_standard_peripheral',
    cmakePrefix: 'GD32F1',
    openOcdTarget: 'gd32f1x',
    stLinkChip: 'stm32f1x',
    jlinkDevice: 'GD32F103C8'  // GD32 兼容 STM32 J-Link 型号
  },
  at32f4: {
    name: 'AT32F4',
    arch: 'arm_cortex_m4',
    vendorLib: 'at32f4_standard_peripheral',
    cmakePrefix: 'AT32F4',
    openOcdTarget: 'at32f4x',
    stLinkChip: 'stm32f4x',
    jlinkDevice: 'AT32F403ACGT7'  // 雅特力 J-Link 型号
  },
  esp32: {
    name: 'ESP32',
    arch: 'xtensa_lx6',
    vendorLib: 'esp-idf',
    cmakePrefix: 'ESP32',
    openOcdTarget: 'esp32',
    esptoolChip: 'esp32',
    jlinkDevice: null  // ESP32 不支持 J-Link
  },
  esp32s3: {
    name: 'ESP32-S3',
    arch: 'xtensa_lx7',
    vendorLib: 'esp-idf',
    cmakePrefix: 'ESP32S3',
    openOcdTarget: 'esp32s3',
    esptoolChip: 'esp32s3',
    jlinkDevice: null  // ESP32-S3 不支持 J-Link
  },
  esp32c3: {
    name: 'ESP32-C3',
    arch: 'riscv',
    vendorLib: 'esp-idf',
    cmakePrefix: 'ESP32C3',
    openOcdTarget: 'esp32c3',
    esptoolChip: 'esp32c3',
    jlinkDevice: null  // ESP32-C3 不支持 J-Link
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
