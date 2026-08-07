/**
 * MCU-Workbench 的唯一技能目录。
 * `id` 同时是 Claude Code 调用名、SKILL.md 的 name 和目录名。
 */

const LEGACY_SKILL_ENTRIES = [
  // 工作流：决定如何开始或如何在多个层之间交接。
  ['workflow-requirements-router', 'embedded', 'workflow', '嵌入式需求约束分析、Agent 编排与固定交接给 workflow-review-gate'],
  ['workflow-devlog', 'devlog', 'workflow', '嵌入式开发记录与可追溯交接'],
  ['workflow-architecture', 'embedded-architect', 'workflow', '嵌入式分层架构设计'],
  ['workflow-code-porting', 'code-porting', 'workflow', '跨 MCU、SDK 或工具链的代码移植'],
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

  // RTOS 与中间件（源码底座已归 Vendor，仅保留能力指引类 legacy 登记）。
  ['middleware-dsp', 'dsp-module', 'middleware', '嵌入式数字信号处理'],
  ['middleware-fatfs', 'fatfs-module', 'middleware', 'FatFs 文件系统'],
  ['middleware-fft', 'fft-module', 'middleware', '快速傅里叶变换'],
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
];

const ARCHIVED_SOFTWARE_LAYERS = new Set([
  'workflow', 'rtos', 'bsp', 'platform', 'middleware', 'system', 'interface', 'security'
]);

const CANONICAL_DEFINITIONS = [
  ['workflow-claude-layering', 'workflow', '嵌入式工程 Claude 多文件分层规则的扫描、同步与校验'],
  ['workflow-review-gate', 'workflow', '代码前审查与门禁：反猜测审查、四张清单、BRD/PRD/SRSys 与放行/阻塞判定'],
  ['workflow-integration-plan', 'workflow', '放行后的集成规划与分发：分层审计、迁移路线、文件级改造顺序与唯一实现层 Skill 分发'],
  ['workflow-final-review', 'workflow', '最终代码/变更集的独立 Review 编排，作为输出前最后一层门禁，交付按严重级别分组的结构化审查报告'],
  ['app-architecture', 'app', 'APP 的启动、Manager、Task、Logic、UI 与 Profile 边界'],
  ['platform_mcu', 'platform', 'Platform 纯定义：MCU 能力接口（GPIO/I2C/SPI/UART/ADC/TIM/DMA/中断/启动）+ 统一错误码/类型/对象协议规范'],
  ['platform_os', 'platform', 'Platform 纯定义：OS 能力接口（OSAL、任务、队列、同步、定时、内存），零实现不绑 RTOS'],
  ['platform_bsp', 'platform', 'Platform 纯定义：板级器件能力接口 + 函数表/注册/对象协议，零实现不绑芯片'],
  ['impl_os', 'impl', 'Impl 落地：具体 RTOS（FreeRTOS）或裸机的 os_*_impl() 原生 Port 实现、调度调试和迁移验收'],
  ['impl_board', 'impl', 'Impl 落地：板级组合根——构造实例、注入 Ops、资源绑定（board_resource_config + board_bsp_register）'],
  ['impl_bsp', 'impl', 'Impl 落地：器件驱动实现（Driver 协议子层），隔离 HAL/RTOS/板级绑定'],
  ['impl_bsp_handler', 'impl', 'Impl 落地：Handler 机制子层——实例注册、生命周期、队列、工作线程、ISR 延后、缓存与回调（D5）'],
  ['software-system', 'system', 'Bootloader、低功耗、看门狗与固件安全等跨层能力']
];

// Vendor 层（D3/D9/D11）：厂家与第三方底座，源码只登记映射不复制（D7）。
const VENDOR_DEFINITIONS = [
  ['vendor_stm32', 'vendor', 'Vendor 底座登记：CMSIS、STM32 HAL/LL/SPL、ESP-IDF Driver、寄存器和厂商 SDK'],
  ['vendor_lvgl', 'vendor', 'Vendor 底座登记：LVGL GUI 源码与集成知识（显示/输入接入、OS 协作、性能验证）'],
  ['vendor_stack', 'vendor', 'Vendor 底座登记：MQTT、BLE、CAN、Modbus、WiFi、蜂窝、LoRa、GPS、USB 通信协议栈'],
  ['vendor_fatfs', 'vendor', 'Vendor 底座登记：FatFs、SFUD、Flash 存储、磨损处理和文件系统源码'],
  ['vendor_fal', 'vendor', 'Vendor 底座登记：FAL Flash 抽象层源码（分区表、设备 ops、相对偏移寻址）'],
  ['vendor_flashdb', 'vendor', 'Vendor 底座登记：FlashDB KV/TS 嵌入式数据库源码（追加写、GC、掉电安全）'],
  ['vendor_letter_shell', 'vendor', 'Vendor 底座登记：letter_shell 串口命令行源码（命令导出、参数解析、补全）'],
  ['vendor_dsp', 'vendor', 'Vendor 底座登记：DSP、FFT、电机控制及通用算法库源码（如 CMSIS-DSP）']
];

