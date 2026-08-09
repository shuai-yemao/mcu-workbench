const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { validateArchitectureContract } = require('./architecture-contract');

const CONFIG_RELATIVE_PATH = '.mcu-workbench/claude-layer.json';
const LEGACY_CONFIG_RELATIVE_PATH = '.mcu-workbench/claude-layering.json';
const STATE_RELATIVE_PATH = '.mcu-workbench/claude-layer.state.json';
const LEGACY_STATE_RELATIVE_PATH = '.mcu-workbench/claude-layering.state.json';
const RULES_RELATIVE_DIRECTORY = '.claude/rules/mcu-workbench';
const REPORT_RELATIVE_PATH = 'docs/architecture/claude-layer-map.md';
const ROOT_MANAGED_START = '<!-- mcu-workbench:managed:start -->';
const ROOT_MANAGED_END = '<!-- mcu-workbench:managed:end -->';
const SOURCE_EXTENSION = /\.(?:c|h|cc|cpp|cxx|hpp)$/i;
const SKIPPED_DIRECTORIES = new Set(['.git', '.mcu-workbench', '.claude', 'build', 'cmake-build-debug', 'node_modules']);

const LAYERS = [
  {
    id: 'app', name: 'App', patterns: [
      /(?:^|\/)01_App(?:\/|$)/i,
      /(?:^|\/)(?:App|Application|User_Task)(?:\/|$)/i
    ],
    responsibility: '产品业务流程：编排、状态机、交互（app_ble/app_hmi/app_ota/app_init/app_system）；只依赖 Service。',
    allowed: '仅 Service 层的公开业务接口。',
    forbidden: 'HAL、Platform 实现、Impl 与 Vendor 的任何符号；不得直接触碰寄存器/外设/RTOS。'
  },
  {
    id: 'service', name: 'Service', patterns: [
      /(?:^|\/)02_Service(?:\/|$)/i,
      /(?:^|\/)service_[^/]*(?:\/|$)/i,
      /(?:^|\/)(?:Service|Services)(?:\/|$)/i
    ],
    responsibility: 'App 常见业务抽象（带策略）：battery/backlight/log/ota/power/sensor/storage/watchdog，各带 _model/_state/_fault_code。',
    allowed: 'Platform 层公开接口与其他 Service。',
    forbidden: 'Vendor 头文件、寄存器/HAL、Impl 实现与芯片绑定。'
  },
  {
    id: 'platform', name: 'Platform', patterns: [
      /(?:^|\/)03_Platform(?:\/|$)/i,
      /(?:^|\/)platform_(?:common|mcu|os|bsp|middleware)(?:\/|$)/i,
      /(?:^|\/)Core\/(?:Inc|Include|Public)(?:\/|$)/i,
      /^Core\/[^/]+\.h$/i,
      /(?:^|\/)Bsp\/Wrapper(?:\/|$)/i,
      /^Bsp\/.*\/[^/]*wrapper[^/]*\.[ch]$/i,
      /(?:^|\/)OS\/Wrapper(?:\/|$)/i,
      /(?:^|\/)os_adapter\/(?:inc|shared|wrapper)(?:\/|$)/i,
      /(?:^|\/)osal_[^/]*\.[ch]$/i
    ],
    responsibility: '平台抽象：统一接口/错误码/数据结构/ops/ctx，允许无芯片/RTOS/厂商依赖的公共实现。',
    allowed: '仅标准类型；公共实现不依赖芯片/RTOS/厂商。',
    forbidden: '芯片头文件、HAL/RTOS/Vendor 类型；Platform 目录 .c 禁止芯片/RTOS/厂商依赖。'
  },
  {
    id: 'vendor', name: 'Vendor', patterns: [
      /(?:^|\/)05_Vendor(?:\/|$)/i,
      /(?:^|\/)(?:Vendor|Third_Party|ThirdParty|third-party|external)(?:\/|$)/i,
      /(?:^|\/)Drivers\/(?:CMSIS|STM32[^/]*_HAL_Driver)(?:\/|$)/i,
      /(?:^|\/)CMSIS(?:\/|$)/i,
      /(?:^|\/)Middlewares?(?:\/|$)/i,
      /(?:^|\/)FreeRTOS(?:\/|$)/i,
      /(?:^|\/)freertos(?:\/|$)/i
    ],
    responsibility: '厂家/第三方底座：HAL/CMSIS/CubeMX/FreeRTOS/LVGL/FatFS/算法库/SDK；源码不复制、只登记映射（vendor_mapping.md + patch/）。',
    allowed: '自身底座内部自由（不依赖任何上层）。',
    forbidden: '不反向调用任何上层符号；上层只能经 Platform 接口 + Impl 适配访问。'
  },
  {
    id: 'impl', name: 'Impl', patterns: [
      /(?:^|\/)04_Impl(?:\/|$)/i,
      /(?:^|\/)impl_(?:board|mcu|os|bsp|bsp_handler)(?:\/|$)/i,
      /^Core\/(?:Port|Ports|Src|Backend|Backends|Driver|Drivers)(?:\/|$)/i,
      /^Core\//i,
      /(?:^|\/)Bsp(?:\/|$)/i,
      /(?:^|\/)OS(?:\/|$)/i,
      /(?:^|\/)os_adapter(?:\/|$)/i,
      /(?:^|\/)(?:Driver|Drivers|Device)(?:\/|$)/i,
      /(?:^|\/)(?:System)(?:\/|$)/i
    ],
    responsibility: 'Platform→Vendor 适配落地：board/mcu/os/bsp 实现 + Handler 机制。',
    allowed: 'Platform 层接口与 Vendor 底座。',
    forbidden: '反向定义接口、被 App 直调、含业务策略。'
  }
];

