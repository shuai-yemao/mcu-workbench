/**
 * MCU-Workbench 的唯一技能目录。
 * `id` 同时是 Claude Code 调用名、SKILL.md 的 name 和目录名。
 */

const LEGACY_SKILL_ENTRIES = [
  // 仅保留仍作为 active 入口的 legacy 技能：
  // - workflow-requirements-router 是核心路由 Skill，纳入 canonical；
  // - hardware-* 独立于软件分层，作为 active 入口保留。
  // 其余旧 skill 已删除归档，旧调用名经 catalog.js 的 MIGRATION_MAP 兼容解析。
  ['workflow-requirements-router', 'embedded', 'workflow', '嵌入式需求约束分析、Agent 编排与固定交接给 workflow-requirements-challenge'],
  ['hardware-pcb-analysis', 'pcb-analysis', 'hardware', 'PCB 原理图与网表分析'],
  ['hardware-visa-debug', 'visa-debug', 'hardware', 'VISA/SCPI 仪器通信调试']
];

const CANONICAL_DEFINITIONS = [
  ['workflow-claude-layering', 'workflow', '嵌入式工程 Claude 多文件分层规则的扫描、同步与校验'],
  ['workflow-document-context', 'workflow', '项目 README、文档上下文、会话交接和文档状态的登记、同步与校验'],
  ['workflow-requirements-challenge', 'workflow', '需求约束后的 RCP 澄清、目的与可行性质疑：输出证据化结论并交给 workflow-review-gate'],
  ['workflow-review-gate', 'workflow', '代码前审查与门禁：反猜测审查、四张清单、spec.md 与放行/阻塞判定'],
  ['workflow-integration-plan', 'workflow', '读取 spec.md 和项目文件生成两个实施方案，用户选择后审查并生成 plan.md'],
  ['workflow-task-breakdown', 'workflow', '将审查通过的 plan.md 拆解为有顺序、可独立验证的任务并生成 task.md'],
  ['workflow-task-execution', 'workflow', '按 plan.md/task.md 分配 Agent 与主/辅助 Skill，并按依赖逐项执行，测试先行、验证、状态回写和 Spec 冲突阻塞'],
  ['workflow-final-review', 'workflow', '最终代码/变更集的独立 Review 编排，作为输出前最后一层门禁，交付按严重级别分组的结构化审查报告'],
  ['app-architecture', 'app', 'APP 的启动、Manager、Task、Logic、UI 与 Profile 边界'],
  ['platform_mcu', 'platform', 'Platform 纯定义：MCU 能力接口（GPIO/I2C/SPI/UART/ADC/TIM/DMA/中断/启动）'],
  ['platform_os', 'platform', 'Platform 纯定义：OS 能力接口（任务、队列、同步、定时、内存），零实现不绑 RTOS'],
  ['platform_bsp', 'platform', 'Platform 纯定义：板级器件能力接口 + 函数表/注册/对象协议，零实现不绑芯片'],
  ['platform_common', 'platform', 'Platform 公共对象模型与生命周期：core + object + manager + version 诊断（当前 16 文件/6 个 .c，含设备与服务全局注册表），不绑芯片/RTOS'],
  ['platform_middleware', 'platform', 'Platform 纯定义：中间件能力接口（log/fs/kv/crypto/gui/comm），零实现不绑芯片/RTOS'],
  ['impl_os', 'impl', 'Impl 落地：具体 RTOS（FreeRTOS）或裸机的 impl_os_*() 原生 Port 实现、调度调试和迁移验收'],
  ['impl_board', 'impl', 'Impl 落地：板级组合根——构造实例、注入 Ops、资源绑定（board_resource_config + board_bsp_register）'],
  ['impl_bsp', 'impl', 'Impl 落地：器件驱动实现（Driver 协议子层）+ Handler 机制子层（多实例/生命周期/缓存/重试），隔离 HAL/RTOS/板级绑定'],
  ['impl_middleware', 'impl', 'Impl 落地：中间件 port 适配——把 easylogger/fatfs/crypto/lvgl/comm 源码接进 platform_middleware 契约（log/fs/kv/crypto/gui/comm Port）'],
  ['service_system', 'service', 'Service 系统业务：Bootloader、低功耗、看门狗、固件安全和跨层系统能力（带业务策略）']
];

// Service 层（D10）：App 常见业务抽象，带业务策略，按业务域组织（对应范本 02_Service/）。
const SERVICE_DEFINITIONS = [
  ['service_battery', 'service', 'Service 电池业务：电量计算、电压/充电状态、低电量告警策略'],
  ['service_backlight', 'service', 'Service 背光业务：亮度调节、自动亮度/超时策略'],
  ['service_calendar', 'service', 'Service 日历业务：时间管理、闹钟、日程策略'],
  ['service_diagnosis', 'service', 'Service 诊断业务：故障码管理、自检、诊断报告'],
  ['service_log', 'service', 'Service 日志业务：分级日志、环形缓冲、导出策略'],
  ['service_ota', 'service', 'Service OTA 业务：固件下载、校验、跳转、回滚策略'],
  ['service_power', 'service', 'Service 电源业务：待机/休眠/唤醒、功耗档位策略'],
  ['service_sensor', 'service', 'Service 传感器业务：多传感器汇聚、滤波、单位转换、上报策略'],
  ['service_storage', 'service', 'Service 存储业务：参数存取、KV、分区管理、掉电安全'],
  ['service_watchdog', 'service', 'Service 看门狗业务：喂狗策略、任务存活监控、复位诊断']
];

