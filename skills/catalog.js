/**
 * MCU-Workbench 的唯一技能目录。
 * `id` 同时是 Claude Code 调用名、SKILL.md 的 name 和目录名。
 */
const LEGACY_SKILL_ENTRIES = [
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
];

const ARCHIVED_SOFTWARE_LAYERS = new Set([
  'workflow', 'rtos', 'bsp', 'platform', 'middleware', 'system', 'interface', 'security'
]);

const LEGACY_SKILL_CATALOG = LEGACY_SKILL_ENTRIES.map(([id, legacyId, layer, description]) => {
  const isToolsSkill = layer === 'operations';
  const isArchived = (ARCHIVED_SOFTWARE_LAYERS.has(layer)
    && !['workflow-router', 'rtos-freertos', 'middleware-lvgl'].includes(id))
    || isToolsSkill;
  const activeLayer = isToolsSkill ? 'tools' : layer;
  return {
    id,
    legacyId,
    layer: activeLayer,
    description,
    archived: isArchived,
    path: isArchived
      ? (isToolsSkill ? `archive/tools-legacy/${id}` : `archive/software-legacy/${layer}/${id}`)
      : `skills/${activeLayer}/${id}`,
    canonical: false
  };
});

const CANONICAL_DEFINITIONS = [
  ['workflow-project-integration', 'workflow', '分层设计、工程审计与集成路线'],
  ['app-architecture', 'workflow', 'APP 的启动、Manager、Task、Logic、UI 与 Profile 边界'],
  ['os-abstraction', 'rtos', 'OSAL、OS Wrapper、OS Port 与并发接口规范'],
  ['bsp-adapter', 'bsp', 'BSP Wrapper、BSP Port、函数表与平台绑定'],
  ['bsp-hal-driver', 'bsp', '器件协议、初始化、读写与睡眠唤醒 hal_driver'],
  ['bsp-handler', 'bsp', 'BSP 多实例、生命周期、缓存、事件与资源所有权'],
  ['core-mcu', 'platform', 'MCU 内部外设、初始化、中断与 DMA 组织'],
  ['driver-vendor', 'platform', 'CMSIS、厂商 HAL/LL/SPL、寄存器与 SDK'],
  ['middleware-communication', 'middleware', 'MQTT、BLE、CAN、Modbus、WiFi 等通信能力'],
  ['middleware-storage', 'middleware', 'FatFs、SFUD、Flash 与文件系统接入'],
  ['middleware-algorithms', 'middleware', 'DSP、FFT、电机控制及通用算法中间件'],
  ['software-system', 'system', 'Bootloader、低功耗、看门狗与固件安全等跨层能力']
];

const TOOL_CANONICAL_DEFINITIONS = [
  ['tools-build', 'tools', 'CMake、ESP-IDF、IAR、Keil 和 PlatformIO 构建'],
  ['tools-flash', 'tools', 'ESP-IDF、J-Link、OpenOCD、Keil 和批量烧录'],
  ['tools-linker', 'tools', 'Keil、GCC、IAR 链接脚本与内存布局'],
  ['tools-debug', 'tools', 'GDB、OpenOCD、Ozone、RTOS 和崩溃诊断'],
  ['tools-observability', 'tools', 'ELOG、RTT、串口和 SystemView 运行时观测'],
  ['tools-quality', 'tools', '代码审查、Map、静态分析和 Unity 测试'],
  ['tools-release', 'tools', 'OTA 打包、升级、回滚和发布验证'],
  ['tools-learning-tutor', 'tools', '基于项目代码提问、理解检查和 Obsidian 学习笔记生成']
];

const EXISTING_CANONICAL_SKILLS = LEGACY_SKILL_CATALOG
  .filter((skill) => ['workflow-router', 'rtos-freertos', 'middleware-lvgl'].includes(skill.id))
  .map((skill) => ({ ...skill, canonical: true }));

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

const TOOL_MIGRATION_MAP = Object.fromEntries(
  Object.entries(TOOL_ALIASES).flatMap(([target, aliases]) => aliases.map((alias) => [alias, target]))
);

const CANONICAL_DEFINITIONS_BY_ID = Object.fromEntries([
  ...EXISTING_CANONICAL_SKILLS,
  ...CANONICAL_DEFINITIONS.map(([id, layer, description]) => ({
    id,
    legacyId: id,
    layer,
    description,
    path: `skills/${layer}/${id}`,
    canonical: true
  })),
  ...TOOL_CANONICAL_DEFINITIONS.map(([id, layer, description]) => ({
    id,
    legacyId: id,
    layer,
    description,
    path: `skills/${layer}/${id}`,
    canonical: true
  }))
].map((skill) => [skill.id, skill]));

