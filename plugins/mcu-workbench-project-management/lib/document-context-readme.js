const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DOCUMENT_CONTEXT_CONFIG_RELATIVE_PATH = '.mcu-workbench/document-context.json';
const DOCUMENT_CONTEXT_STATE_RELATIVE_PATH = '.mcu-workbench/document-context/readme.state.json';
const README_MANAGED_START = '<!-- mcu-workbench:readme-managed:start -->';
const README_MANAGED_END = '<!-- mcu-workbench:readme-managed:end -->';
const DEFAULT_README_ROOTS = ['00_Config', '00_Docs', '01_App', '02_Service', '03_Platform', '04_Impl', '05_Vendor', '06_Toolchain', '99_Utils'];
const DEFAULT_README_EXCLUDED_DIRECTORIES = ['00_文档', 'build'];
const SKIPPED_DIRECTORIES = new Set(['.git', '.mcu-workbench', '.claude', 'build', 'cmake-build-debug', 'node_modules']);
const SOURCE_EXTENSION = /\.(?:c|h|cc|cpp|cxx|hpp)$/i;

const GUIDANCE = {
  root: ['工程总入口，帮助读者理解项目目标、启动路径、软件分层和验证入口。', '说明整个固件工程如何由 App、Service、Platform、Impl 和 Vendor 协作完成。'],
  app: ['产品业务入口，负责场景编排、任务协作、状态机和用户交互。', '组织产品要做什么，并通过 Service 使用业务能力。'],
  service: ['面向业务的稳定服务层，把产品需求转化为可复用的业务策略。', '维护业务模型、状态、故障策略和服务流程。'],
  platform: ['平台能力契约层，为上层提供与芯片实现无关的接口、类型和错误码。', '定义能力、Ops、Context、对象协议和稳定的调用边界。'],
  impl: ['具体实现层，把 Platform 能力绑定到 MCU、板卡、OS、BSP 和 Handler。', '处理硬件资源、HAL/RTOS 适配、实例生命周期、队列、重试和回调机制。'],
  vendor: ['厂家或第三方底座，例如 HAL、CMSIS、FreeRTOS、LVGL、FatFs 和 SDK。', '提供可追溯的第三方能力，并通过映射和 patch 接入工程。'],
  unknown: ['当前目录尚未通过目录映射或源码证据确认所属架构层。', '先补充目录定位和依赖证据，再决定它属于哪个架构层。']
};

