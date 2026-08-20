const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { validateArchitectureContract } = require('./architecture-contract');

const CONFIG_RELATIVE_PATH = '.mcu-workbench/claude-layer.json';
const QUALITY_CLANG_FORMAT_RELATIVE_PATH = '.clang-format';
const QUALITY_CLANG_FORMAT_SOURCE_PATH = path.join(
  __dirname,
  '..',
  'skills',
  'tools',
  'tools-quality',
  'references',
  'capabilities',
  'quality-format-check',
  '.clang-format'
);
const LEGACY_CONFIG_RELATIVE_PATH = '.mcu-workbench/claude-layering.json';
const STATE_RELATIVE_PATH = '.mcu-workbench/claude-layer.state.json';
const LEGACY_STATE_RELATIVE_PATH = '.mcu-workbench/claude-layering.state.json';
const RULES_RELATIVE_DIRECTORY = '.mcu-workbench/rules/mcu-workbench';
const REPORT_RELATIVE_PATH = '.mcu-workbench/architecture/claude-layer-map.md';
const LEGACY_RULES_RELATIVE_DIRECTORY = '.claude/rules/mcu-workbench';
const LEGACY_REPORT_RELATIVE_PATH = 'docs/architecture/claude-layer-map.md';
const ROOT_CLAUDE_FILE = 'Claude.md';
const LEGACY_ROOT_CLAUDE_FILE = 'CLAUDE.md';
const ROOT_MANAGED_START = '<!-- mcu-workbench:managed:start -->';
const ROOT_MANAGED_END = '<!-- mcu-workbench:managed:end -->';
const README_MANAGED_START = '<!-- mcu-workbench:readme-managed:start -->';
const README_MANAGED_END = '<!-- mcu-workbench:readme-managed:end -->';
const SOURCE_EXTENSION = /\.(?:c|h|cc|cpp|cxx|hpp)$/i;
const SKIPPED_DIRECTORIES = new Set(['.git', '.mcu-workbench', '.claude', 'build', 'cmake-build-debug', 'node_modules']);
const README_IGNORED_FILES = new Set(['README.md', ROOT_CLAUDE_FILE, LEGACY_ROOT_CLAUDE_FILE, QUALITY_CLANG_FORMAT_RELATIVE_PATH]);
const DEFAULT_README_ROOTS = ['00_Config', '00_Docs', '01_App', '02_Service', '03_Platform', '04_Impl', '05_Vendor', '06_Toolchain', '99_Utils'];
const DEFAULT_README_EXCLUDED_DIRECTORIES = ['00_文档', 'build'];
const CLAUDE_RULE_PROFILE = 'mcu-workbench-five-layer-v1';
const DEFAULT_LAYER_ROOTS = {
  app: ['01_App'],
  service: ['02_Service'],
  platform: ['03_Platform'],
  impl: ['04_Impl'],
  vendor: ['05_Vendor']
};
const GENERIC_LAYER_PATHS = {
  app: ['01_App/**/*.{c,h,cc,cpp,cxx,hpp}'],
  service: ['02_Service/**/*.{c,h,cc,cpp,cxx,hpp}'],
  platform: ['03_Platform/**/*.{c,h,cc,cpp,cxx,hpp}'],
  impl: ['04_Impl/**/*.{c,h,cc,cpp,cxx,hpp}'],
  vendor: ['05_Vendor/**/*.{c,h,cc,cpp,cxx,hpp}']
};
const README_LAYER_GUIDANCE = {
  '工程根目录': {
    key: 'root',
    what: '工程总入口，帮助读者理解项目目标、启动路径、软件分层和验证入口。',
    responsibility: '说明整个固件工程如何由 App、Service、Platform、Impl 和 Vendor 协作完成。',
    allowed: '各层通过公开接口和明确的组合根连接。',
    forbidden: '不能把目录索引当作架构事实，也不能把静态扫描结果写成已完成的构建或实机验证。'
  },
  App: {
    key: 'app',
    what: '产品业务入口，负责场景编排、任务协作、状态机和用户交互。',
    responsibility: '组织产品要做什么，并通过 Service 使用业务能力。',
    allowed: 'Service 层公开业务接口。',
    forbidden: 'HAL、寄存器、原生 RTOS、Platform 实现、Impl 和 Vendor 符号。'
  },
  Service: {
    key: 'service',
    what: '面向业务的稳定服务层，把产品需求转化为可复用的业务策略。',
    responsibility: '维护业务模型、状态、故障策略和服务流程。',
    allowed: 'Platform 公开能力接口和其他 Service。',
    forbidden: '芯片绑定、HAL、Vendor 头文件和 Impl 实现细节。'
  },
  Platform: {
    key: 'platform',
    what: '平台能力契约层，为上层提供与芯片实现无关的接口、类型和错误码。',
    responsibility: '定义能力、Ops、Context、对象协议和稳定的调用边界。',
    allowed: '标准类型、平台公共类型和无芯片依赖的公共实现。',
    forbidden: '芯片头文件、HAL、RTOS 类型，以及把具体硬件绑定写进 Platform。'
  },
  Impl: {
    key: 'impl',
    what: '具体实现层，把 Platform 能力绑定到 MCU、板卡、OS、BSP 和 Handler。',
    responsibility: '处理硬件资源、HAL/RTOS 适配、实例生命周期、队列、重试和回调机制。',
    allowed: 'Platform 接口、Vendor 底座和已确认的板级资源。',
    forbidden: '被 App 越层直调、反向定义 Platform 契约，或承载业务策略。'
  },
  Vendor: {
    key: 'vendor',
    what: '厂家或第三方底座，例如 HAL、CMSIS、FreeRTOS、LVGL、FatFs 和 SDK。',
    responsibility: '提供可追溯的第三方能力，并通过映射和 patch 接入工程。',
    allowed: '底座自身的内部依赖和官方扩展机制。',
    forbidden: '反向调用 App、Service、Platform 或 Impl；未经记录直接修改第三方源码。'
  },
  '未归类': {
    key: 'unknown',
    what: '当前目录尚未通过目录映射或源码证据确认所属架构层。',
    responsibility: '先补充目录定位和依赖证据，再决定它属于哪个架构层。',
    allowed: '仅允许经过确认的依赖。',
    forbidden: '不得根据文件名猜测层归属，也不得把未确认内容写成架构事实。'
  }
};
const CLAUDE_CREATION_ORDER = [
  'design-rules',
  'confirm-rules',
  'bootstrap-claude-files',
  'generate-project-skeleton',
  'sync-and-validate'
];