const CANONICAL_ORDER = [
  'workflow-router', 'workflow-project-integration', 'app-architecture',
  'os-abstraction', 'rtos-freertos', 'bsp-adapter', 'bsp-hal-driver',
  'bsp-handler', 'core-mcu', 'driver-vendor', 'middleware-lvgl',
  'middleware-communication', 'middleware-storage', 'middleware-algorithms',
  'software-system', 'tools-build', 'tools-flash', 'tools-linker',
  'tools-debug', 'tools-observability', 'tools-quality', 'tools-release',
  'tools-learning-tutor'
];

const CANONICAL_SKILLS = CANONICAL_ORDER.map((id) => ({
  ...CANONICAL_DEFINITIONS_BY_ID[id],
  aliases: TOOL_ALIASES[id] || []
}));

const TUTOR_ENTRY = {
  id: 'workflow-learning-tutor',
  legacyId: 'learning-tutor',
  layer: 'workflow',
  description: '嵌入式代码学习与 Obsidian 笔记辅导',
  archived: true,
  path: 'archive/software-legacy/workflow/workflow-learning-tutor',
  canonical: false
};

const SKILL_CATALOG = [
  ...CANONICAL_SKILLS,
  ...LEGACY_SKILL_CATALOG.filter((skill) => !CANONICAL_SKILLS.some((canonical) => canonical.id === skill.id)),
  TUTOR_ENTRY
];

const SKILL_BY_ID = Object.fromEntries(SKILL_CATALOG.map((skill) => [skill.id, skill]));
const SKILL_BY_CANONICAL_ID = Object.fromEntries(CANONICAL_SKILLS.map((skill) => [skill.id, skill]));
const SKILL_BY_LEGACY_ID = Object.fromEntries(SKILL_CATALOG.map((skill) => [skill.legacyId, skill]));

const MIGRATION_MAP = {
  'workflow-architecture': 'workflow-project-integration',
  'project-integration': 'workflow-project-integration',
  'embedded-architect': 'workflow-project-integration',
  'embedded-project-integration': 'workflow-project-integration',
  'workflow-code-porting': 'workflow-project-integration',
  'code-porting': 'workflow-project-integration',
  'bsp-device-adaptation': 'bsp-adapter',
  'bsp-platform-adapter': 'bsp-adapter',
  'peripheral-driver': 'bsp-adapter',
  'embedded-adapter': 'bsp-adapter',
  'bsp-device-driver': 'bsp-hal-driver',
  'bsp-peripheral-driver': 'bsp-hal-driver',
  'bsp-device-service': 'bsp-handler',
  'bsp-peripheral-handler': 'bsp-handler',
  'platform-cortex-registers': 'core-mcu',
  'platform-cortex-interrupts': 'core-mcu',
  'platform-cortex-memory': 'core-mcu',
  'platform-mcu-architecture': 'core-mcu',
  'platform-peripheral-registers': 'core-mcu',
  'platform-option-bytes': 'core-mcu',
  'platform-sram': 'core-mcu',
  'platform-internal-flash': 'core-mcu',
  'platform-stm32-hal': 'driver-vendor',
  'platform-stm32-spl': 'driver-vendor',
  'arm-core-registers': 'core-mcu',
  'arm-interrupt-exception': 'core-mcu',
  'arm-memory-architecture': 'core-mcu',
  'chip-architecture': 'core-mcu',
  'mcu-peripheral-registers': 'core-mcu',
  'option-bytes': 'core-mcu',
  'sram-module': 'core-mcu',
  'flash-module': 'core-mcu',
  'stm32-hal-development': 'driver-vendor',
  'stm32-spl-development': 'driver-vendor',
  'bus-i2c': 'core-mcu',
  'bus-spi': 'core-mcu',
  'bus-uart': 'core-mcu',
  'peripheral-adc': 'core-mcu',
  'peripheral-dma': 'core-mcu',
  'peripheral-motor-control': 'core-mcu',
  'peripheral-timer': 'core-mcu',
  'i2c-bus': 'core-mcu',
  'spi-bus': 'core-mcu',
  'uart-module': 'core-mcu',
  'adc-module': 'core-mcu',
  'dma-module': 'core-mcu',
  'motor-control': 'core-mcu',
  'timer-module': 'core-mcu',
  'protocol-ble': 'middleware-communication',
  'protocol-can': 'middleware-communication',
  'protocol-cellular': 'middleware-communication',
  'protocol-gps': 'middleware-communication',
  'protocol-lora': 'middleware-communication',
  'protocol-modbus': 'middleware-communication',
  'protocol-mqtt': 'middleware-communication',
  'protocol-usb': 'middleware-communication',
  'protocol-wifi': 'middleware-communication',
  'protocol-ymodem': 'middleware-communication',
  'ble-module': 'middleware-communication',
  'can-debug': 'middleware-communication',
  'cellular-module': 'middleware-communication',
  'gps-module': 'middleware-communication',
  'lora-module': 'middleware-communication',
  'modbus-debug': 'middleware-communication',
  'mqtt-module': 'middleware-communication',
  'usb-module': 'middleware-communication',
  'wifi-module': 'middleware-communication',
  'ymodem-module': 'middleware-communication',
  'middleware-dsp': 'middleware-algorithms',
  'middleware-fft': 'middleware-algorithms',
  'dsp-module': 'middleware-algorithms',
  'fft-module': 'middleware-algorithms',
  'middleware-fatfs': 'middleware-storage',
  'middleware-sfud': 'middleware-storage',
  'fatfs-module': 'middleware-storage',
  'sfud-module': 'middleware-storage',
  'system-bootloader': 'software-system',
  'system-low-power': 'software-system',
  'system-watchdog': 'software-system',
  'security-aes': 'software-system',
  'security-crc': 'software-system',
  'security-firmware-signing': 'software-system',
  'security-rsa': 'software-system',
  'bootloader-design': 'software-system',
  'lowpower-design': 'software-system',
  'watchdog-module': 'software-system',
  'aes-module': 'software-system',
  'crc-module': 'software-system',
  'firmware-sign': 'software-system',
  'rsa-module': 'software-system',
  'workflow-devlog': 'tools-learning-tutor',
  'devlog': 'tools-learning-tutor',
  'embedded-ai-collab': 'workflow-project-integration',
  'embedded-ai-coding-standard': 'tools-quality',
  'embedded-ai-prompt-templates': 'workflow-project-integration',
  'embedded-ai-code-review': 'tools-quality',
  ...TOOL_MIGRATION_MAP
};

