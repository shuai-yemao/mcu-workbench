/**
 * MCU-Workbench 的唯一技能目录。
 * `id` 同时是 Claude Code 调用名、SKILL.md 的 name 和目录名。
 */
const {
  LEGACY_SKILL_ENTRIES,
  ARCHIVED_SOFTWARE_LAYERS,
  CANONICAL_DEFINITIONS,
  TOOL_CANONICAL_DEFINITIONS,
  TOOL_ALIASES
} = require('./catalog-metadata');

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

const EXISTING_CANONICAL_SKILLS = LEGACY_SKILL_CATALOG
  .filter((skill) => ['workflow-router', 'rtos-freertos', 'middleware-lvgl'].includes(skill.id))
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
