/**
 * MCU-Workbench 的唯一技能目录。
 * `id` 同时是 Claude Code 调用名、SKILL.md 的 name 和目录名。
 */
const {
  LEGACY_SKILL_ENTRIES,
  ARCHIVED_SOFTWARE_LAYERS,
  CANONICAL_DEFINITIONS,
  TOOL_CANONICAL_DEFINITIONS,
  TOOL_ALIASES,
  CANONICAL_ALIASES
} = require('./catalog-metadata');

const LEGACY_SKILL_CATALOG = LEGACY_SKILL_ENTRIES.map(([id, legacyId, layer, description]) => {
  const isToolsSkill = layer === 'operations';
  const isArchived = (ARCHIVED_SOFTWARE_LAYERS.has(layer)
    && !['workflow-requirements-router', 'middleware-lvgl'].includes(id))
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
  .filter((skill) => ['workflow-requirements-router', 'middleware-lvgl'].includes(skill.id))
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
  'workflow-requirements-router', 'workflow-claude-layering', 'workflow-project-integration', 'app-architecture',
  'workflow-final-review',
  'os-adapter', 'os-runtime', 'bsp-wrapper', 'bsp-port', 'bsp-hal-driver',
  'bsp-handler', 'core-mcu', 'mcu-platform',   'middleware-lvgl',
  'middleware-communication', 'middleware-storage', 'middleware-fal',
  'middleware-flashdb', 'middleware-letter-shell',
  'middleware-algorithms',
  'software-system', 'tools-build', 'tools-flash', 'tools-linker',
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
  'workflow-architecture': 'workflow-project-integration',
  'project-integration': 'workflow-project-integration',
  'embedded-architect': 'workflow-project-integration',
  'embedded-project-integration': 'workflow-project-integration',
  'workflow-code-porting': 'workflow-project-integration',
  'code-porting': 'workflow-project-integration',
  'os-abstraction': 'os-adapter',
  'rtos-freertos': 'os-runtime',
  'freertos-module': 'os-runtime',
  'bsp-adapter': 'bsp-port',
  'bsp-device-adaptation': 'bsp-port',
  'bsp-platform-adapter': 'bsp-port',
  'peripheral-driver': 'bsp-port',
  'embedded-adapter': 'bsp-port',
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
  'driver-vendor': 'mcu-platform',
  'platform-stm32-hal': 'mcu-platform',
  'platform-stm32-spl': 'mcu-platform',
  'arm-core-registers': 'core-mcu',
  'arm-interrupt-exception': 'core-mcu',
  'arm-memory-architecture': 'core-mcu',
  'chip-architecture': 'core-mcu',
  'mcu-peripheral-registers': 'core-mcu',
  'option-bytes': 'core-mcu',
  'sram-module': 'core-mcu',
  'flash-module': 'core-mcu',
  'stm32-hal-development': 'mcu-platform',
  'stm32-spl-development': 'mcu-platform',
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
