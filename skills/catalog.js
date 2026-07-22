/**
 * MCU-Workbench 的唯一技能目录。
 * `id` 同时是 Claude Code 调用名、SKILL.md 的 name 和目录名。
 */
const SKILL_CATALOG = [
  // 工作流：决定如何开始或如何在多个层之间交接。
  ['workflow-router', 'embedded', 'workflow', '嵌入式请求分诊与最小 skill 编排'],
  ['workflow-devlog', 'devlog', 'workflow', '嵌入式开发记录与可追溯交接'],
  ['workflow-architecture', 'embedded-architect', 'workflow', '嵌入式分层架构设计'],
  ['workflow-code-porting', 'code-porting', 'workflow', '跨 MCU、SDK 或工具链的代码移植'],
  ['embedded-ai-collab', 'embedded-ai-collab', 'workflow', '嵌入式 AI 协作编程入口 — 5 阶段工作流编排'],
  ['embedded-ai-coding-standard', 'embedded-ai-coding-standard', 'workflow', '嵌入式 C AI 编码规范 — 命名、模板、五大原则'],
  ['embedded-ai-prompt-templates', 'embedded-ai-prompt-templates', 'workflow', '嵌入式 AI Prompt 模板集 — 逐函数生成与审查'],
  ['embedded-ai-code-review', 'embedded-ai-code-review', 'workflow', '嵌入式 AI 代码审查清单 — 四层检查与反模式'],
  ['project-integration', 'embedded-project-integration', 'workflow', '嵌入式项目集成审计与指导 — 五层模型 + 8步路线图'],

  // 平台层：MCU、内核、厂商框架和存储布局。
  ['platform-cortex-registers', 'arm-core-registers', 'platform', 'ARM Cortex-M 核心寄存器与故障诊断'],
  ['platform-cortex-interrupts', 'arm-interrupt-exception', 'platform', 'ARM Cortex-M 中断与异常'],
  ['platform-cortex-memory', 'arm-memory-architecture', 'platform', 'ARM Cortex-M 内存架构'],
  ['platform-mcu-architecture', 'chip-architecture', 'platform', 'MCU 架构与选型'],
  ['platform-peripheral-registers', 'mcu-peripheral-registers', 'platform', 'MCU 外设寄存器操作'],
  ['platform-option-bytes', 'option-bytes', 'platform', 'STM32 选项字节配置'],
  ['platform-sram', 'sram-module', 'platform', 'STM32 SRAM 配置与布局'],
  ['platform-internal-flash', 'flash-module', 'platform', 'MCU 内部 Flash 操作'],
  ['platform-stm32-hal', 'stm32-hal-development', 'platform', 'STM32 CubeMX/HAL 固件开发'],
  ['platform-stm32-spl', 'stm32-spl-development', 'platform', 'STM32 标准外设库开发'],

  // 接口与外设层：总线、协议和 MCU 外设能力。
  ['bus-i2c', 'i2c-bus', 'interface', 'I2C 总线配置与诊断'],
  ['bus-spi', 'spi-bus', 'interface', 'SPI 总线配置与诊断'],
  ['bus-uart', 'uart-module', 'interface', 'UART/USART 配置与诊断'],
  ['peripheral-adc', 'adc-module', 'interface', 'ADC 采样与校准'],
  ['peripheral-dma', 'dma-module', 'interface', 'DMA 配置与一致性'],
  ['peripheral-motor-control', 'motor-control', 'interface', '电机控制'],
  ['peripheral-timer', 'timer-module', 'interface', '定时器、PWM 与捕获'],
  ['protocol-ble', 'ble-module', 'interface', 'BLE 低功耗蓝牙'],
  ['protocol-can', 'can-debug', 'interface', 'CAN 总线开发与故障诊断'],
  ['protocol-cellular', 'cellular-module', 'interface', '蜂窝通信模块'],
  ['protocol-gps', 'gps-module', 'interface', 'GPS/GNSS 定位'],
  ['protocol-lora', 'lora-module', 'interface', 'LoRa/LoRaWAN 通信'],
  ['protocol-modbus', 'modbus-debug', 'interface', 'Modbus 协议诊断'],
  ['protocol-mqtt', 'mqtt-module', 'interface', 'MQTT 物联网协议'],
  ['protocol-usb', 'usb-module', 'interface', 'USB 设备、主机与 OTG'],
  ['protocol-wifi', 'wifi-module', 'interface', 'WiFi 无线通信'],
  ['protocol-ymodem', 'ymodem-module', 'interface', 'Ymodem 文件传输'],

  // BSP：器件协议、服务编排与平台绑定。
  ['bsp-device-adaptation', 'peripheral-driver', 'bsp', '外部器件驱动选型与受控适配'],
  ['bsp-device-driver', 'bsp-peripheral-driver', 'bsp', '平台无关的单器件 BSP Driver'],
  ['bsp-device-service', 'bsp-peripheral-handler', 'bsp', '多实例 BSP 服务与资源编排'],
  ['bsp-platform-adapter', 'embedded-adapter', 'bsp', 'BSP 依赖到 HAL/RTOS 的平台适配'],

  // RTOS 与中间件。
  ['rtos-freertos', 'freertos-module', 'rtos', 'FreeRTOS 集成与使用'],
  ['middleware-dsp', 'dsp-module', 'middleware', '嵌入式数字信号处理'],
  ['middleware-fatfs', 'fatfs-module', 'middleware', 'FatFs 文件系统'],
  ['middleware-fft', 'fft-module', 'middleware', '快速傅里叶变换'],
  ['middleware-lvgl', 'lvgl-module', 'middleware', 'LVGL 图形界面'],
  ['middleware-sfud', 'sfud-module', 'middleware', 'SFUD 串行 Flash 驱动'],

  // 系统能力。
  ['system-bootloader', 'bootloader-design', 'system', 'Bootloader 设计与实现'],
  ['system-low-power', 'lowpower-design', 'system', '低功耗架构与调试'],
  ['system-watchdog', 'watchdog-module', 'system', 'IWDG/WWDG 看门狗'],

  // 工程操作与质量横切面。
  ['tool-build-cmake', 'build-cmake', 'operations', 'CMake 嵌入式构建'],
  ['tool-build-esp-idf', 'build-idf', 'operations', 'ESP-IDF 构建'],
  ['tool-build-iar', 'build-iar', 'operations', 'IAR 构建'],
  ['tool-build-keil', 'build-keil', 'operations', 'Keil MDK 构建'],
  ['tool-build-platformio', 'build-platformio', 'operations', 'PlatformIO 构建'],
  ['tool-flash-esp-idf', 'flash-idf', 'operations', 'ESP-IDF 烧录'],
  ['tool-flash-gang', 'gang-flash', 'operations', '多设备并行烧录'],
  ['tool-flash-jlink', 'flash-jlink', 'operations', 'J-Link 烧录'],
  ['tool-flash-keil', 'flash-keil', 'operations', 'Keil 烧录'],
  ['tool-flash-openocd', 'flash-openocd', 'operations', 'OpenOCD 烧录'],
  ['tool-flash-platformio', 'flash-platformio', 'operations', 'PlatformIO 烧录'],
  ['tool-linker-scatter', 'linker-scatter', 'operations', '链接脚本与散装加载'],
  ['debug-crash-backtrace', 'cmbacktrace-debug', 'operations', 'CmBacktrace 崩溃追踪'],
  ['debug-diagnostic-framework', 'embedded-debugger-framework', 'operations', '嵌入式故障诊断框架'],
  ['debug-gdb-openocd', 'debug-gdb-openocd', 'operations', 'GDB 与 OpenOCD 调试'],
  ['debug-ozone', 'ozone-module', 'operations', 'SEGGER Ozone 调试'],
  ['debug-platformio', 'debug-platformio', 'operations', 'PlatformIO 调试'],
  ['debug-rtos', 'rtos-debug', 'operations', 'RTOS 任务与调度诊断'],
  ['observability-elog', 'elog-module', 'operations', 'EasyLogger 日志'],
  ['observability-rtt-monitor', 'rtt-monitor', 'operations', 'SEGGER RTT 实时监控'],
  ['observability-rtt-porting', 'segger-rtt-module', 'operations', 'SEGGER RTT 移植'],
  ['observability-serial-monitor', 'serial-monitor', 'operations', '串口数据监控'],
  ['observability-systemview', 'systemview-module', 'operations', 'SEGGER SystemView 追踪'],
  ['quality-code-review', 'embedded-reviewer', 'operations', '嵌入式代码审查'],
  ['quality-map-analysis', 'map-analyzer', 'operations', '链接 Map 文件分析'],
  ['quality-static-analysis', 'static-analysis', 'operations', '静态分析与 MISRA 检查'],
  ['quality-unity-testing', 'embedded-unity-testing', 'operations', '嵌入式 Unity 单元测试'],
  ['release-ota-package', 'ota-package', 'operations', 'OTA 固件打包'],
  ['release-ota-update', 'ota-update-system', 'operations', 'OTA 更新系统'],

  // 安全与硬件：独立于软件分层的专门能力。
  ['security-aes', 'aes-module', 'security', 'AES 加密'],
  ['security-crc', 'crc-module', 'security', 'CRC 校验'],
  ['security-firmware-signing', 'firmware-sign', 'security', '固件签名与验证'],
  ['security-rsa', 'rsa-module', 'security', 'RSA 非对称加密'],
  ['hardware-pcb-analysis', 'pcb-analysis', 'hardware', 'PCB 原理图与网表分析'],
  ['hardware-visa-debug', 'visa-debug', 'hardware', 'VISA/SCPI 仪器通信调试']
].map(([id, legacyId, layer, description]) => ({
  id,
  legacyId,
  layer,
  description,
  path: `skills/${layer}/${id}`
}));

const SKILL_BY_ID = Object.fromEntries(SKILL_CATALOG.map((skill) => [skill.id, skill]));
const SKILL_BY_LEGACY_ID = Object.fromEntries(SKILL_CATALOG.map((skill) => [skill.legacyId, skill]));

function resolveSkillId(id) {
  if (SKILL_BY_ID[id]) return id;
  return SKILL_BY_LEGACY_ID[id] ? SKILL_BY_LEGACY_ID[id].id : null;
}

module.exports = { SKILL_CATALOG, SKILL_BY_ID, SKILL_BY_LEGACY_ID, resolveSkillId };