const TOOL_CANONICAL_DEFINITIONS = [
  ['tools-build', 'tools', 'CMake、ESP-IDF、IAR、Keil 和 PlatformIO 构建'],
  ['tools-flash', 'tools', 'ESP-IDF、J-Link、OpenOCD、Keil 和批量烧录'],
  ['tools-linker', 'tools', 'Keil、GCC、IAR 链接脚本与内存布局'],
  ['tools-debug', 'tools', 'GDB、OpenOCD、Ozone、RTOS 和崩溃诊断'],
  ['tools-observability', 'tools', 'ELOG、RTT、串口和 SystemView 运行时观测'],
  ['tools-quality', 'tools', '代码审查、AI 代码约束、Map、静态分析和 Unity 测试'],
  ['tools-git', 'tools', '项目 Git 分支、提交、同步、恢复与嵌入式验证交接'],
  ['tools-release', 'tools', 'OTA 打包、升级、回滚和发布验证'],
  ['tools-learning-tutor', 'tools', '基于项目代码提问、理解检查和 Obsidian 学习笔记生成']
];

const TOOL_ALIASES = {
  'tools-build': [
    'tool-build-cmake', 'build-cmake', 'tool-build-esp-idf', 'build-idf',
    'tool-build-iar', 'build-iar', 'tool-build-keil', 'build-keil',
    'tool-build-platformio', 'build-platformio'
  ],
  'tools-flash': [
    'tool-flash-esp-idf', 'flash-idf', 'tool-flash-gang', 'gang-flash',
    'tool-flash-jlink', 'flash-jlink', 'tool-flash-keil', 'flash-keil',
    'tool-flash-openocd', 'flash-openocd', 'tool-flash-platformio', 'flash-platformio'
  ],
  'tools-linker': ['tool-linker-scatter', 'linker-scatter'],
  'tools-debug': [
    'debug-crash-backtrace', 'cmbacktrace-debug', 'debug-diagnostic-framework',
    'embedded-debugger-framework', 'debug-gdb-openocd', 'debug-ozone', 'ozone-module',
    'debug-platformio', 'debug-rtos', 'rtos-debug'
  ],
  'tools-observability': [
    'observability-elog', 'elog-module', 'observability-rtt-monitor', 'rtt-monitor',
    'observability-rtt-porting', 'segger-rtt-module', 'observability-serial-monitor',
    'serial-monitor', 'observability-systemview', 'systemview-module'
  ],
  'tools-quality': [
    'quality-code-review', 'embedded-reviewer', 'quality-map-analysis', 'map-analyzer',
    'quality-static-analysis', 'static-analysis', 'quality-unity-testing', 'embedded-unity-testing'
  ],
  'tools-release': [
    'release-ota-package', 'ota-package', 'release-ota-update', 'ota-update-system'
  ],
  'tools-learning-tutor': ['workflow-learning-tutor', 'learning-tutor']
};

const CANONICAL_ALIASES = {
  'workflow-requirements-router': ['workflow-router'],
  'platform_os': ['os-adapter', 'os-abstraction'],
  'impl_os': ['os-runtime', 'rtos-freertos', 'freertos-module'],
  'platform_mcu': ['core-mcu', 'platform-cortex-registers', 'platform-cortex-interrupts', 'platform-cortex-memory', 'platform-mcu-architecture', 'platform-peripheral-registers', 'platform-option-bytes', 'platform-sram', 'platform-internal-flash', 'arm-core-registers', 'arm-interrupt-exception', 'arm-memory-architecture', 'chip-architecture', 'mcu-peripheral-registers', 'option-bytes', 'sram-module', 'flash-module'],
  'platform_bsp': ['bsp-wrapper'],
  'impl_board': ['bsp-port', 'bsp-adapter', 'bsp-device-adaptation', 'bsp-platform-adapter', 'peripheral-driver', 'embedded-adapter'],
  'impl_bsp': ['bsp-hal-driver', 'bsp-device-driver', 'bsp-peripheral-driver'],
  'impl_bsp_handler': ['bsp-handler', 'bsp-device-service', 'bsp-peripheral-handler'],
  'vendor_stm32': [
    'mcu-platform', 'driver-vendor', 'platform-stm32-hal', 'platform-stm32-spl',
    'stm32-hal-development', 'stm32-spl-development'
  ],
  'vendor_lvgl': ['middleware-lvgl', 'lvgl-module'],
  'vendor_stack': ['middleware-communication', 'protocol-ble', 'protocol-can', 'protocol-cellular', 'protocol-gps', 'protocol-lora', 'protocol-modbus', 'protocol-mqtt', 'protocol-usb', 'protocol-wifi', 'protocol-ymodem'],
  'vendor_fatfs': ['middleware-storage', 'middleware-fatfs', 'middleware-sfud', 'fatfs-module', 'sfud-module'],
  'vendor_fal': ['middleware-fal'],
  'vendor_flashdb': ['middleware-flashdb'],
  'vendor_letter_shell': ['middleware-letter-shell'],
  'vendor_dsp': ['middleware-algorithms', 'middleware-dsp', 'middleware-fft', 'dsp-module', 'fft-module']
};

module.exports = {
  LEGACY_SKILL_ENTRIES,
  ARCHIVED_SOFTWARE_LAYERS,
  CANONICAL_DEFINITIONS,
  VENDOR_DEFINITIONS,
  TOOL_CANONICAL_DEFINITIONS,
  TOOL_ALIASES,
  CANONICAL_ALIASES
};