// Vendor 层：目标工程完整保留 MCU/RTOS，按需保留中间件/算法；插件仓库只保存知识、路由和接入规则。
const VENDOR_DEFINITIONS = [
  ['vendor_mcu', 'vendor', 'Vendor MCU 能力底座：STM32、AT32、ESP32 官方 SDK、生成工程、Startup/System、HAL/LL/CMSIS 与工程配置'],
  ['vendor_rtos', 'vendor', 'Vendor RTOS 能力底座：按项目锁定并完整保留 FreeRTOS、RT-Thread 等 RTOS 源码、移植层与配置'],
  ['vendor_lvgl', 'vendor', 'Vendor 底座登记：LVGL GUI 源码与集成知识（显示/输入接入、OS 协作、性能验证）'],
  ['vendor_stack', 'vendor', 'Vendor 底座登记：MQTT、BLE、CAN、Modbus、WiFi、蜂窝、LoRa、GPS、USB 通信协议栈'],
  ['vendor_fatfs', 'vendor', 'Vendor 底座登记：FatFs、SFUD、Flash 存储、磨损处理和文件系统源码'],
  ['vendor_fal', 'vendor', 'Vendor 底座登记：FAL Flash 抽象层源码（分区表、设备 ops、相对偏移寻址）'],
  ['vendor_flashdb', 'vendor', 'Vendor 底座登记：FlashDB KV/TS 嵌入式数据库源码（追加写、GC、掉电安全）'],
  ['vendor_letter_shell', 'vendor', 'Vendor 底座登记：letter_shell 串口命令行源码（命令导出、参数解析、补全）'],
  ['vendor_algorithm', 'vendor', 'Vendor 算法底座：按需保留 Ring Buffer、FFT、DSP 及其他确定性算法实现']
];

const TOOL_CANONICAL_DEFINITIONS = [
  ['tools-build', 'tools', 'CMake、ESP-IDF、IAR、Keil 和 PlatformIO 构建'],
  ['tools-flash', 'tools', 'ESP-IDF、J-Link、OpenOCD、Keil 和批量烧录'],
  ['tools-linker', 'tools', 'Keil、GCC、IAR 链接脚本与内存布局'],
  ['tools-debug', 'tools', 'GDB、OpenOCD、Ozone、RTOS 和崩溃诊断'],
  ['tools-observability', 'tools', 'ELOG、RTT、串口和 SystemView 运行时观测'],
  ['tools-quality', 'tools', '代码注释、格式检查、代码审查、Cppcheck、MISRA 和静态质量门禁'],
  ['tools-verification', 'tools', 'Map/RAM/ROM/栈分析、Unity/Fake 测试和项目级验证'],
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
    'quality-code-review', 'embedded-reviewer', 'quality-static-analysis', 'static-analysis',
    'quality-format-check', 'code-quality', 'quality-gate', 'misra-check'
  ],
  'tools-verification': [
    'quality-map-analysis', 'map-analyzer', 'quality-unity-testing', 'embedded-unity-testing',
    'verification-quality', 'firmware-verification'
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
  'impl_bsp': ['bsp-hal-driver', 'bsp-device-driver', 'bsp-peripheral-driver', 'bsp-handler', 'bsp-device-service', 'bsp-peripheral-handler'],
  'vendor_mcu': [
    'mcu-platform', 'driver-vendor', 'platform-stm32-hal', 'platform-stm32-spl',
    'stm32-hal-development', 'stm32-spl-development', 'vendor-stm32'
  ],
  'vendor_rtos': ['vendor-rtos', 'freertos-kernel', 'rt-thread-kernel'],
  'vendor_lvgl': ['middleware-lvgl', 'lvgl-module'],
  'vendor_stack': ['middleware-communication', 'protocol-ble', 'protocol-can', 'protocol-cellular', 'protocol-gps', 'protocol-lora', 'protocol-modbus', 'protocol-mqtt', 'protocol-usb', 'protocol-wifi', 'protocol-ymodem'],
  'vendor_fatfs': ['middleware-storage', 'middleware-fatfs', 'middleware-sfud', 'fatfs-module', 'sfud-module'],
  'vendor_fal': ['middleware-fal'],
  'vendor_flashdb': ['middleware-flashdb'],
  'vendor_letter_shell': ['middleware-letter-shell'],
  'vendor_algorithm': ['middleware-algorithms', 'middleware-dsp', 'middleware-fft', 'dsp-module', 'fft-module', 'vendor-dsp']
};

module.exports = {
  LEGACY_SKILL_ENTRIES,
  CANONICAL_DEFINITIONS,
  SERVICE_DEFINITIONS,
  VENDOR_DEFINITIONS,
  TOOL_CANONICAL_DEFINITIONS,
  TOOL_ALIASES,
  CANONICAL_ALIASES
};
