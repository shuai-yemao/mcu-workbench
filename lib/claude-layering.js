const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { validateArchitectureContract } = require('./architecture-contract');

const CONFIG_RELATIVE_PATH = '.mcu-workbench/claude-layering.json';
const STATE_RELATIVE_PATH = '.mcu-workbench/claude-layering.state.json';
const RULES_RELATIVE_DIRECTORY = '.claude/rules/mcu-workbench';
const REPORT_RELATIVE_PATH = 'docs/architecture/claude-layer-map.md';
const ROOT_MANAGED_START = '<!-- mcu-workbench:managed:start -->';
const ROOT_MANAGED_END = '<!-- mcu-workbench:managed:end -->';
const SOURCE_EXTENSION = /\.(?:c|h|cc|cpp|cxx|hpp)$/i;
const SKIPPED_DIRECTORIES = new Set(['.git', '.mcu-workbench', '.claude', 'build', 'cmake-build-debug', 'node_modules']);

const LAYERS = [
  {
    id: 'app', name: 'APP', patterns: [/(?:^|\/)(?:App|Application|User_Task)(?:\/|$)/i],
    responsibility: '启动、任务编排与业务逻辑；只能依赖下层公开契约。',
    allowed: 'Middleware 公共 API、OS Wrapper、BSP Wrapper。',
    forbidden: 'HAL、原生 RTOS API、BSP Port、Handler、Driver 与 Core 私有实现。'
  },
  {
    id: 'middleware', name: 'Middleware', patterns: [/(?:^|\/)Middlewares?(?:\/|$)/i],
    responsibility: '通用中间件能力与对上公共 API。',
    allowed: 'Middleware 自身公共接口、OS Wrapper 与 BSP Wrapper。',
    forbidden: 'HAL、原生 RTOS API、BSP Port、具体 Driver 与 Core 私有实现。'
  },
  {
    id: 'os', name: 'OS', patterns: [/(?:^|\/)(?:OS|System|os_adapter)(?:\/|$)/i],
    responsibility: 'OS Wrapper、OS Port 与 RTOS 资源边界。',
    allowed: 'OS 内部 Port 实现、BSP Wrapper 与已确认的 RTOS 配置。',
    forbidden: '业务状态、器件协议状态机与未经封装的上层硬件调用。'
  },
  {
    id: 'bsp', name: 'BSP', patterns: [/(?:^|\/)Bsp(?:\/|$)/i, /(?:^|\/)BSP(?:\/|$)/],
    responsibility: 'Wrapper、Port、Handler 与设备 Driver 的装配边界。',
    allowed: 'BSP Wrapper 的稳定 API；Port 可绑定已确认的 Core、Driver、Handler 与 OSAL 对象。',
    forbidden: 'Wrapper 包含 Port、HAL、Core、Driver、Handler 或 RTOS 具体头；Port 保存业务缓存。'
  },
  {
    id: 'core', name: 'Core', patterns: [/(?:^|\/)Core(?:\/|$)/i],
    responsibility: 'MCU 外设、总线和底层公共能力。',
    allowed: '已确认的平台实现与私有后端。',
    forbidden: 'APP 业务、UI、设备协议状态机和对外暴露厂商句柄。'
  },
  {
    id: 'driver', name: 'Driver', patterns: [/(?:^|\/)Driver(?:\/|$)/i],
    responsibility: '器件协议、寄存器序列与错误码。',
    allowed: 'Core 的公共总线能力与注入的操作表。',
    forbidden: '任务、队列、业务缓存、APP 依赖与板级绑定。'
  }
];

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
  return fs.existsSync(resolved) ? readJson(resolved) : null;
}