function resolveSkillId(id) {
  if (SKILL_BY_CANONICAL_ID[id]) return id;
  if (MIGRATION_MAP[id]) return MIGRATION_MAP[id];
  if (SKILL_BY_LEGACY_ID[id]) {
    const entry = SKILL_BY_LEGACY_ID[id];
    return entry.canonical ? entry.id : (MIGRATION_MAP[entry.id] || entry.id);
  }
  if (SKILL_BY_ID[id]) return id;
  return null;
}

// Derived compatibility registry. Keep catalog.js as the only skill metadata source;
// registry.js only re-exports this view for the legacy Node API.
const SKILLS = Object.fromEntries(SKILL_CATALOG.map((skill) => [skill.id, {
  name: skill.id,
  description: skill.description,
  category: skill.layer,
  platforms: ['all'],
  legacyName: skill.legacyId,
  aliases: skill.aliases || [],
  canonical: Boolean(skill.canonical),
  archived: Boolean(skill.archived)
}]));

function getAllSkills() {
  return { ...SKILLS };
}

function getSkillsByCategory(category) {
  return Object.fromEntries(
    Object.entries(SKILLS).filter(([, skill]) => skill.category === category)
  );
}

function getSkillsByPlatform(platform) {
  return Object.fromEntries(
    Object.entries(SKILLS).filter(([, skill]) =>
      skill.platforms.includes(platform) || skill.platforms.includes('all')
    )
  );
}

function listSkillNames() {
  return Object.keys(SKILLS);
}

function getSkillAliases() {
  const aliases = {};
  for (const skill of SKILL_CATALOG) {
    const target = resolveSkillId(skill.id) || skill.id;
    if (skill.legacyId && skill.legacyId !== target) aliases[skill.legacyId] = target;
    for (const alias of skill.aliases || []) aliases[alias] = target;
  }
  for (const [alias, target] of Object.entries(MIGRATION_MAP)) aliases[alias] = target;
  return aliases;
}

module.exports = {
  SKILLS,
  SKILL_CATALOG,
  CANONICAL_SKILLS,
  MIGRATION_MAP,
  SKILL_BY_ID,
  SKILL_BY_CANONICAL_ID,
  SKILL_BY_LEGACY_ID,
  resolveSkillId,
  getAllSkills,
  getSkillsByCategory,
  getSkillsByPlatform,
  getSkillAliases,
  listSkillNames
};
