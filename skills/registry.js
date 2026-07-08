/**
 * MCU-Workbench Skills Registry
 * 嵌入式开发相关技能包注册表
 */

const SKILLS = {
  // === 构建系统 ===
  'build-cmake': {
    name: 'CMake 构建',
    description: '使用 CMake 构建嵌入式项目',
    category: 'build',
    platforms: ['stm32', 'gd32', 'at32']
  },
  'build-keil': {
    name: 'Keil 构建',
    description: '使用 Keil MDK 构建嵌入式项目',
    category: 'build',
    platforms: ['stm32', 'gd32', 'at32']
  },
  'build-iar': {
    name: 'IAR 构建',
    description: '使用 IAR Embedded Workbench 构建',
    category: 'build',
    platforms: ['stm32', 'gd32', 'at32']
  },
  'build-platformio': {
    name: 'PlatformIO 构建',
    description: '使用 PlatformIO 构建嵌入式项目',
    category: 'build',
    platforms: ['stm32', 'esp32']
  },
  'build-idf': {
    name: 'ESP-IDF 构建',
    description: '使用 ESP-IDF 构建 ESP32 项目',
    category: 'build',
    platforms: ['esp32']
  },

  // === 烧录工具 ===
  'flash-openocd': {
    name: 'OpenOCD 烧录',
    description: '使用 OpenOCD 烧录固件',
    category: 'flash',
    platforms: ['stm32', 'gd32', 'at32']
  },
  'flash-jlink': {
    name: 'JLink 烧录',
    description: '使用 JLink 烧录固件',
    category: 'flash',
    platforms: ['stm32', 'gd32', 'at32']
  },
  'flash-keil': {
    name: 'Keil 烧录',
    description: '使用 Keil 烧录固件',
    category: 'flash',
    platforms: ['stm32']
  },
  'flash-platformio': {
    name: 'PlatformIO 烧录',
    description: '使用 PlatformIO 烧录固件',
    category: 'flash',
    platforms: ['stm32', 'esp32']
  },
  'flash-idf': {
    name: 'ESP-IDF 烧录',
    description: '使用 esptool 烧录 ESP32 固件',
    category: 'flash',
    platforms: ['esp32']
  },
  'flash-module': {
    name: '通用烧录模块',
    description: '通用固件烧录接口',
    category: 'flash',
    platforms: ['all']
  },

  // === 调试工具 ===
  'debug-gdb-openocd': {
    name: 'GDB+OpenOCD 调试',
    description: '使用 GDB 和 OpenOCD 调试',
    category: 'debug',
    platforms: ['stm32', 'gd32', 'at32']
  },
  'debug-platformio': {
    name: 'PlatformIO 调试',
    description: '使用 PlatformIO 调试',
    category: 'debug',
    platforms: ['stm32', 'esp32']
  },
  'cmbacktrace-debug': {
    name: 'CmBacktrace 调试',
    description: 'ARM Cortex-M 崩溃追踪',
    category: 'debug',
    platforms: ['stm32']
  },
  'rtos-debug': {
    name: 'RTOS 调试',
    description: 'FreeRTOS/RT-Thread 任务调试',
    category: 'debug',
    platforms: ['all']
  },

  // === 外设驱动 ===
  'i2c-bus': {
    name: 'I2C 总线',
    description: 'I2C 通信协议驱动',
    category: 'peripheral',
    platforms: ['all']
  },
  'spi-bus': {
    name: 'SPI 总线',
    description: 'SPI 通信协议驱动',
    category: 'peripheral',
    platforms: ['all']
  },
  'uart-module': {
    name: 'UART 模块',
    description: 'UART 串口通信驱动',
    category: 'peripheral',
    platforms: ['all']
  },
  'gpio-module': {
    name: 'GPIO 模块',
    description: 'GPIO 输入输出驱动',
    category: 'peripheral',
    platforms: ['all']
  },
  'adc-module': {
    name: 'ADC 模块',
    description: '模数转换驱动',
    category: 'peripheral',
    platforms: ['all']
  },
  'dma-module': {
    name: 'DMA 模块',
    description: '直接内存访问驱动',
    category: 'peripheral',
    platforms: ['all']
  },
  'timer-module': {
    name: '定时器模块',
    description: '定时器/PWM 驱动',
    category: 'peripheral',
    platforms: ['all']
  },

  // === 通信协议 ===
  'can-debug': {
    name: 'CAN 调试',
    description: 'CAN 总线调试工具',
    category: 'communication',
    platforms: ['stm32']
  },
  'ble-module': {
    name: 'BLE 模块',
    description: '蓝牙低功耗驱动',
    category: 'communication',
    platforms: ['esp32', 'stm32']
  },
  'cellular-module': {
    name: '蜂窝模块',
    description: '4G/5G 蜂窝通信模块',
    category: 'communication',
    platforms: ['all']
  },

  // === RTOS ===
  'freertos-module': {
    name: 'FreeRTOS',
    description: 'FreeRTOS 实时操作系统',
    category: 'rtos',
    platforms: ['all']
  },
  'rt-thread-module': {
    name: 'RT-Thread',
    description: 'RT-Thread 实时操作系统',
    category: 'rtos',
    platforms: ['all']
  },

  // === 系统设计 ===
  'embedded-architect': {
    name: '嵌入式架构',
    description: '嵌入式系统架构设计',
    category: 'design',
    platforms: ['all']
  },
  'embedded-system-design': {
    name: '系统设计',
    description: '嵌入式系统整体设计',
    category: 'design',
    platforms: ['all']
  },
  'bootloader-design': {
    name: 'Bootloader 设计',
    description: ' bootloader 设计与实现',
    category: 'design',
    platforms: ['all']
  },
  'code-porting': {
    name: '代码移植',
    description: '跨平台代码移植',
    category: 'design',
    platforms: ['all']
  },

  // === 调试日志 ===
  'elog-module': {
    name: 'EasyLogger',
    description: '嵌入式日志库',
    category: 'logging',
    platforms: ['all']
  },
  'segger-rtt-module': {
    name: 'SEGGER RTT',
    description: 'SEGGER RTT 日志输出',
    category: 'logging',
    platforms: ['all']
  },
  'devlog': {
    name: '开发日志',
    description: '开发过程日志记录',
    category: 'logging',
    platforms: ['all']
  },

  // === 安全加密 ===
  'aes-module': {
    name: 'AES 加密',
    description: 'AES 加密算法模块',
    category: 'security',
    platforms: ['all']
  },
  'crc-module': {
    name: 'CRC 校验',
    description: 'CRC 校验算法模块',
    category: 'security',
    platforms: ['all']
  },

  // === 存储 ===
  'sfud-module': {
    name: 'SFUD',
    description: '串行 Flash 通用驱动',
    category: 'storage',
    platforms: ['all']
  },

  // === 核心知识 ===
  'arm-core-registers': {
    name: 'ARM 核心寄存器',
    description: 'ARM Cortex-M 核心寄存器',
    category: 'knowledge',
    platforms: ['stm32']
  },
  'arm-interrupt-exception': {
    name: 'ARM 中断异常',
    description: 'ARM 中断和异常处理',
    category: 'knowledge',
    platforms: ['stm32']
  },
  'arm-memory-architecture': {
    name: 'ARM 内存架构',
    description: 'ARM Cortex-M 内存架构',
    category: 'knowledge',
    platforms: ['stm32']
  },
  'chip-architecture': {
    name: '芯片架构',
    description: 'MCU 芯片架构知识',
    category: 'knowledge',
    platforms: ['all']
  },
  'mcu-peripheral-registers': {
    name: 'MCU 外设寄存器',
    description: 'MCU 外设寄存器操作',
    category: 'knowledge',
    platforms: ['all']
  },

  // === 代码审查 ===
  'embedded-reviewer': {
    name: '嵌入式代码审查',
    description: '嵌入式代码质量审查',
    category: 'review',
    platforms: ['all']
  },
  'embedded-debugger-framework': {
    name: '调试框架',
    description: '嵌入式调试框架设计',
    category: 'review',
    platforms: ['all']
  }
};

function getAllSkills() {
  return { ...SKILLS };
}

function getSkillsByCategory(category) {
  return Object.fromEntries(
    Object.entries(SKILLS).filter(([_, skill]) => skill.category === category)
  );
}

function getSkillsByPlatform(platform) {
  return Object.fromEntries(
    Object.entries(SKILLS).filter(([_, skill]) =>
      skill.platforms.includes(platform) || skill.platforms.includes('all')
    )
  );
}

function listSkillNames() {
  return Object.keys(SKILLS);
}

module.exports = {
  SKILLS,
  getAllSkills,
  getSkillsByCategory,
  getSkillsByPlatform,
  listSkillNames
};