function isVendorPath(relative) {
  return /(?:^|\/)(?:Vendor|Third_Party|ThirdParty|third-party|external)(?:\/|$)/i.test(relative)
    || /(?:^|\/)Drivers\/(?:CMSIS|STM32[^/]*_HAL_Driver)(?:\/|$)/i.test(relative);
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
  if (isVendorPath(relative)) return null;
  for (const layer of LAYERS) {
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
      if (!isVendorPath(relative)) unverified.push({ file: relative, reason: '无法从目录映射确认层归属' });
      continue;
    }
    const content = readText(path.join(resolvedRoot, relative));
    const layer = layerData[layerId];
    const directory = firstDirectory(relative);
    if (!layer.directories.includes(directory)) layer.directories.push(directory);
    layer.files.push({ path: relative });
    const includeExpression = /^\s*#\s*include\s*[<"]([^>"]+)[>"]/gm;
    for (const match of content.matchAll(includeExpression)) {
      layer.references.push({ file: relative, line: lineNumber(content, match.index), include: match[1] });
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
  return `${ROOT_MANAGED_START}\n\n# MCU Workbench 嵌入式工程约束\n\n${agentImport}## 工程事实\n\n- 构建系统：${buildSystems}\n- 平台与 RTOS 证据：${scan.project.platformEvidence.map((item) => `\`${item.file}\` (${item.kind})`).join('、') || '未确认'}\n- 分层扫描快照：\`${STATE_RELATIVE_PATH}\`\n\n## 分层总则\n\n- 层归属：APP、Middleware、OS、BSP、Core、Driver。\n- Adapter 仅存在于 OS 与 BSP，并由 Wrapper 和 Port 组成。\n- APP 只能调用 Middleware 公共 API、OS Wrapper 与 BSP Wrapper。\n- BSP Wrapper 平台无关；BSP Port 才可绑定具体 Driver、Handler、Core 与 OSAL 对象。\n- Handler 拥有工作循环、缓存、重试与回调；Port 不保存业务缓存。\n\n## 验证\n\n1. 运行 \`mcu-workbench claude-layer validate --root .\`。\n2. 再运行项目已确认的构建或测试入口。\n3. 静态检查、主机测试、目标构建和实机验证必须分别报告。\n\n## 未确认项\n\n${unverified}\n\n${ROOT_MANAGED_END}\n`;
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

function buildArtifacts(root, config, scan, existingRoot, includeConfig) {
  const artifacts = {};
  if (includeConfig) artifacts[CONFIG_RELATIVE_PATH] = `${JSON.stringify(config, null, 2)}\n`;
  artifacts.CLAUDE = renderRoot(scan, existingRoot);
  artifacts[`${RULES_RELATIVE_DIRECTORY}/00-project.md`] = renderProjectRule(scan);
  for (const layer of LAYERS) {
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
  return changes;
}

function writeArtifacts(root, artifacts, changes) {
  for (const change of changes) {
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
  const scan = scanProject({ root: resolvedRoot, config });
  if (action === 'scan') return { success: true, action, changed: false, scan, writes: [], errors: [], warnings: [], exitCode: 0 };

  const existingRoot = readText(path.join(resolvedRoot, 'CLAUDE.md'));
  const { artifacts, state } = buildArtifacts(resolvedRoot, config, scan, existingRoot, action === 'init' && !loadedConfig);
  if (action === 'validate') {
    const errors = [];
    const warnings = [];
    const stateFile = path.join(resolvedRoot, STATE_RELATIVE_PATH);
    if (!fs.existsSync(stateFile)) {
      errors.push({ code: 'STATE_MISSING', file: STATE_RELATIVE_PATH, message: '缺少 Claude 分层扫描快照。' });
    } else {
      const previousState = readJson(stateFile);
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
      warnings,
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
    warnings: scan.unverified.map((item) => ({ code: 'UNVERIFIED_PATH', file: item.file, message: item.reason })),
    writes,
    state,
    exitCode: 0
  };
}

module.exports = {
  CONFIG_RELATIVE_PATH,
  STATE_RELATIVE_PATH,
  RULES_RELATIVE_DIRECTORY,
  REPORT_RELATIVE_PATH,
  createDefaultConfig,
  runClaudeLayer,
  scanProject
};