// 旧 layout 键 → 新键的多数派 1:1 映射（仅作用于用户显式配置的键）。
const LEGACY_LAYOUT_MAP = {
  app: 'app',
  middleware: 'vendor',
  os: 'impl',
  bsp: 'impl',
  core: 'platform',
  driver: 'impl'
};

function normalizeLayoutKeys(layout = {}) {
  const out = { ...layout };
  let migrated = false;
  for (const [oldKey, newKey] of Object.entries(LEGACY_LAYOUT_MAP)) {
    if (oldKey !== newKey && layout[oldKey] !== undefined && layout[newKey] === undefined) {
      out[newKey] = layout[oldKey];
      delete out[oldKey];
      migrated = true;
    }
  }
  return { layout: out, migrated };
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function readText(filePath, fallback = '') {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : fallback;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeText(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function createDefaultConfig() {
  return {
    schemaVersion: 1,
    strict: false,
    layout: {},
    managed: {
      rulesDirectory: RULES_RELATIVE_DIRECTORY,
      report: REPORT_RELATIVE_PATH,
      rootMarkers: [ROOT_MANAGED_START, ROOT_MANAGED_END]
    }
  };
}

function resolveConfigPath(root, configPath) {
  return configPath ? path.resolve(root, configPath) : path.join(root, CONFIG_RELATIVE_PATH);
}

function loadConfig(root, configPath) {
  const resolved = resolveConfigPath(root, configPath);
  if (fs.existsSync(resolved)) return readJson(resolved);
  if (!configPath) {
    const legacy = path.join(root, LEGACY_CONFIG_RELATIVE_PATH);
    if (fs.existsSync(legacy)) return readJson(legacy);
  }
  return null;
}

function collectFiles(root, predicate, relative = '') {
  const result = [];
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return result;
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const childRelative = relative ? path.join(relative, entry.name) : entry.name;
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) result.push(...collectFiles(root, predicate, childRelative));
    } else if (entry.isFile() && predicate(entry.name, toPosix(childRelative))) {
      result.push(toPosix(childRelative));
    }
  }
  return result.sort();
}

