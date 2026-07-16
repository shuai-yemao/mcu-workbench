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
  },

  // === 新增嵌入式技能包 ===
  'dsp-module': {
    name: 'DSP 模块',
    description: '数字信号处理模块',
    category: 'dsp',
    platforms: ['all']
  },
  'fatfs-module': {
    name: 'FatFS 文件系统',
    description: 'FatFS 嵌入式文件系统',
    category: 'storage',
    platforms: ['all']
  },
  'fft-module': {
    name: 'FFT 算法',
    description: '快速傅里叶变换算法',
    category: 'dsp',
    platforms: ['all']
  },
  'firmware-sign': {
    name: '固件签名',
    description: '固件安全签名验证',
    category: 'security',
    platforms: ['all']
  },
  'gang-flash': {
    name: '批量烧录',
    description: '多设备批量烧录',
    category: 'flash',
    platforms: ['all']
  },
  'gps-module': {
    name: 'GPS 模块',
    description: 'GPS 定位模块驱动',
    category: 'communication',
    platforms: ['all']
  },
  'linker-scatter': {
    name: '链接脚本',
    description: '链接脚本/分散加载文件',
    category: 'build',
    platforms: ['all']
  },
  'lora-module': {
    name: 'LoRa 模块',
    description: 'LoRa 远程通信模块',
    category: 'communication',
    platforms: ['all']
  },
  'lowpower-design': {
    name: '低功耗设计',
    description: '嵌入式低功耗设计',
    category: 'design',
    platforms: ['all']
  },
  'lvgl-module': {
    name: 'LVGL GUI',
    description: 'LVGL 图形界面库',
    category: 'gui',
    platforms: ['all']
  },
  'map-analyzer': {
    name: 'Map 文件分析',
    description: '编译输出 Map 文件分析',
    category: 'debug',
    platforms: ['all']
  },
  'modbus-debug': {
    name: 'Modbus 调试',
    description: 'Modbus 协议调试',
    category: 'communication',
    platforms: ['all']
  },
  'motor-control': {
    name: '电机控制',
    description: '电机驱动控制',
    category: 'peripheral',
    platforms: ['all']
  },
  'mqtt-module': {
    name: 'MQTT 协议',
    description: 'MQTT 物联网协议',
    category: 'communication',
    platforms: ['all']
  },
  'option-bytes': {
    name: '选项字节',
    description: 'MCU 选项字节配置',
    category: 'knowledge',
    platforms: ['stm32']
  },
  'ota-package': {
    name: 'OTA 打包',
    description: 'OTA 固件打包工具',
    category: 'ota',
    platforms: ['all']
  },
  'ota-update-system': {
    name: 'OTA 更新系统',
    description: 'OTA 空中升级系统',
    category: 'ota',
    platforms: ['all']
  },
  'ozone-module': {
    name: 'Ozone 调试',
    description: 'Ozone J-Link 调试器',
    category: 'debug',
    platforms: ['all']
  },
  'pcb-analysis': {
    name: 'PCB 分析',
    description: 'PCB 电路板分析',
    category: 'hardware',
    platforms: ['all']
  },
  'peripheral-driver': {
    name: '外设驱动',
    description: '通用外设驱动框架',
    category: 'peripheral',
    platforms: ['all']
  },
  'bsp-peripheral-driver': {
    name: 'BSP 外设 Driver',
    description: '依赖注入、生命周期与错误回滚驱动设计',
    category: 'peripheral',
    platforms: ['all']
  },
  'bsp-peripheral-handler': {
    name: 'BSP 外设 Handler',
    description: '多实例外设管理与资源生命周期设计',
    category: 'peripheral',
    platforms: ['all']
  },
  'embedded-adapter': {
    name: '嵌入式 Adapter',
    description: 'BSP 抽象接口到 MCU 与 RTOS 的平台适配',
    category: 'design',
    platforms: ['all']
  },
  'embedded-unity-testing': {
    name: '嵌入式 Unity 测试',
    description: 'Driver、Handler 与 Adapter 的 Unity 单元测试',
    category: 'testing',
    platforms: ['all']
  },
  'rsa-module': {
    name: 'RSA 加密',
    description: 'RSA 非对称加密',
    category: 'security',
    platforms: ['all']
  },
  'rtt-monitor': {
    name: 'RTT 监控',
    description: 'SEGGER RTT 实时监控',
    category: 'debug',
    platforms: ['all']
  },
  'serial-monitor': {
    name: '串口监控',
    description: '串口数据监控分析',
    category: 'debug',
    platforms: ['all']
  },
  'sram-module': {
    name: 'SRAM 模块',
    description: 'SRAM 外部存储驱动',
    category: 'storage',
    platforms: ['all']
  },
  'static-analysis': {
    name: '静态分析',
    description: '代码静态分析检查',
    category: 'review',
    platforms: ['all']
  },
  'systemview-module': {
    name: 'SystemView',
    description: 'SEGGER SystemView 调试',
    category: 'debug',
    platforms: ['all']
  },
  'usb-module': {
    name: 'USB 模块',
    description: 'USB 通信模块',
    category: 'communication',
    platforms: ['all']
  },
  'visa-debug': {
    name: 'VISA 调试',
    description: 'VISA 仪器通信调试',
    category: 'debug',
    platforms: ['all']
  },
  'watchdog-module': {
    name: '看门狗',
    description: '看门狗定时器',
    category: 'peripheral',
    platforms: ['all']
  },
  'wifi-module': {
    name: 'WiFi 模块',
    description: 'WiFi 无线通信模块',
    category: 'communication',
    platforms: ['esp32']
  },
  'ymodem-module': {
    name: 'Ymodem 协议',
    description: 'Ymodem 文件传输协议',
    category: 'communication',
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
