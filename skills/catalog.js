/**
 * MCU-Workbench 的唯一技能目录。
 * `id` 同时是 Claude Code 调用名、SKILL.md 的 name 和目录名。
 */
const {
  LEGACY_SKILL_ENTRIES,
  ARCHIVED_SOFTWARE_LAYERS,
  CANONICAL_DEFINITIONS,
  SERVICE_DEFINITIONS,
  VENDOR_DEFINITIONS,
  TOOL_CANONICAL_DEFINITIONS,
  TOOL_ALIASES,
  CANONICAL_ALIASES
} = require('./catalog-metadata');

const LEGACY_SKILL_CATALOG = LEGACY_SKILL_ENTRIES.map(([id, legacyId, layer, description]) => {
  const isToolsSkill = layer === 'operations';
  const isArchived = (ARCHIVED_SOFTWARE_LAYERS.has(layer)
    && !['workflow-requirements-router'].includes(id))
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

const EXISTING_CANONICAL_SKILLS = LEGACY_SKILL_CATALOG
  .filter((skill) => ['workflow-requirements-router'].includes(skill.id))
  .map((skill) => ({ ...skill, canonical: true }));

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
  ...SERVICE_DEFINITIONS.map(([id, layer, description]) => ({
    id,
    legacyId: id,
    layer,
    description,
    path: `skills/${layer}/${id}`,
    canonical: true
  })),
  ...VENDOR_DEFINITIONS.map(([id, layer, description]) => ({
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
  'workflow-requirements-router', 'workflow-claude-layering', 'workflow-review-gate', 'workflow-integration-plan', 'app-architecture',
  'workflow-final-review',
  'platform_mcu', 'platform_os', 'platform_bsp',
  'impl_os', 'impl_board', 'impl_bsp', 'impl_bsp_handler',
  'service_system', 'service_battery', 'service_backlight', 'service_calendar', 'service_diagnosis',
  'service_log', 'service_ota', 'service_power', 'service_sensor', 'service_storage', 'service_watchdog',
  'vendor_stm32', 'vendor_lvgl', 'vendor_stack', 'vendor_fatfs', 'vendor_fal',
  'vendor_flashdb', 'vendor_letter_shell', 'vendor_dsp',
  'tools-build', 'tools-flash', 'tools-linker',
  'tools-debug', 'tools-observability', 'tools-quality', 'tools-git', 'tools-release',
  'tools-learning-tutor'
];

const CANONICAL_SKILLS = CANONICAL_ORDER.map((id) => ({
  ...CANONICAL_DEFINITIONS_BY_ID[id],
  aliases: [...(TOOL_ALIASES[id] || []), ...(CANONICAL_ALIASES[id] || [])]
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
  'workflow-router': 'workflow-requirements-router',
  'workflow-architecture': 'workflow-integration-plan',
  'project-integration': 'workflow-review-gate',
  'workflow-project-integration': 'workflow-review-gate',
  'embedded-architect': 'workflow-integration-plan',
  'embedded-project-integration': 'workflow-review-gate',
  'workflow-code-porting': 'workflow-integration-plan',
  'code-porting': 'workflow-integration-plan',
  'os-adapter': 'platform_os',
  'os-abstraction': 'platform_os',
  'os-runtime': 'impl_os',
  'rtos-freertos': 'impl_os',
  'freertos-module': 'impl_os',
  'bsp-port': 'impl_board',
  'bsp-adapter': 'impl_board',
  'bsp-device-adaptation': 'impl_board',
  'bsp-platform-adapter': 'impl_board',
  'peripheral-driver': 'impl_board',
  'embedded-adapter': 'impl_board',
  'bsp-hal-driver': 'impl_bsp',
  'bsp-device-driver': 'impl_bsp',
  'bsp-peripheral-driver': 'impl_bsp',
  'bsp-handler': 'impl_bsp_handler',
  'bsp-device-service': 'impl_bsp_handler',
  'bsp-peripheral-handler': 'impl_bsp_handler',
  'platform-cortex-registers': 'platform_mcu',
  'platform-cortex-interrupts': 'platform_mcu',
  'platform-cortex-memory': 'platform_mcu',
  'platform-mcu-architecture': 'platform_mcu',
  'platform-peripheral-registers': 'platform_mcu',
  'platform-option-bytes': 'platform_mcu',
  'platform-sram': 'platform_mcu',
  'platform-internal-flash': 'platform_mcu',
  'driver-vendor': 'vendor_stm32',
  'platform-stm32-hal': 'vendor_stm32',
  'platform-stm32-spl': 'vendor_stm32',
  'arm-core-registers': 'platform_mcu',
  'arm-interrupt-exception': 'platform_mcu',
  'arm-memory-architecture': 'platform_mcu',
  'chip-architecture': 'platform_mcu',
  'mcu-peripheral-registers': 'platform_mcu',
  'option-bytes': 'platform_mcu',
  'sram-module': 'platform_mcu',
  'flash-module': 'platform_mcu',
  'stm32-hal-development': 'vendor_stm32',
  'stm32-spl-development': 'vendor_stm32',
  'mcu-platform': 'vendor_stm32',
  'software-system': 'service_system',
  'middleware-lvgl': 'vendor_lvgl',
  'middleware-communication': 'vendor_stack',
  'middleware-storage': 'vendor_fatfs',
  'middleware-fal': 'vendor_fal',
  'middleware-flashdb': 'vendor_flashdb',
  'middleware-letter-shell': 'vendor_letter_shell',
  'middleware-algorithms': 'vendor_dsp',
  'lvgl-module': 'vendor_lvgl',
  'core-mcu': 'platform_mcu',
  'os-adapter': 'platform_os',
  'bsp-wrapper': 'platform_bsp',
  'bus-i2c': 'platform_mcu',
  'bus-spi': 'platform_mcu',
  'bus-uart': 'platform_mcu',
  'peripheral-adc': 'platform_mcu',
  'peripheral-dma': 'platform_mcu',
  'peripheral-motor-control': 'platform_mcu',
  'peripheral-timer': 'platform_mcu',
  'i2c-bus': 'platform_mcu',
  'spi-bus': 'platform_mcu',
  'uart-module': 'platform_mcu',
  'adc-module': 'platform_mcu',
  'dma-module': 'platform_mcu',
  'motor-control': 'platform_mcu',
  'timer-module': 'platform_mcu',
  'protocol-ble': 'vendor_stack',
  'protocol-can': 'vendor_stack',
  'protocol-cellular': 'vendor_stack',
  'protocol-gps': 'vendor_stack',
  'protocol-lora': 'vendor_stack',
  'protocol-modbus': 'vendor_stack',
  'protocol-mqtt': 'vendor_stack',
  'protocol-usb': 'vendor_stack',
  'protocol-wifi': 'vendor_stack',
  'protocol-ymodem': 'vendor_stack',
  'ble-module': 'vendor_stack',
  'can-debug': 'vendor_stack',
  'cellular-module': 'vendor_stack',
  'gps-module': 'vendor_stack',
  'lora-module': 'vendor_stack',
  'modbus-debug': 'vendor_stack',
  'mqtt-module': 'vendor_stack',
  'usb-module': 'vendor_stack',
  'wifi-module': 'vendor_stack',
  'ymodem-module': 'vendor_stack',
  'middleware-dsp': 'vendor_dsp',
  'middleware-fft': 'vendor_dsp',
  'dsp-module': 'vendor_dsp',
  'fft-module': 'vendor_dsp',
  'middleware-fatfs': 'vendor_fatfs',
  'middleware-sfud': 'vendor_fatfs',
  'fatfs-module': 'vendor_fatfs',
  'sfud-module': 'vendor_fatfs',
  'system-bootloader': 'service_system',
  'system-low-power': 'service_system',
  'system-watchdog': 'service_system',
  'security-aes': 'service_system',
  'security-crc': 'service_system',
  'security-firmware-signing': 'service_system',
  'security-rsa': 'service_system',
  'bootloader-design': 'service_system',
  'lowpower-design': 'service_system',
  'watchdog-module': 'service_system',
  'aes-module': 'service_system',
  'crc-module': 'service_system',
  'firmware-sign': 'service_system',
  'rsa-module': 'service_system',
  'workflow-devlog': 'tools-learning-tutor',
  'devlog': 'tools-learning-tutor',
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

// 职责边界：本文件只持有"事实"（目录、别名、迁移映射、ID 解析），不派生查询视图。
// 查询视图（SKILLS、getAllSkills 等）在 registry.js 中基于本文件派生；
// 磁盘加载（SKILL.md 内容、frontmatter）在 loader.js 中实现。
module.exports = {
  SKILL_CATALOG,
  CANONICAL_SKILLS,
  MIGRATION_MAP,
  SKILL_BY_ID,
  SKILL_BY_CANONICAL_ID,
  SKILL_BY_LEGACY_ID,
  resolveSkillId
};