function lineNumber(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function configuredPatterns(config, layer) {
  const configured = config.layout && config.layout[layer.id];
  if (!configured) return layer.patterns;
  const values = Array.isArray(configured) ? configured : [configured];
  return values.map((value) => (value instanceof RegExp ? value : new RegExp(value, 'i')));
}

function classifyFile(relative, config) {
  // os_adapter 子树（OS Wrapper/Port 适配）不属于 Vendor 底座：绕过 vendor 层，交由 platform/impl 归类。
  const underOsAdapter = /(?:^|\/)os_adapter(?:\/|$)/i.test(relative);
  for (const layer of LAYERS) {
    if (underOsAdapter && layer.id === 'vendor') continue;
    if (configuredPatterns(config, layer).some((pattern) => {
      pattern.lastIndex = 0;
      return pattern.test(relative);
    })) return layer.id;
  }
  return null;
}

function firstDirectory(relative) {
  const [first] = relative.split('/');
  return first || '.';
}

function scanProject({ root, config = createDefaultConfig() } = {}) {
  const resolvedRoot = path.resolve(root || process.cwd());
  const layerData = Object.fromEntries(LAYERS.map((layer) => [layer.id, {
    id: layer.id,
    name: layer.name,
    directories: [],
    files: [],
    references: []
  }]));
  const unverified = [];
  const sourceFiles = collectFiles(resolvedRoot, (name) => SOURCE_EXTENSION.test(name));
  for (const relative of sourceFiles) {
    const layerId = classifyFile(relative, config);
    if (!layerId) {
      unverified.push({ file: relative, reason: '无法从目录映射确认层归属' });
      continue;
    }
    const content = readText(path.join(resolvedRoot, relative));
    const layer = layerData[layerId];
    const directory = firstDirectory(relative);
    if (!layer.directories.includes(directory)) layer.directories.push(directory);
    layer.files.push({ path: relative });
    if (layerId !== 'vendor') {
      const includeExpression = /^\s*#\s*include\s*[<"]([^>"]+)[>"]/gm;
      for (const match of content.matchAll(includeExpression)) {
        layer.references.push({ file: relative, line: lineNumber(content, match.index), include: match[1] });
      }
    }
  }
  for (const layer of Object.values(layerData)) {
    layer.directories.sort();
    layer.files.sort((left, right) => left.path.localeCompare(right.path));
    layer.references.sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line);
  }

  const cmakeFiles = collectFiles(resolvedRoot, (name) => name === 'CMakeLists.txt' || name.endsWith('.cmake'));
  const iocFiles = collectFiles(resolvedRoot, (name) => name.endsWith('.ioc'));
  const freertosFiles = collectFiles(resolvedRoot, (name) => name === 'FreeRTOSConfig.h');
  const platformEvidence = [
    ...cmakeFiles.map((file) => ({ kind: 'cmake', file })),
    ...iocFiles.map((file) => ({ kind: 'cubemx', file })),
    ...freertosFiles.map((file) => ({ kind: 'freertos', file }))
  ];
  const project = {
    buildSystems: cmakeFiles.length ? ['CMake'] : [],
    platformEvidence,
    rtosEvidence: freertosFiles.map((file) => ({ kind: 'freertos', file }))
  };
  const digestInput = {
    project,
    layers: Object.fromEntries(Object.entries(layerData).map(([id, layer]) => [id, {
      directories: layer.directories,
      files: layer.files.map((file) => file.path),
      references: layer.references
    }])),
    unverified
  };
  return {
    schemaVersion: 1,
    root: resolvedRoot,
    project,
    layers: layerData,
    unverified,
    architectureDigest: sha256(JSON.stringify(digestInput))
  };
}

function removeManagedBlock(content) {
  const expression = new RegExp(`${ROOT_MANAGED_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${ROOT_MANAGED_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g');
  return content.replace(expression, '').trimEnd();
}

function managedBlock(content) {
  const start = content.indexOf(ROOT_MANAGED_START);
  const end = content.indexOf(ROOT_MANAGED_END);
  if (start === -1 || end === -1 || end < start) return null;
  return content.slice(start, end + ROOT_MANAGED_END.length);
}

function renderRootManaged(scan, existingRoot) {
  const manualRoot = removeManagedBlock(existingRoot);
  const agentImport = fs.existsSync(path.join(scan.root, 'AGENTS.md')) && !manualRoot.includes('@AGENTS.md')
    ? '@AGENTS.md\n\n' : '';
  const buildSystems = scan.project.buildSystems.length ? scan.project.buildSystems.join('、') : '未确认';
  const unverified = scan.unverified.length
    ? scan.unverified.map((item) => `- \`${item.file}\`：${item.reason}`).join('\n')
    : '- 无';
  return `${ROOT_MANAGED_START}\n\n# MCU Workbench 嵌入式工程约束\n\n${agentImport}## 工程事实\n\n- 构建系统：${buildSystems}\n- 平台与 RTOS 证据：${scan.project.platformEvidence.map((item) => `\`${item.file}\` (${item.kind})`).join('、') || '未确认'}\n- 分层扫描快照：\`${STATE_RELATIVE_PATH}\`\n\n## 分层总则\n\n- 层归属与依赖铁律：App → Service → Platform ← Impl → Vendor。\n- App 只调用 Service；Service 依赖 Platform 接口与其他 Service；Platform 定义契约并允许无芯片依赖的公共实现；Impl 落地 Platform→Vendor 适配（board/mcu/os/bsp + Handler）；Vendor 是第三方底座，不反向调用任何上层。\n- Platform 目录 .c 禁止芯片/RTOS/厂商依赖；Vendor 源码不复制、只登记映射（vendor_mapping.md + patch/）。\n- 机制在 Impl/Handler，策略在 Service。\n\n## 验证\n\n1. 运行 \`mcu-workbench claude-layer validate --root .\`。\n2. 再运行项目已确认的构建或测试入口。\n3. 静态检查、主机测试、目标构建和实机验证必须分别报告。\n\n## 未确认项\n\n${unverified}\n\n${ROOT_MANAGED_END}\n`;
}