function sha256(value) { return crypto.createHash('sha256').update(String(value)).digest('hex'); }
function posix(value) { return value.replace(/\\/g, '/'); }
function readText(filePath, fallback = '') { return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : fallback; }
function writeText(filePath, content) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); fs.writeFileSync(filePath, content, 'utf8'); }
function defaultConfig() { return { schemaVersion: 1, strict: false, readme: { enabled: true, roots: DEFAULT_README_ROOTS, maxDepth: 2, excludeDirectories: DEFAULT_README_EXCLUDED_DIRECTORIES } }; }
function loadConfig(root, configPath) {
  const filePath = configPath ? path.resolve(root, configPath) : path.join(root, DOCUMENT_CONTEXT_CONFIG_RELATIVE_PATH);
  if (!fs.existsSync(filePath)) return { config: defaultConfig(), filePath, loaded: false };
  try { return { config: JSON.parse(fs.readFileSync(filePath, 'utf8')), filePath, loaded: true }; }
  catch (error) { const wrapped = new Error(`README 配置无法解析：${filePath}`); wrapped.code = 'CONFIG_JSON_INVALID'; wrapped.cause = error; throw wrapped; }
}
function layerFor(relative) {
  if (!relative) return ['工程根目录', 'root'];
  if (/^01_App(?:\/|$)|(?:^|\/)App(?:\/|$)/i.test(relative)) return ['App', 'app'];
  if (/^02_Service(?:\/|$)|(?:^|\/)Service(?:\/|$)/i.test(relative)) return ['Service', 'service'];
  if (/^03_Platform(?:\/|$)|platform_(?:common|mcu|os|bsp|middleware)/i.test(relative) || /(?:^|\/)Bsp\/Wrapper/i.test(relative)) return ['Platform', 'platform'];
  if (/^04_Impl(?:\/|$)|impl_(?:board|mcu|os|bsp)/i.test(relative) || /(?:^|\/)(?:Bsp|OS|Driver|Drivers|System)(?:\/|$)/i.test(relative)) return ['Impl', 'impl'];
  if (/^05_Vendor(?:\/|$)|(?:^|\/)(?:Vendor|Third_Party|ThirdParty|external|Middlewares?|FreeRTOS|CMSIS)(?:\/|$)/i.test(relative)) return ['Vendor', 'vendor'];
  return ['未归类', 'unknown'];
}
function clean(value) { return String(value || '').replace(/[|\r\n]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function summarizeFile(root, relative) {
  const content = readText(path.join(root, relative));
  const briefLine = content.split(/\r?\n/).slice(0, 80).find((line) => /@brief\b/i.test(line));
  const includes = [...content.matchAll(/^\s*#\s*include\s*[<"]([^>"]+)[>"]/gm)].map((m) => m[1]).filter((v, i, a) => a.indexOf(v) === i);
  const symbols = [...content.matchAll(/\b(?:int|void|char|bool|uint\d+_t|#define)\s+([A-Za-z_]\w*)/g)].map((m) => m[1]).filter((v, i, a) => a.indexOf(v) === i).slice(0, 12);
  const renderedSymbols = symbols.map((symbol) => new RegExp(`\\b${symbol}\\s*\\(`).test(content) ? `${symbol}()` : symbol);
  return { path: path.basename(relative), relative, role: /(?:^|\/)inc(?:\/|$)/i.test(relative) ? '公共接口与类型' : /(?:^|\/)src(?:\/|$)/i.test(relative) ? '实现源码' : '源码/配置文件', description: briefLine ? clean(briefLine.replace(/^.*?@brief\s*/i, '').replace(/\*\/.*$/, '')) : '根据文件名/目录结构推断，需结合源码确认。', evidence: briefLine ? '源码注释' : '文件名/目录结构推断', includes, symbols: renderedSymbols };
}
function childRole(name) { if (/^(inc|include|public)$/i.test(name)) return '公共接口与类型'; if (/^(src|source)$/i.test(name)) return '实现源码'; if (/^tests?$/i.test(name)) return '测试与验证'; if (/docs?/i.test(name)) return '说明文档'; return '根据目录名推断，需结合下级 README 和源码确认。'; }
function scanEntries(root, config) {
  const readme = config.readme || defaultConfig().readme;
  const excluded = new Set([...(readme.excludeDirectories || []), ...SKIPPED_DIRECTORIES]);
  const entries = new Map();
  const isExcluded = (name, atRoot) => excluded.has(name) || (atRoot && name === 'docs');
  const add = (absolute, relative, depth) => {
    const normalized = posix(relative);
    const dirEntries = fs.readdirSync(absolute, { withFileTypes: true });
    const childDirectories = dirEntries.filter((entry) => entry.isDirectory() && !isExcluded(entry.name, !normalized)).map((entry) => entry.name).sort();
    const directFiles = dirEntries.filter((entry) => entry.isFile() && entry.name !== 'README.md' && !entry.name.toLowerCase().endsWith('.state.json')).map((entry) => summarizeFile(root, posix(path.join(relative, entry.name)))).filter((file) => SOURCE_EXTENSION.test(file.relative) || file.path.toLowerCase().endsWith('.md') || file.path.toLowerCase().endsWith('.json') || file.path.toLowerCase().endsWith('.cmake')).sort((a, b) => a.path.localeCompare(b.path));
    const layer = layerFor(normalized);
    entries.set(normalized, { path: normalized, readme: fs.existsSync(path.join(absolute, 'README.md')), layer: layer[0], layerKey: layer[1], childDirectories, childDirectoryDetails: childDirectories.map((name) => ({ name, role: childRole(name), relative: normalized ? `${normalized}/${name}` : name, readme: fs.existsSync(path.join(absolute, name, 'README.md')) })), directFileCount: directFiles.length, directFiles });
    if (depth >= readme.maxDepth) return;
    for (const child of dirEntries) { if (!child.isDirectory() || isExcluded(child.name, !normalized)) continue; add(path.join(absolute, child.name), relative ? path.join(relative, child.name) : child.name, depth + 1); }
  };
  add(root, '', 0);
  const missingRoots = [];
  for (const configuredRoot of readme.roots || []) { const absolute = path.join(root, configuredRoot); if (!fs.existsSync(absolute)) { missingRoots.push(configuredRoot); continue; } add(absolute, configuredRoot, 0); }
  return { enabled: readme.enabled !== false, roots: readme.roots || [], maxDepth: readme.maxDepth, excludeDirectories: [...excluded], entries: [...entries.values()], missingRoots };
}
function removeManaged(content) { const start = String(content || '').indexOf(README_MANAGED_START); const end = String(content || '').indexOf(README_MANAGED_END); return start >= 0 && end >= start ? `${String(content).slice(0, start).trim()}\n` : String(content || '').trim(); }
function managedBlock(content) { const start = String(content || '').indexOf(README_MANAGED_START); const end = String(content || '').indexOf(README_MANAGED_END); return start >= 0 && end >= start ? String(content).slice(start, end + README_MANAGED_END.length) : ''; }
function renderReadme(entry) {
  const guidance = GUIDANCE[entry.layerKey] || GUIDANCE.unknown;
  const directory = entry.path || '.';
  const children = entry.childDirectoryDetails.length ? entry.childDirectoryDetails.map((child) => `| \`${child.name}/\` | ${child.role} | ${child.readme ? '已有' : '缺失'} |`).join('\n') : '| 无 | - | - |';
  const files = entry.directFiles.length ? entry.directFiles.map((file) => `| \`${file.path}\` | ${file.role} | ${clean(file.description)} | ${file.symbols.map((v) => `\`${v}\``).join('、') || '未确认'} | ${file.includes.map((v) => `\`${v}\``).join('、') || '未发现直接 include'} | ${file.evidence} |`).join('\n') : '| 无 | - | - | - | - | - |';
  return `${README_MANAGED_START}\n\n## MCU Workbench 目录说明\n\n### 这是什么\n\n${guidance[0]}\n\n- 当前目录：${directory}\n- 目录：\`${directory}\`\n- 类型：${entry.path ? (/(^|\/)inc$/.test(entry.path) ? '公共头文件目录' : /(^|\/)src$/.test(entry.path) ? '实现源码目录' : '工程目录') : '工程根目录'}\n- 架构层：${entry.layer}\n- 当前状态：目录索引和直接文件说明来自本次静态扫描；没有源码注释支持的职责会明确标为推断。\n\n### 在系统中的位置\n\n\`\`\`mermaid\nflowchart LR\n  App --> Service\n  Service --> Platform\n  Platform -. contract .-> Impl\n  Impl --> Vendor\n\`\`\`\n\n### 主要职责\n\n${guidance[1]}\n\n### 依赖边界\n\n允许依赖：通过公开接口和明确的组合根连接。\n\n禁止依赖：不能把静态扫描结果写成已完成的构建或实机验证。\n\n### 目录内容\n\n当前目录包含 ${entry.directFileCount} 个直接文件和 ${entry.childDirectories.length} 个直接子目录。\n\n#### 子目录明细\n\n| 子目录 | 目录作用 | README 状态 |\n|---|---|---|\n${children}\n\n#### 文件/模块说明\n\n| 文件 | 类型 | 作用/说明 | 关键接口、宏或类型 | 直接依赖 | 证据来源 |\n|---|---|---|---|---|---|\n${files}\n\n### 阅读顺序\n\n先阅读子目录 README，再结合文件表确认接口、实现、配置和测试入口；涉及 /inc 与 /src 时先看公共契约。\n\n### 修改与验证\n\n修改本目录前，先确认接口归属、资源所有权、生命周期、阻塞/ISR/DMA 和并发约束；静态结果不等同于目标构建或实机验证。\n\n> 本区块由 \`workflow-document-context\` 生成；请保留手写说明，并通过 Context Skill 的同步入口更新自动内容。\n\n${README_MANAGED_END}\n`;
}
function artifactPath(root, relative) { return path.join(root, relative ? `${relative}/README.md` : 'README.md'); }
function architectureDigest(entries) {
  const stable = entries.map((entry) => ({
    path: entry.path,
    layer: entry.layer,
    childDirectories: entry.childDirectories,
    directFileCount: entry.directFileCount,
    directFiles: entry.directFiles
  }));
  return sha256(JSON.stringify(stable));
}
function runReadmeContext({ action, root, write = false, strict = false, configPath } = {}) {
  const resolvedRoot = path.resolve(root || process.cwd());
  if (!fs.existsSync(resolvedRoot)) throw new Error(`项目根目录不存在：${resolvedRoot}`);
  if (!['design', 'init', 'scan', 'sync', 'validate'].includes(action)) throw new Error('document-context README action 无效。');
  const loaded = loadConfig(resolvedRoot, configPath);
  const config = { ...defaultConfig(), ...loaded.config, readme: { ...defaultConfig().readme, ...(loaded.config.readme || {}) } };
  const readmeScan = scanEntries(resolvedRoot, config);
  const scan = { readme: readmeScan, architectureDigest: architectureDigest(readmeScan.entries) };
  if (action === 'design' || action === 'scan') return { success: true, action, changed: false, scan, writes: [], errors: [], warnings: [], exitCode: 0 };
  const artifacts = {};
  if (action === 'init' && !loaded.loaded) artifacts[DOCUMENT_CONTEXT_CONFIG_RELATIVE_PATH] = `${JSON.stringify(config, null, 2)}\n`;
  for (const entry of readmeScan.entries) { const relative = entry.path ? `${entry.path}/README.md` : 'README.md'; const manual = removeManaged(readText(artifactPath(resolvedRoot, entry.path))); artifacts[relative] = `${manual}${manual ? '\n\n' : ''}${renderReadme(entry)}`; }
  const hashes = Object.fromEntries(Object.entries(artifacts).filter(([relative]) => relative.endsWith('README.md')).map(([relative, content]) => [relative, sha256(managedBlock(content))]));
  const state = { schemaVersion: 1, owner: 'workflow-document-context', architectureDigest: scan.architectureDigest, artifactHashes: hashes, unverified: readmeScan.missingRoots.map((file) => ({ file, reason: '配置的 README 根目录不存在。' })), readme: { directories: readmeScan.entries.map((entry) => entry.path), missingRoots: readmeScan.missingRoots } };
  artifacts[DOCUMENT_CONTEXT_STATE_RELATIVE_PATH] = `${JSON.stringify(state, null, 2)}\n`;
  if (action === 'validate') {
    const errors = []; const statePath = path.join(resolvedRoot, DOCUMENT_CONTEXT_STATE_RELATIVE_PATH);
    if (!fs.existsSync(statePath)) errors.push({ code: 'STATE_MISSING', file: DOCUMENT_CONTEXT_STATE_RELATIVE_PATH, message: '缺少 README 文档上下文扫描快照。' });
    else {
      let previous;
      try {
        previous = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      } catch (error) {
        errors.push({ code: 'STATE_INVALID', file: DOCUMENT_CONTEXT_STATE_RELATIVE_PATH, message: 'README 文档上下文扫描快照无法解析。' });
      }
      if (previous) {
        if (previous.architectureDigest !== scan.architectureDigest) errors.push({ code: 'STATE_DRIFT', file: DOCUMENT_CONTEXT_STATE_RELATIVE_PATH, message: '源码或配置的 README 证据已变化；请运行 document-context sync。' });
        for (const [relative, expected] of Object.entries(previous.artifactHashes || {})) {
          const current = readText(path.join(resolvedRoot, relative));
          if (!current) errors.push({ code: 'MANAGED_ARTIFACT_MISSING', file: relative, message: '受管 README 缺失。' });
          else if (sha256(managedBlock(current)) !== expected) errors.push({ code: 'MANAGED_ARTIFACT_DRIFT', file: relative, message: '受管 README 区块已被修改。' });
        }
      }
    }
    const warnings = readmeScan.missingRoots.map((file) => ({ code: 'UNVERIFIED_PATH', file, message: '配置的 README 根目录不存在。' }));
    return { success: errors.length === 0, action, changed: false, scan, errors, warnings, writes: [], exitCode: errors.length || (strict && warnings.length ? 1 : 0) };
  }
  const changes = Object.entries(artifacts).filter(([relative, content]) => readText(path.join(resolvedRoot, relative)) !== content).map(([relative, content]) => ({ path: relative, operation: fs.existsSync(path.join(resolvedRoot, relative)) ? 'modify' : 'create', content }));
  const writes = []; if (write) for (const change of changes) { writeText(path.join(resolvedRoot, change.path), change.content); writes.push(change.path); }
  return { success: true, action, changed: changes.length > 0, changes: changes.map(({ content, ...change }) => change), writes, scan, state, errors: [], warnings: [], exitCode: 0 };
}

module.exports = { DOCUMENT_CONTEXT_CONFIG_RELATIVE_PATH, DOCUMENT_CONTEXT_STATE_RELATIVE_PATH, README_MANAGED_START, README_MANAGED_END, DEFAULT_README_ROOTS, DEFAULT_README_EXCLUDED_DIRECTORIES, runReadmeContext, managedBlock };