const LAYERS = [
  {
    id: 'app', name: 'App', patterns: [
      /(?:^|\/)01_App(?:\/|$)/i,
      /(?:^|\/)(?:App|Application|User_Task)(?:\/|$)/i
    ],
    responsibility: '产品业务流程：场景编排、任务协作、状态机和用户交互；只依赖 Service。',
    allowed: '仅 Service 层的公开业务接口。',
    forbidden: 'HAL、Platform 实现、Impl 与 Vendor 的任何符号；不得直接触碰寄存器/外设/RTOS。'
  },
  {
    id: 'service', name: 'Service', patterns: [
      /(?:^|\/)02_Service(?:\/|$)/i,
      /(?:^|\/)service_[^/]*(?:\/|$)/i,
      /(?:^|\/)(?:Service|Services)(?:\/|$)/i
    ],
    responsibility: '面向业务的稳定服务：承载业务策略、模型、状态、故障处理和服务流程。',
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
    responsibility: '厂家和第三方底座：提供 HAL、CMSIS、RTOS、第三方库和 SDK 能力；源码不复制、只登记映射。',
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

function createDefaultConfig(root) {
  return {
    schemaVersion: 1,
    strict: false,
    layout: {},
    architecture: {
      profile: CLAUDE_RULE_PROFILE,
      rulesConfirmed: false
    },
    managed: {
      rulesDirectory: RULES_RELATIVE_DIRECTORY,
      report: REPORT_RELATIVE_PATH,
      rootMarkers: [ROOT_MANAGED_START, ROOT_MANAGED_END]
    }
  };
}

function normalizeArchitectureConfig(config) {
  const defaults = createDefaultConfig().architecture;
  const original = config.architecture || {};
  const normalized = {
    profile: typeof original.profile === 'string' && original.profile.trim()
      ? original.profile
      : defaults.profile,
    rulesConfirmed: original.rulesConfirmed === true
  };
  return {
    config: { ...config, architecture: normalized },
    migrated: !config.architecture
      || normalized.profile !== original.profile
      || normalized.rulesConfirmed !== original.rulesConfirmed
  };
}

function normalizeManagedConfig(config) {
  const defaults = createDefaultConfig().managed;
  const original = config.managed || {};
  const normalized = {
    ...original,
    rulesDirectory: RULES_RELATIVE_DIRECTORY,
    report: REPORT_RELATIVE_PATH,
    rootMarkers: Array.isArray(original.rootMarkers) ? original.rootMarkers : defaults.rootMarkers
  };
  return {
    config: { ...config, managed: normalized },
    migrated: !config.managed
      || original.rulesDirectory !== normalized.rulesDirectory
      || original.report !== normalized.report
      || JSON.stringify(original.rootMarkers) !== JSON.stringify(normalized.rootMarkers)
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

function readmeRelativePath(directory) {
  return directory ? `${directory}/README.md` : 'README.md';
}

function directoryLayer(relative, config) {
  if (!relative) return '工程根目录';
  const layerId = classifyFile(`${relative}/__directory__.c`, config);
  return LAYERS.find((layer) => layer.id === layerId)?.name || '未归类';
}

function cleanMarkdownCell(value) {
  return String(value || '')
    .replace(/[|\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sourceBrief(content) {
  const lines = String(content || '').split(/\r?\n/).slice(0, 80);
  const brief = lines.find((line) => /@brief\b/i.test(line));
  if (brief) {
    return {
      text: cleanMarkdownCell(brief.replace(/^.*?@brief\s*/i, '').replace(/\*\/.*$/, '')),
      evidence: '源码注释'
    };
  }
  const fileDescription = lines.find((line) => /@file\b/i.test(line));
  if (fileDescription) {
    return {
      text: cleanMarkdownCell(fileDescription.replace(/^.*?@file\s*/i, '').replace(/\*\/.*$/, '')),
      evidence: '源码注释'
    };
  }
  return { text: '', evidence: '文件名/目录结构推断' };
}

function extractIncludes(content) {
  const includes = [];
  const expression = /^\s*#\s*include\s*[<"]([^>"]+)[>"]/gm;
  for (const match of String(content || '').matchAll(expression)) {
    if (!includes.includes(match[1])) includes.push(match[1]);
  }
  return includes;
}

function extractSymbols(content) {
  const isUseful = (symbol) => {
    const normalized = String(symbol || '').replace(/\(\)$/, '');
    return Boolean(normalized)
      && !['if', 'for', 'while', 'switch', 'sizeof', 'return', 'void', 'func', 'volatile'].includes(normalized)
      && !/^__.*_H__$/i.test(normalized)
      && !/_H$/i.test(normalized)
      && !/^_+PLATFORM_.*_H_+$/i.test(normalized);
  };
  const macroSymbols = [];
  const functionSymbols = [];
  const typeSymbols = [];
  const add = (collection, symbol) => {
    if (isUseful(symbol) && !collection.includes(symbol)) collection.push(symbol);
  };
  const macroExpression = /^\s*#\s*define\s+([A-Za-z_]\w*)/gm;
  for (const match of String(content || '').matchAll(macroExpression)) add(macroSymbols, match[1]);
  const functionExpression = /\b([A-Za-z_]\w*)\s*\([^;{}\n]*\)\s*(?:;|\{)/g;
  for (const match of String(content || '').matchAll(functionExpression)) {
    add(functionSymbols, `${match[1]}()`);
  }
  const typeExpression = /\b(?:typedef\s+[^;]+?\s+|enum\s+|struct\s+|union\s+)([A-Za-z_]\w*)\s*(?:;|\{)/g;
  for (const match of String(content || '').matchAll(typeExpression)) add(typeSymbols, match[1]);
  return [...functionSymbols, ...typeSymbols, ...macroSymbols].slice(0, 10);
}

function inferredFileRole(relative, extension) {
  const normalized = relative.toLowerCase();
  if (normalized.endsWith('.md')) return '说明文档';
  if (normalized.includes('/inc/') || normalized.startsWith('inc/')) {
    if (normalized.includes('internal')) return '内部头文件';
    if (normalized.includes('config')) return '配置头文件';
    if (normalized.includes('error')) return '错误码头文件';
    if (normalized.includes('type')) return '类型契约头文件';
    return '公共头文件';
  }
  if (normalized.includes('/src/') || normalized.startsWith('src/')) return '实现源码';
  if (extension === '.h' || extension === '.hpp') return '头文件';
  if (extension === '.c' || extension === '.cc' || extension === '.cpp' || extension === '.cxx') return '实现源码';
  if (normalized.endsWith('.ioc')) return 'CubeMX 配置文件';
  if (normalized.endsWith('.cmake') || path.basename(normalized) === 'cmakelists.txt') return 'CMake 构建文件';
  if (normalized.endsWith('.json') || normalized.endsWith('.yaml') || normalized.endsWith('.yml')) return '工程配置文件';
  return '工程文件';
}

function inferredFileDescription(relative, role) {
  const base = path.basename(relative, path.extname(relative));
  const normalized = base.toLowerCase();
  if (role === '公共头文件') return '向模块外提供稳定的类型、接口或宏声明。';
  if (role === '内部头文件') return '为当前模块内部实现提供私有声明或适配接口。';
  if (role === '配置头文件') return '集中表达编译期配置和能力开关。';
  if (role === '错误码头文件') return '集中定义或映射当前模块的错误状态。';
  if (role === '类型契约头文件') return '集中定义模块间共享的数据类型和句柄协议。';
  if (role === '实现源码') return `实现 ${base} 对应的模块行为、状态或资源管理。`;
  if (role === 'CubeMX 配置文件') return '记录芯片、外设或工程生成配置，具体内容以文件字段为准。';
  if (role === 'CMake 构建文件') return '定义当前目录的源文件、头文件、编译选项或目标组织方式。';
  if (role === '工程配置文件') return `记录 ${base} 相关的工程配置。`;
  return `记录 ${base} 相关的工程内容。`;
}

function summarizeFile(absolute, relative) {
  const extension = path.extname(relative).toLowerCase();
  const role = inferredFileRole(relative, extension);
  const content = SOURCE_EXTENSION.test(relative) || ['.cmake', '.ioc', '.json', '.yaml', '.yml'].includes(extension)
    ? readText(absolute)
    : '';
  const brief = sourceBrief(content);
  const includes = extractIncludes(content);
  const symbols = extractSymbols(content);
  return {
    path: path.basename(relative),
    relative,
    role,
    description: brief.text || inferredFileDescription(relative, role),
    evidence: brief.text ? brief.evidence : '文件名/目录结构推断',
    includes,
    symbols
  };
}

function childDirectoryRole(name) {
  const normalized = name.toLowerCase();
  if (normalized === 'inc' || normalized === 'include' || normalized === 'public') return '公共接口与类型';
  if (normalized === 'src' || normalized === 'source') return '实现源码';
  if (normalized === 'test' || normalized === 'tests') return '测试与验证';
  if (normalized === 'doc' || normalized === 'docs') return '说明文档';
  if (normalized.includes('config')) return '配置与工程参数';
  if (normalized.includes('internal') || normalized.includes('private')) return '内部实现';
  return '根据目录名推断，需结合下级 README 和源码确认。';
}

function summarizeChildDirectory(absolute, name, relative, excluded) {
  const childAbsolute = path.join(absolute, name);
  const entries = fs.readdirSync(childAbsolute, { withFileTypes: true });
  const directFileCount = entries.filter((entry) => entry.isFile()
    && !README_IGNORED_FILES.has(entry.name)).length;
  const childDirectoryCount = entries.filter((entry) => entry.isDirectory() && !excluded.has(entry.name)).length;
  return {
    name,
    directFileCount,
    childDirectoryCount,
    readme: fs.existsSync(path.join(childAbsolute, 'README.md')),
    role: childDirectoryRole(name),
    relative: relative ? `${relative}/${name}` : name
  };
}

function readmeDirectoryEntries(root, config) {
  const readmeConfig = config.readme || createDefaultConfig(root).readme;
  if (readmeConfig.enabled === false) return { entries: [], missingRoots: [] };

  const entries = new Map();
  const missingRoots = [];
  const excluded = new Set(readmeConfig.excludeDirectories || []);
  const isExcluded = (name, parentRelative = '') => SKIPPED_DIRECTORIES.has(name)
    || excluded.has(name)
    || (!parentRelative && name === 'docs');
  const addDirectory = (absolute, relative, depth) => {
    const directoryName = path.basename(absolute);
    if (relative && isExcluded(directoryName, path.dirname(relative) === '.' ? '' : path.dirname(relative))) return;
    const normalizedRelative = toPosix(relative);
    if (!entries.has(normalizedRelative)) {
      const childDirectories = fs.readdirSync(absolute, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .filter((entry) => !isExcluded(entry.name, normalizedRelative))
        .map((entry) => entry.name)
        .sort();
      const directFileCount = fs.readdirSync(absolute, { withFileTypes: true })
        .filter((entry) => entry.isFile() && !README_IGNORED_FILES.has(entry.name)).length;
      const directFiles = fs.readdirSync(absolute, { withFileTypes: true })
        .filter((entry) => entry.isFile() && !README_IGNORED_FILES.has(entry.name))
        .map((entry) => summarizeFile(path.join(absolute, entry.name), entry.name))
        .sort((left, right) => left.path.localeCompare(right.path));
      const childDirectoryDetails = childDirectories
        .map((name) => summarizeChildDirectory(absolute, name, normalizedRelative, excluded));
      entries.set(normalizedRelative, {
        path: normalizedRelative,
        readme: fs.existsSync(path.join(absolute, 'README.md')),
        layer: directoryLayer(normalizedRelative, config),
        childDirectories,
        childDirectoryDetails,
        directFileCount,
        directFiles
      });
    }
    if (depth >= readmeConfig.maxDepth) return;
    for (const child of fs.readdirSync(absolute, { withFileTypes: true })) {
      if (!child.isDirectory()) continue;
      if (isExcluded(child.name, normalizedRelative)) continue;
      addDirectory(path.join(absolute, child.name), relative ? path.join(relative, child.name) : child.name, depth + 1);
    }
  };

  entries.set('', {
    path: '',
    readme: fs.existsSync(path.join(root, 'README.md')),
    layer: directoryLayer('', config),
    childDirectories: fs.readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .filter((entry) => !isExcluded(entry.name))
      .map((entry) => entry.name)
      .sort(),
    childDirectoryDetails: fs.readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .filter((entry) => !isExcluded(entry.name))
      .map((entry) => summarizeChildDirectory(root, entry.name, '', excluded)),
    directFileCount: fs.readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isFile() && !README_IGNORED_FILES.has(entry.name)).length,
    directFiles: fs.readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isFile() && !README_IGNORED_FILES.has(entry.name))
      .map((entry) => summarizeFile(path.join(root, entry.name), entry.name))
      .sort((left, right) => left.path.localeCompare(right.path))
  });

  for (const configuredRoot of readmeConfig.roots || []) {
    const relativeRoot = toPosix(path.normalize(String(configuredRoot))).replace(/^\.\//, '');
    const absoluteRoot = path.resolve(root, relativeRoot);
    const outsideRoot = path.relative(root, absoluteRoot).startsWith('..');
    if (outsideRoot || !fs.existsSync(absoluteRoot) || !fs.statSync(absoluteRoot).isDirectory()) {
      missingRoots.push(relativeRoot);
      continue;
    }
    addDirectory(absoluteRoot, relativeRoot, 0);
  }

  const resolvedEntries = [...entries.values()].map((entry) => ({
    ...entry,
    childDirectoryDetails: entry.childDirectoryDetails.map((child) => ({
      ...child,
      managed: entries.has(child.relative)
    }))
  }));
  return {
    entries: resolvedEntries.sort((left, right) => left.path.localeCompare(right.path)),
    missingRoots: missingRoots.sort()
  };
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
    unverified,
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

function renderRootManaged(existingRoot) {
  return `${ROOT_MANAGED_START}\n\n# MCU Workbench 通用嵌入式工程约束\n\n## 规则定位\n\n本文件是项目创建阶段生成的通用协作规则。它只定义稳定的架构、接口、资源和验证约束，不记录具体项目的芯片、RTOS、目录映射、源码路径或 include 证据。\n\n若工程存在 AGENTS.md，先读取其宿主约束；项目实际扫描事实请查看 docs/architecture/claude-layer-map.md。\n\n## 分层总则\n\n- 依赖方向：App → Service → Platform ← Impl → Vendor。\n- App 负责编排业务场景，只依赖 Service 公开接口。\n- Service 承载业务策略、模型、状态和故障处理，不绑定芯片或底层实现。\n- Platform 定义稳定的能力接口、类型、错误码、Ops、Context 和对象协议。\n- Impl 负责 MCU、板卡、OS、BSP、Handler 和资源生命周期适配。\n- Vendor 提供 HAL、CMSIS、RTOS、第三方库和 SDK 等底座，不反向调用上层。\n\n## 通用边界\n\n- 公共头文件只暴露稳定接口、必要类型和错误码；私有状态留在实现侧。\n- 接口必须说明所有权、生命周期、阻塞属性、ISR/DMA 限制、线程安全和失败状态。\n- 不得通过全局变量、私有结构体或底层类型绕过层间契约。\n- 机制放在 Impl/Handler，业务策略放在 Service；不得为了复用制造无验收价值的抽象。\n\n## 验证\n\n1. 运行 mcu-workbench claude-layer validate --root .。\n2. 再运行工程已确认的静态检查、主机测试或构建入口。\n3. 分别报告静态、主机、交叉构建、目标运行和实物证据，不得相互替代。\n\n## 项目事实边界\n\n项目构建系统、芯片、RTOS、目录映射、include 关系和未确认路径由扫描报告、状态快照和目录 README 管理，不写入本通用规则区块。\n\n${ROOT_MANAGED_END}\n`;
}

function renderRoot(root, existingRoot) {
  const managed = renderRootManaged(existingRoot)
    .replaceAll('docs/architecture/claude-layer-map.md', REPORT_RELATIVE_PATH);
  const managedWithAgent = fs.existsSync(path.join(root, 'AGENTS.md')) && !managed.includes('@AGENTS.md')
    ? managed.replace('## 规则定位', '@AGENTS.md\n\n## 规则定位')
    : managed;
  const manualRoot = removeManagedBlock(existingRoot);
  return manualRoot ? `${manualRoot}\n\n${managedWithAgent}` : managedWithAgent;
}

function readmeGuidance(entry) {
  const base = README_LAYER_GUIDANCE[entry.layer] || README_LAYER_GUIDANCE['未归类'];
  const normalized = (entry.path || '').toLowerCase();
  if (/(^|\/)inc$/.test(normalized)) {
    return {
      ...base,
      what: '公共头文件目录，集中放置其他模块可以使用的接口、类型和配置声明。',
      responsibility: '表达稳定的对外契约，不承载具体芯片实现、业务流程或私有状态。',
      forbidden: `${base.forbidden} 不应把私有实现细节暴露给调用者。`
    };
  }
  if (/(^|\/)src$/.test(normalized)) {
    return {
      ...base,
      what: '实现源码目录，负责把当前模块的公开接口落地为可维护、可验证的实现。',
      responsibility: '管理私有状态、资源生命周期、错误处理和必要的并发/时序控制。',
      forbidden: `${base.forbidden} 不应绕过当前模块的公开接口被其他层直接调用。`
    };
  }
  return base;
}

function readmeDirectoryType(entry) {
  if (!entry.path) return '工程根目录';
  const normalized = entry.path.toLowerCase();
  if (/(^|\/)inc$/.test(normalized)) return '公共头文件目录';
  if (/(^|\/)src$/.test(normalized)) return '实现源码目录';
  if (entry.path.split('/').length === 1) return '架构层目录';
  if (entry.layer === 'Vendor') return 'Vendor 组件目录';
  return '模块目录';
}

function readmeMermaid(entry, guidance) {
  const pathLabel = (entry.path || '工程根目录').replace(/["\r\n]/g, '');
  if (guidance.key === 'root') {
    return 'flowchart LR\n  APP[App] --> SERVICE[Service]\n  SERVICE --> PLATFORM[Platform]\n  IMPL[Impl] --> PLATFORM\n  IMPL --> VENDOR[Vendor]';
  }
  const nodeByKey = { app: 'APP', service: 'SERVICE', platform: 'PLATFORM', impl: 'IMPL', vendor: 'VENDOR' };
  const currentNode = nodeByKey[guidance.key];
  if (!currentNode) {
    return `flowchart LR\n  CURRENT["${pathLabel}"]:::current\n  CURRENT -.待确认归属.-> NEXT[架构层]`;
  }
  return `flowchart LR\n  APP[App] --> SERVICE[Service]\n  SERVICE --> PLATFORM[Platform]\n  IMPL[Impl] --> PLATFORM\n  IMPL --> VENDOR[Vendor]\n  CURRENT["当前目录：${pathLabel}"]:::current\n  CURRENT -.归属.-> ${currentNode}\n  classDef current fill:#e8f3ff,stroke:#2563eb,stroke-width:2px`;
}

function readmeEvidenceText(file) {
  return file.evidence === '源码注释' ? '源码注释' : '文件名/目录结构推断';
}

function renderReadmeChildDirectories(entry) {
  if (!entry.childDirectoryDetails.length) return '- 无';
  return entry.childDirectoryDetails.map((child) => {
    const readmeState = child.readme
      ? 'README 已存在'
      : (child.managed ? 'README 将由同步生成' : '未纳入当前 README 管理范围');
    return `| \`${child.name}/\` | ${child.role} | ${child.directFileCount} | ${child.childDirectoryCount} | ${readmeState} |`;
  }).join('\n');
}

function renderReadmeFiles(entry) {
  if (!entry.directFiles.length) return '当前目录没有需要单独说明的直接文件，主要内容位于上面的子目录中。';
  return entry.directFiles.map((file) => {
    const symbols = file.symbols.length ? file.symbols.map((symbol) => `\`${symbol}\``).join('、') : '未从源码中提取到稳定符号';
    const includes = file.includes.length ? file.includes.map((include) => `\`${include}\``).join('、') : '未发现直接 include';
    return `| \`${file.path}\` | ${file.role} | ${cleanMarkdownCell(file.description)} | ${symbols} | ${includes} | ${readmeEvidenceText(file)} |`;
  }).join('\n');
}

function readmeReadingOrder(entry) {
  const normalized = (entry.path || '').toLowerCase();
  if (!entry.path) return '先看本工程 README 和架构图，再按 App → Service → Platform → Impl → Vendor 追踪调用链；需要确认具体实现时进入对应模块的 inc/ 与 src/。';
  if (/(^|\/)inc$/.test(normalized)) return '先阅读公共类型、配置和错误码，再阅读能力头文件；调用者应以这里声明的接口为准，不应从 src 反推公共契约。';
  if (/(^|\/)src$/.test(normalized)) return '先回看同级或上级 inc/ 中的接口，再按初始化、主流程、错误处理和资源释放顺序阅读实现源码。';
  if (entry.layer === 'Vendor') return '先确认第三方组件版本、许可证和接入边界，再阅读当前目录的入口文件；除非有 patch 记录，不应把 Vendor 源码当作业务实现修改。';
  return '先阅读子目录 README 了解模块分工，再结合本页的文件表确认接口头文件、实现源码、配置文件和测试入口之间的关系。';
}

function renderReadme(scan, entry, existingReadme, manager = 'workflow-claude-layering') {
  const manualReadme = removeReadmeManagedBlock(existingReadme);
  const guidance = readmeGuidance(entry);
  const directory = entry.path || '.';
  const mermaidFence = String.fromCharCode(96).repeat(3);
  const apiCommand = manager === 'workflow-document-context'
    ? 'node scripts/document-context-api.js'
    : 'claude-layer';
  const managed = `${README_MANAGED_START}\n\n## MCU Workbench 目录说明\n\n### 这是什么\n\n${guidance.what}\n\n- 目录：\`${directory}\`\n- 类型：${readmeDirectoryType(entry)}\n- 架构层：${entry.layer}\n- 当前状态：目录索引和直接文件说明来自本次静态扫描；没有源码注释支持的职责会明确标为推断。\n\n### 在系统中的位置\n\n${mermaidFence}mermaid\n${readmeMermaid(entry, guidance)}\n${mermaidFence}\n\n### 主要职责\n\n${guidance.responsibility}\n\n### 依赖边界\n\n允许依赖：${guidance.allowed}\n\n禁止依赖：${guidance.forbidden}\n\n### 目录内容\n\n当前目录包含 ${entry.directFileCount} 个直接文件和 ${entry.childDirectories.length} 个直接子目录。下面的表格只列当前目录的直接内容；下级目录请打开对应 README 继续阅读。\n\n#### 子目录明细\n\n| 子目录 | 目录作用 | 直接文件数 | 下级目录数 | README 状态 |\n|---|---|---:|---:|---|\n${renderReadmeChildDirectories(entry)}\n\n#### 文件/模块说明\n\n| 文件 | 类型 | 作用/说明 | 关键接口、宏或类型 | 直接依赖 | 证据来源 |\n|---|---|---|---|---|---|\n${renderReadmeFiles(entry)}\n\n### 阅读顺序\n\n${readmeReadingOrder(entry)}\n\n### 修改与验证\n\n修改本目录前，先确认接口归属、资源所有权、生命周期、阻塞/ISR/DMA 和并发约束；涉及公共头文件时同步检查调用者和实现者。修改后运行 \`${apiCommand} sync --write --root <project-root>\` 更新文件说明，再运行 \`${apiCommand} validate --root <project-root>\`。静态结果不等同于目标构建或实机验证。\n\n> 本区块由 \`${manager}\` 生成；请保留手写说明，并通过对应 Skill 的同步入口更新自动内容。\n\n${README_MANAGED_END}\n`;
  return manualReadme ? `${manualReadme}\n\n${managed}` : managed;
}

function renderProjectRule() {
  const paths = ['CMakeLists.txt', '**/*.ioc', '**/FreeRTOSConfig.h'];
  return `---\npaths:\n${paths.map((item) => `  - "${item}"`).join('\n')}\n---\n\n# MCU Workbench 通用工程配置规则\n\n- 本规则只说明如何对构建、CubeMX 和 RTOS 配置进行证据化检查。\n- 工程创建后运行 \`mcu-workbench claude-layer scan --root .\` 查看实际证据，运行 \`sync --write\` 更新报告和状态。\n- 不得把尚未确认的配置、工具链或硬件结论写成已完成验证。\n- 具体项目事实保存在 \`${REPORT_RELATIVE_PATH}\`，不写入本规则。\n`;
}

function renderLayerRule(layer) {
  const paths = GENERIC_LAYER_PATHS[layer.id] || [];
  return `---\npaths:\n${paths.map((item) => `  - "${item}"`).join('\n')}\n---\n\n# ${layer.name} 通用规则\n\n## 责任\n\n${layer.responsibility}\n\n## 允许依赖\n\n- ${layer.allowed}\n\n## 禁止依赖\n\n- ${layer.forbidden}\n\n## 通用约束\n\n- 本文件是创建阶段生成的通用规则，不包含具体工程路径、源码 include、芯片、RTOS 或未确认文件清单。\n- 项目实际目录和依赖证据由 \`${REPORT_RELATIVE_PATH}\` 和 README 记录。\n- 修改后运行 \`mcu-workbench claude-layer validate --root .\`；分层静态检查不等同于目标板验证。\n`;
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
  if ([ROOT_CLAUDE_FILE, LEGACY_ROOT_CLAUDE_FILE].includes(relative)) return sha256(managedBlock(content) || '');
  return sha256(content);
}

function buildRuleDesign(config, scan) {
  return {
    profile: config.architecture.profile,
    rulesConfirmed: config.architecture.rulesConfirmed,
    status: config.architecture.rulesConfirmed ? 'confirmed' : 'awaiting-confirmation',
    dependencyDirection: 'App → Service → Platform ← Impl → Vendor',
    ruleMode: 'generic',
    projectEvidenceArtifacts: [REPORT_RELATIVE_PATH, STATE_RELATIVE_PATH],
    claudeFiles: [
      ROOT_CLAUDE_FILE,
      `${RULES_RELATIVE_DIRECTORY}/00-project.md`,
      `${RULES_RELATIVE_DIRECTORY}/10-app.md`,
      `${RULES_RELATIVE_DIRECTORY}/20-service.md`,
      `${RULES_RELATIVE_DIRECTORY}/30-platform.md`,
      `${RULES_RELATIVE_DIRECTORY}/40-impl.md`,
      `${RULES_RELATIVE_DIRECTORY}/50-vendor.md`,
      CONFIG_RELATIVE_PATH,
      QUALITY_CLANG_FORMAT_RELATIVE_PATH,
      STATE_RELATIVE_PATH
    ],
    creationOrder: CLAUDE_CREATION_ORDER,
    currentEvidence: {
      detectedLayerDirectories: Object.fromEntries(LAYERS.map((layer) => [layer.id, scan.layers[layer.id].directories])),
      unverified: scan.unverified
    }
  };
}

function buildArtifacts(root, config, scan, existingRoot, configWriteRelative, {
  bootstrap = false,
  qualityStyleWrite = false
} = {}) {
  const artifacts = {};
  if (configWriteRelative) artifacts[configWriteRelative] = `${JSON.stringify(config, null, 2)}\n`;
  if (qualityStyleWrite) artifacts[QUALITY_CLANG_FORMAT_RELATIVE_PATH] = fs.readFileSync(QUALITY_CLANG_FORMAT_SOURCE_PATH, 'utf8');
  artifacts.CLAUDE = renderRoot(root, existingRoot);
  artifacts[`${RULES_RELATIVE_DIRECTORY}/00-project.md`] = renderProjectRule();
  const ruleNumbers = { app: 10, service: 20, platform: 30, impl: 40, vendor: 50 };
  for (const layer of LAYERS) {
    artifacts[`${RULES_RELATIVE_DIRECTORY}/${String(ruleNumbers[layer.id]).padStart(2, '0')}-${layer.id}.md`] = renderLayerRule(layer);
  }
  artifacts[REPORT_RELATIVE_PATH] = renderReport(scan);
  const hashes = Object.fromEntries(Object.entries(artifacts).map(([relative, content]) => [relative === 'CLAUDE' ? ROOT_CLAUDE_FILE : relative, artifactHash(relative === 'CLAUDE' ? ROOT_CLAUDE_FILE : relative, content)]));
  const state = {
    schemaVersion: 1,
    owner: 'workflow-claude-layering',
    architectureDigest: scan.architectureDigest,
    artifactHashes: hashes,
    unverified: scan.unverified
  };
  artifacts[STATE_RELATIVE_PATH] = `${JSON.stringify(state, null, 2)}\n`;
  return { artifacts, state };
}

function absoluteArtifactPath(root, relative) {
  return path.join(root, relative === 'CLAUDE' ? ROOT_CLAUDE_FILE : relative);
}

function planArtifacts(root, artifacts) {
  const changes = [];
  for (const [relative, desired] of Object.entries(artifacts)) {
    const current = readText(absoluteArtifactPath(root, relative));
    if (current !== desired) changes.push({
      path: relative === 'CLAUDE' ? ROOT_CLAUDE_FILE : relative,
      operation: current ? 'modify' : 'create'
    });
  }
  // 清理当前统一管理目录下过期受管规则：仅处理匹配受管命名模式、
  // 且不在期望 artifacts 集合中的旧规则文件（如 20-middleware.md），不触碰用户文件。
  const rulesDirectory = path.join(root, RULES_RELATIVE_DIRECTORY);
  if (fs.existsSync(rulesDirectory)) {
    for (const entry of fs.readdirSync(rulesDirectory)) {
      if (!/^\d{2}-[a-z]+\.md$/.test(entry)) continue;
      const relative = `${RULES_RELATIVE_DIRECTORY}/${entry}`;
      if (artifacts[relative] === undefined) changes.push({ path: relative, operation: 'delete' });
    }
  }
  // 一次性迁移旧版分散目录：仅删除本插件旧路径下的受管规则和扫描报告，
  // 不删除 .claude/rules 下的其他用户规则，也不删除 docs/architecture 下的其他文档。
  const legacyRulesDirectory = path.join(root, LEGACY_RULES_RELATIVE_DIRECTORY);
  if (fs.existsSync(legacyRulesDirectory)) {
    for (const entry of fs.readdirSync(legacyRulesDirectory)) {
      if (/^\d{2}-[a-z]+\.md$/.test(entry)) {
        changes.push({ path: `${LEGACY_RULES_RELATIVE_DIRECTORY}/${entry}`, operation: 'delete' });
      }
    }
  }
  const legacyReport = path.join(root, LEGACY_REPORT_RELATIVE_PATH);
  if (fs.existsSync(legacyReport)) changes.push({ path: LEGACY_REPORT_RELATIVE_PATH, operation: 'delete' });
  return changes;
}

function writeArtifacts(root, artifacts, changes) {
  for (const change of changes) {
    if (change.operation === 'delete') {
      fs.unlinkSync(absoluteArtifactPath(root, change.path));
      continue;
    }
    const key = change.path === ROOT_CLAUDE_FILE ? 'CLAUDE' : change.path;
    writeText(absoluteArtifactPath(root, key), artifacts[key]);
  }
  const legacyRulesDirectory = path.join(root, LEGACY_RULES_RELATIVE_DIRECTORY);
  if (fs.existsSync(legacyRulesDirectory) && fs.readdirSync(legacyRulesDirectory).length === 0) {
    fs.rmdirSync(legacyRulesDirectory);
  }
  const legacyReportDirectory = path.join(root, path.dirname(LEGACY_REPORT_RELATIVE_PATH));
  if (fs.existsSync(legacyReportDirectory) && fs.readdirSync(legacyReportDirectory).length === 0) {
    fs.rmdirSync(legacyReportDirectory);
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

function runClaudeLayer({
  action,
  root,
  write = false,
  strict = false,
  configPath,
  rulesConfirmed = false
} = {}) {
  const resolvedRoot = path.resolve(root || process.cwd());
  if (!fs.existsSync(resolvedRoot)) throw new Error(`固件根目录不存在：${resolvedRoot}`);
  if (!['design', 'bootstrap', 'init', 'scan', 'sync', 'validate'].includes(action)) throw new Error('claude-layer action 必须是 design、bootstrap、init、scan、sync 或 validate。');
  const configFile = resolveConfigPath(resolvedRoot, configPath);
  const loadedConfig = loadConfig(resolvedRoot, configPath);
  if ((action === 'sync' || action === 'validate') && !loadedConfig) {
    throw new Error(`缺少 ${toPosix(path.relative(resolvedRoot, configFile))}；请先运行 claude-layer init。`);
  }
  const rawConfig = loadedConfig || createDefaultConfig(resolvedRoot);
  const normalizedArchitecture = normalizeArchitectureConfig(rawConfig);
  const architectureConfig = normalizedArchitecture.config;
  const normalizedManaged = normalizeManagedConfig(architectureConfig);
  const config = normalizedManaged.config;
  if (rulesConfirmed) config.architecture.rulesConfirmed = true;
  // 旧 layout 键（middleware/os/bsp/core/driver）读取时归一化到五层键，并输出迁移告警。
  const { layout: normalizedLayout, migrated: layoutMigrated } = normalizeLayoutKeys(config.layout || {});
  config.layout = normalizedLayout;
  const migrationWarnings = [];
  if (normalizedManaged.migrated && loadedConfig) {
    migrationWarnings.push({
      code: 'MANAGED_PATH_MIGRATED',
      message: 'Claude 管理产物已统一迁移到 .mcu-workbench/architecture 和 .mcu-workbench/rules/mcu-workbench。'
    });
  }
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
  if (action === 'design') {
    return {
      success: true,
      action,
      changed: false,
      design: buildRuleDesign(config, scan),
      scan,
      writes: [],
      errors: [],
      warnings: migrationWarnings,
      exitCode: 0
    };
  }
  if (action === 'bootstrap' && !config.architecture.rulesConfirmed) {
    return {
      success: false,
      action,
      changed: false,
      design: buildRuleDesign(config, scan),
      scan,
      writes: [],
      errors: [{
        code: 'RULES_NOT_CONFIRMED',
        message: '项目创建起始阶段禁止写入 Claude 文件；请先完成 design 规则确认，再使用 --rules-confirmed。'
      }],
      warnings: migrationWarnings,
      exitCode: 2
    };
  }
  if (action === 'scan') return { success: true, action, changed: false, scan, writes: [], errors: [], warnings: migrationWarnings, exitCode: 0 };

  const existingRoot = readText(path.join(resolvedRoot, ROOT_CLAUDE_FILE))
    || readText(path.join(resolvedRoot, LEGACY_ROOT_CLAUDE_FILE));
  const configWriteRelative = ((action === 'init' && !loadedConfig) || (action === 'bootstrap' && (!loadedConfig || rulesConfirmed)))
    ? CONFIG_RELATIVE_PATH
    : ((action === 'sync' && (layoutMigrated || normalizedManaged.migrated) && configSourceRelative) ? configSourceRelative : null);
  const qualityStyleWrite = action === 'init'
    || (action === 'bootstrap' && (!loadedConfig || rulesConfirmed));
  const { artifacts, state } = buildArtifacts(resolvedRoot, config, scan, existingRoot, configWriteRelative, {
    bootstrap: action === 'bootstrap',
    qualityStyleWrite
  });
  if (action === 'validate') {
    const errors = [];
    const warnings = [];
    const stateRelativePath = STATE_RELATIVE_PATH;
    const stateFile = path.join(resolvedRoot, stateRelativePath);
    const legacyStateFile = path.join(resolvedRoot, LEGACY_STATE_RELATIVE_PATH);
    const resolvedStateFile = fs.existsSync(stateFile) ? stateFile : legacyStateFile;
    if (!fs.existsSync(resolvedStateFile)) {
      errors.push({ code: 'STATE_MISSING', file: stateRelativePath, message: '缺少 Claude 分层扫描快照。' });
    } else {
      const previousState = readJson(resolvedStateFile);
      if (previousState.architectureDigest !== scan.architectureDigest) {
        errors.push({
          code: 'STATE_DRIFT',
          file: stateRelativePath,
          message: '源码或配置的分层证据已变化；请运行 claude-layer sync。'
        });
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
    ...(action === 'bootstrap' ? { creationOrder: CLAUDE_CREATION_ORDER } : {}),
    exitCode: 0
  };
}

module.exports = {
  CONFIG_RELATIVE_PATH,
  QUALITY_CLANG_FORMAT_RELATIVE_PATH,
  LEGACY_CONFIG_RELATIVE_PATH,
  STATE_RELATIVE_PATH,
  LEGACY_STATE_RELATIVE_PATH,
  RULES_RELATIVE_DIRECTORY,
  REPORT_RELATIVE_PATH,
  CLAUDE_RULE_PROFILE,
  DEFAULT_LAYER_ROOTS,
  CLAUDE_CREATION_ORDER,
  LEGACY_LAYOUT_MAP,
  normalizeLayoutKeys,
  normalizeArchitectureConfig,
  createDefaultConfig,
  runClaudeLayer,
  scanProject
};