function renderRoot(scan, existingRoot) {
  const managed = renderRootManaged(scan, existingRoot);
  const manualRoot = removeManagedBlock(existingRoot);
  return manualRoot ? `${manualRoot}\n\n${managed}` : managed;
}

function renderProjectRule(scan) {
  const paths = ['CMakeLists.txt', '**/*.ioc', '**/FreeRTOSConfig.h'];
  return `---\npaths:\n${paths.map((item) => `  - "${item}"`).join('\n')}\n---\n\n# MCU Workbench 工程配置规则\n\n- 以实际构建、CubeMX 与 RTOS 配置为工程事实来源。\n- 修改目录映射或平台配置后，运行 \`mcu-workbench claude-layer sync --root .\` 预览规则变更。\n- 未确认事实不得写为已完成的构建或硬件验证。\n`;
}

function renderLayerRule(layer, scanLayer) {
  const paths = scanLayer.directories.map((directory) => `${directory}/**/*.{c,h,cc,cpp,cxx,hpp}`);
  const evidence = scanLayer.references.length
    ? scanLayer.references.slice(0, 12).map((item) => `- \`${item.file}:${item.line}\`：include \`${item.include}\``).join('\n')
    : '- 尚未发现 include 引用；以目录映射为已确认依据。';
  return `---\npaths:\n${paths.map((item) => `  - "${item}"`).join('\n')}\n---\n\n# ${layer.name} 规则\n\n## 责任\n\n${layer.responsibility}\n\n## 允许依赖\n\n- ${layer.allowed}\n\n## 禁止依赖\n\n- ${layer.forbidden}\n\n## 已确认的工程证据\n\n${evidence}\n\n## 验证\n\n- \`mcu-workbench claude-layer validate --root .\`\n- 分层静态检查不等同于目标板验证。\n`;
}

function renderReport(scan) {
  const rows = LAYERS.map((layer) => {
    const data = scan.layers[layer.id];
    return `| ${layer.name} | ${data.directories.map((item) => `\`${item}\``).join('、') || '未确认'} | ${data.files.length} | ${data.references.length} |`;
  });
  const unverified = scan.unverified.length
    ? scan.unverified.map((item) => `- \`${item.file}\`：${item.reason}`).join('\n')
    : '- 无';
  return `# Claude 分层扫描报告\n\n## 工程证据\n\n- 构建系统：${scan.project.buildSystems.join('、') || '未确认'}\n- 配置证据：${scan.project.platformEvidence.map((item) => `\`${item.file}\` (${item.kind})`).join('、') || '未确认'}\n- 架构快照：\`${scan.architectureDigest}\`\n\n## 分层映射\n\n| 层 | 已确认目录 | 源文件数 | include 证据数 |\n|---|---|---:|---:|\n${rows.join('\n')}\n\n## 未确认路径\n\n${unverified}\n\n> 本报告来自静态扫描；不代表目标构建、烧录或实机验证已完成。\n`;
}

function artifactHash(relative, content) {
  return sha256(relative === 'CLAUDE.md' ? (managedBlock(content) || '') : content);
}

function buildArtifacts(root, config, scan, existingRoot, configWriteRelative) {
  const artifacts = {};
  if (configWriteRelative) artifacts[configWriteRelative] = `${JSON.stringify(config, null, 2)}\n`;
  artifacts.CLAUDE = renderRoot(scan, existingRoot);
  artifacts[`${RULES_RELATIVE_DIRECTORY}/00-project.md`] = renderProjectRule(scan);
  for (const layer of LAYERS) {
    if (layer.id === 'vendor') continue;
    const data = scan.layers[layer.id];
    if (data.directories.length) artifacts[`${RULES_RELATIVE_DIRECTORY}/${String(10 + LAYERS.indexOf(layer) * 10).padStart(2, '0')}-${layer.id}.md`] = renderLayerRule(layer, data);
  }
  artifacts[REPORT_RELATIVE_PATH] = renderReport(scan);
  const hashes = Object.fromEntries(Object.entries(artifacts).map(([relative, content]) => [relative === 'CLAUDE' ? 'CLAUDE.md' : relative, artifactHash(relative === 'CLAUDE' ? 'CLAUDE.md' : relative, content)]));
  const state = {
    schemaVersion: 1,
    architectureDigest: scan.architectureDigest,
    artifactHashes: hashes,
    unverified: scan.unverified
  };
  artifacts[STATE_RELATIVE_PATH] = `${JSON.stringify(state, null, 2)}\n`;
  return { artifacts, state };
}

function absoluteArtifactPath(root, relative) {
  return path.join(root, relative === 'CLAUDE' ? 'CLAUDE.md' : relative);
}

function planArtifacts(root, artifacts) {
  const changes = [];
  for (const [relative, desired] of Object.entries(artifacts)) {
    const current = readText(absoluteArtifactPath(root, relative));
    if (current !== desired) changes.push({
      path: relative === 'CLAUDE' ? 'CLAUDE.md' : relative,
      operation: current ? 'modify' : 'create'
    });
  }
  // 清理过期受管规则：仅处理 .claude/rules/mcu-workbench/ 下匹配受管命名模式、
  // 且不在期望 artifacts 集合中的旧规则文件（如 20-middleware.md），不触碰用户文件。
  const rulesDirectory = path.join(root, RULES_RELATIVE_DIRECTORY);
  if (fs.existsSync(rulesDirectory)) {
    for (const entry of fs.readdirSync(rulesDirectory)) {
      if (!/^\d{2}-[a-z]+\.md$/.test(entry)) continue;
      const relative = `${RULES_RELATIVE_DIRECTORY}/${entry}`;
      if (artifacts[relative] === undefined) changes.push({ path: relative, operation: 'delete' });
    }
  }
  return changes;
}

function writeArtifacts(root, artifacts, changes) {
  for (const change of changes) {
    if (change.operation === 'delete') {
      fs.unlinkSync(absoluteArtifactPath(root, change.path));
      continue;
    }
    const key = change.path === 'CLAUDE.md' ? 'CLAUDE' : change.path;
    writeText(absoluteArtifactPath(root, key), artifacts[key]);
  }
  return changes.map((change) => path.resolve(root, change.path));
}

function validateManagedArtifacts(root, state) {
  const errors = [];
  for (const [relative, expectedHash] of Object.entries(state.artifactHashes || {})) {
    const current = readText(path.join(root, relative));
    if (!current) {
      errors.push({ code: 'MANAGED_ARTIFACT_MISSING', file: relative, message: '受管 Claude 分层产物缺失。' });
      continue;
    }
    if (artifactHash(relative, current) !== expectedHash) {
      errors.push({ code: 'MANAGED_ARTIFACT_DRIFT', file: relative, message: '受管 Claude 分层产物已被修改或已过期。' });
    }
  }
  return errors;
}

function runClaudeLayer({ action, root, write = false, strict = false, configPath } = {}) {
  const resolvedRoot = path.resolve(root || process.cwd());
  if (!fs.existsSync(resolvedRoot)) throw new Error(`固件根目录不存在：${resolvedRoot}`);
  if (!['init', 'scan', 'sync', 'validate'].includes(action)) throw new Error('claude-layer action 必须是 init、scan、sync 或 validate。');
  const configFile = resolveConfigPath(resolvedRoot, configPath);
  const loadedConfig = loadConfig(resolvedRoot, configPath);
  if ((action === 'sync' || action === 'validate') && !loadedConfig) {
    throw new Error(`缺少 ${toPosix(path.relative(resolvedRoot, configFile))}；请先运行 claude-layer init。`);
  }
  const config = loadedConfig || createDefaultConfig();
  // 旧 layout 键（middleware/os/bsp/core/driver）读取时归一化到五层键，并输出迁移告警。
  const { layout: normalizedLayout, migrated: layoutMigrated } = normalizeLayoutKeys(config.layout || {});
  config.layout = normalizedLayout;
  const migrationWarnings = [];
  if (layoutMigrated) {
    const pairs = Object.entries(LEGACY_LAYOUT_MAP)
      .filter(([oldKey, newKey]) => oldKey !== newKey && config.layout[newKey] !== undefined && config.layout[oldKey] === undefined);
    migrationWarnings.push({
      code: 'LAYOUT_KEY_MIGRATED',
      message: `layout 旧键已归一化：${pairs.map(([oldKey, newKey]) => `${oldKey}→${newKey}`).join('、')}；请复核配置。`
    });
  }
  const configSourceRelative = fs.existsSync(configFile)
    ? toPosix(path.relative(resolvedRoot, configFile))
    : (!configPath && fs.existsSync(path.join(resolvedRoot, LEGACY_CONFIG_RELATIVE_PATH))
      ? LEGACY_CONFIG_RELATIVE_PATH
      : null);
  const scan = scanProject({ root: resolvedRoot, config });
  if (action === 'scan') return { success: true, action, changed: false, scan, writes: [], errors: [], warnings: migrationWarnings, exitCode: 0 };

  const existingRoot = readText(path.join(resolvedRoot, 'CLAUDE.md'));
  const configWriteRelative = (action === 'init' && !loadedConfig)
    ? CONFIG_RELATIVE_PATH
    : ((action === 'sync' && layoutMigrated && configSourceRelative) ? configSourceRelative : null);
  const { artifacts, state } = buildArtifacts(resolvedRoot, config, scan, existingRoot, configWriteRelative);
  if (action === 'validate') {
    const errors = [];
    const warnings = [];
    const stateFile = path.join(resolvedRoot, STATE_RELATIVE_PATH);
    const legacyStateFile = path.join(resolvedRoot, LEGACY_STATE_RELATIVE_PATH);
    const resolvedStateFile = fs.existsSync(stateFile) ? stateFile : legacyStateFile;
    if (!fs.existsSync(resolvedStateFile)) {
      errors.push({ code: 'STATE_MISSING', file: STATE_RELATIVE_PATH, message: '缺少 Claude 分层扫描快照。' });
    } else {
      const previousState = readJson(resolvedStateFile);
      if (previousState.architectureDigest !== scan.architectureDigest) {
        errors.push({ code: 'STATE_DRIFT', file: STATE_RELATIVE_PATH, message: '源码或配置的分层证据已变化；请运行 claude-layer sync。' });
      }
      errors.push(...validateManagedArtifacts(resolvedRoot, previousState));
    }
    const architecture = validateArchitectureContract({ root: resolvedRoot, layout: config.layout });
    errors.push(...architecture.errors.map((finding) => ({
      code: 'ARCHITECTURE', ruleId: finding.ruleId, file: finding.file, line: finding.line, message: finding.message
    })));
    for (const item of scan.unverified) {
      const finding = { code: 'UNVERIFIED_PATH', file: item.file, message: item.reason };
      if (strict || config.strict) errors.push(finding);
      else warnings.push(finding);
    }
    return {
      success: errors.length === 0,
      action,
      changed: false,
      scan,
      errors,
      warnings: [...warnings, ...migrationWarnings],
      writes: [],
      exitCode: errors.length ? 1 : 0
    };
  }

  const changes = planArtifacts(resolvedRoot, artifacts);
  const writes = write ? writeArtifacts(resolvedRoot, artifacts, changes) : [];
  return {
    success: true,
    action,
    changed: changes.length > 0,
    changes,
    scan,
    errors: [],
    warnings: [...scan.unverified.map((item) => ({ code: 'UNVERIFIED_PATH', file: item.file, message: item.reason })), ...migrationWarnings],
    writes,
    state,
    exitCode: 0
  };
}

module.exports = {
  CONFIG_RELATIVE_PATH,
  LEGACY_CONFIG_RELATIVE_PATH,
  STATE_RELATIVE_PATH,
  LEGACY_STATE_RELATIVE_PATH,
  RULES_RELATIVE_DIRECTORY,
  REPORT_RELATIVE_PATH,
  LEGACY_LAYOUT_MAP,
  normalizeLayoutKeys,
  createDefaultConfig,
  runClaudeLayer,
  scanProject
};
