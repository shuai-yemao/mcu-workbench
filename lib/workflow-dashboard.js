'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { getWorkflowStatePaths, readWorkflowState } = require('./workflow-state');
const {
  PLUGIN_OUTPUT_ROOT,
  pluginDashboardPath,
  pluginOutputRootPath,
} = require('./project-output-paths');

const DOCUMENT_NAMES = ['spec', 'plan', 'task'];
const TASK_STATUS_NAMES = ['completed', 'inProgress', 'blocked', 'pending', 'superseded', 'unknown'];
const EVIDENCE_EXTENSIONS = new Set(['.md', '.markdown', '.mmd', '.mermaid', '.puml', '.txt']);
const SKIPPED_DIRECTORIES = new Set(['.git', '.mcu-workbench', 'node_modules', 'build', 'dist', 'out', '05_vendor']);
const MAX_EVIDENCE_FILES = 120;
const MAX_EVIDENCE_BYTES = 240 * 1024;
const FEATURE_CATALOG_RELATIVE = '00_Docs/04_需求文档/项目功能清单.md';
const LOG_DIRECTORY_RELATIVE = '00_Docs/05_日志';
const LOG_FILE_LABELS = {
  'build.log': '构建日志',
  'serial.log': '串口日志',
  'rtt.log': 'RTT 日志',
  'hardfault.log': 'HardFault 日志',
  'registers.txt': '寄存器快照',
};
const MAX_LOG_BYTES = 240 * 1024;
const MAX_LOG_LINES = 160;
const BUILD_ARTIFACT_EXTENSIONS = new Set(['.bin', '.hex', '.elf', '.map', '.axf', '.out']);
const MAX_BUILD_ARTIFACTS = 80;
const ARCHITECTURE_LAYER_ROOTS = [
  { id: 'APP', path: '01_App', label: '01_App', role: '启动编排、任务入口和用户场景。' },
  { id: 'SERVICE', path: '02_Service', label: '02_Service', role: '业务服务、日志和系统生命周期门面。' },
  { id: 'PLATFORM', path: '03_Platform', label: '03_Platform', role: '稳定的能力接口、类型、对象和生命周期契约。' },
  { id: 'IMPL', path: '04_Impl', label: '04_Impl', role: 'MCU/HAL、板级组合、设备 Driver、OS 和中间件 Port。' },
  { id: 'VENDOR', path: '05_Vendor', label: '05_Vendor', role: 'STM32 HAL/CMSIS、FreeRTOS 和第三方底座。' },
  { id: 'TOOL', path: '06_Toolchain', label: '06_Toolchain', role: '启动、构建和目标工程组合边界。' },
];
const MAX_ARCHITECTURE_TREE_NODES = 260;

function assertAbsolutePath(value, name) {
  if (!value || !path.isAbsolute(value)) throw new TypeError(`${name} must be an absolute path`);
  return path.resolve(value);
}

function isPathInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function safeRelative(root, value) {
  return path.relative(root, value).split(path.sep).join('/');
}

function discoverRequestIds(projectRoot) {
  const workflowRoot = path.join(projectRoot, '.mcu-workbench', 'workflows');
  const ids = fs.existsSync(workflowRoot)
    ? fs.readdirSync(workflowRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(workflowRoot, entry.name, 'state.json')))
    .map((entry) => entry.name)
    .filter((value) => /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value))
    : [];
  const docsRoot = path.join(projectRoot, '00_Docs', '04_需求文档');
  if (fs.existsSync(docsRoot)) {
    fs.readdirSync(docsRoot, { withFileTypes: true }).forEach((entry) => {
      if (!entry.isFile()) return;
      const match = entry.name.match(/^(REQ-[A-Za-z0-9][A-Za-z0-9_-]+?)-(?:Spec|spec|task|Task|Integration-Plan|Plan|plan)\.md$/);
      if (match) ids.push(match[1]);
    });
  }
  return Array.from(new Set(ids)).sort();
}

function resolveRequestDocsDir(projectRoot, requestId, docsDir) {
  if (docsDir) return assertAbsolutePath(docsDir, 'docsDir');
  const docsRoot = path.join(projectRoot, '00_Docs', '04_需求文档');
  const requestDir = requestId ? path.join(docsRoot, requestId) : '';
  return requestDir && fs.existsSync(requestDir) ? requestDir : docsRoot;
}

function resolveDashboardPaths({ root, projectRoot, docsDir, requestId, outputPath } = {}) {
  const projectPath = assertAbsolutePath(root || projectRoot, 'projectRoot');
  const selectedRequestId = requestId || 'project';
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(selectedRequestId)) {
    throw new TypeError('requestId must contain only letters, numbers, underscores, or hyphens');
  }
  const documentsPath = resolveRequestDocsDir(projectPath, selectedRequestId === 'project' ? '' : selectedRequestId, docsDir);
  if (!isPathInside(projectPath, documentsPath)) throw new Error('docsDir must be inside projectRoot');
  const statePaths = getWorkflowStatePaths(projectPath, selectedRequestId);
  const resolvedOutput = outputPath ? assertAbsolutePath(outputPath, 'outputPath') : pluginDashboardPath(projectPath);
  if (!isPathInside(pluginOutputRootPath(projectPath), resolvedOutput)) throw new Error(`outputPath must be inside ${PLUGIN_OUTPUT_ROOT}`);
  const flatRequest = selectedRequestId !== 'project'
    && documentsPath === path.join(projectPath, '00_Docs', '04_需求文档')
    && (fs.existsSync(path.join(documentsPath, `${selectedRequestId}-Spec.md`))
      || fs.existsSync(path.join(documentsPath, `${selectedRequestId}-spec.md`))
      || fs.existsSync(path.join(documentsPath, `${selectedRequestId}-task.md`)));
  const documentCandidates = flatRequest
    ? {
      spec: [`${selectedRequestId}-Spec.md`, `${selectedRequestId}-spec.md`],
      plan: [`${selectedRequestId}-Integration-Plan.md`, `${selectedRequestId}-Plan.md`, `${selectedRequestId}-plan.md`],
      task: [`${selectedRequestId}-task.md`, `${selectedRequestId}-Task.md`],
    }
    : Object.fromEntries(DOCUMENT_NAMES.map((name) => [name, [`${name}.md`]]));
  const documents = Object.fromEntries(DOCUMENT_NAMES.map((name) => {
    const candidate = documentCandidates[name].find((fileName) => fs.existsSync(path.join(documentsPath, fileName)))
      || documentCandidates[name][0];
    return [name, path.join(documentsPath, candidate)];
  }));
  return {
    projectRoot: projectPath,
    docsDir: documentsPath,
    requestId: selectedRequestId,
    workflowRoot: path.join(projectPath, '.mcu-workbench', 'workflows'),
    documents,
    statePath: statePaths.statePath,
    eventsPath: statePaths.eventsPath,
    outputPath: resolvedOutput,
  };
}

function readTextFile(filePath, label, issues) {
  try { return fs.readFileSync(filePath, 'utf8'); }
  catch (error) { issues.push(`${label} unavailable: ${error.code || error.message}`); return ''; }
}

function splitTableRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim().replace(/^`|`$/g, ''));
}

function normalizeTaskStatus(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['completed', 'complete', 'done', 'pass', 'passed', '已完成'].includes(normalized)) return 'completed';
  if (['in_progress', '执行中', '进行中', 'running'].includes(normalized)) return 'inProgress';
  if (['blocked', 'blocked_baseline', 'fail', 'failed', '阻塞', '失败'].includes(normalized)) return 'blocked';
  if (['pending', 'ready', 'draft', 'not_started', '未开始', '待执行', '待处理'].includes(normalized)) return 'pending';
  if (['superseded', 'replaced', '已替代'].includes(normalized)) return 'superseded';
  return 'unknown';
}

function parseTaskTable(text, issues) {
  const lines = String(text || '').split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => {
    if (!line.trim().startsWith('|')) return false;
    const headers = splitTableRow(line).map((cell) => cell.toLowerCase());
    return headers.some((cell) => ['id', 'task_id'].includes(cell)) && headers.some((cell) => ['状态', 'status'].includes(cell));
  });
  const summary = { total: 0, completed: 0, inProgress: 0, blocked: 0, pending: 0, superseded: 0, unknown: 0, percent: 0, tasks: [] };
  if (headerIndex < 0) { issues.push('task.md task table unavailable'); return summary; }
  const headers = splitTableRow(lines[headerIndex]).map((cell) => cell.toLowerCase());
  const idIndex = headers.findIndex((cell) => ['id', 'task_id'].includes(cell));
  const statusIndex = headers.findIndex((cell) => ['状态', 'status'].includes(cell));
  const titleIndex = headers.findIndex((cell) => ['任务名称', 'name', 'title', '目标', 'task'].includes(cell));
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    if (!lines[index].trim().startsWith('|')) break;
    const cells = splitTableRow(lines[index]);
    const id = cells[idIndex] || '';
    if (!/^T-\d+$/i.test(id)) continue;
    const rawStatus = cells[statusIndex] || '';
    const status = normalizeTaskStatus(rawStatus);
    summary.tasks.push({ id, title: cells[titleIndex] || '', status, rawStatus, cells });
    summary.total += 1;
    summary[status] += 1;
    if (status === 'unknown') issues.push(`task ${id} has unknown status: ${rawStatus || '<empty>'}`);
  }
  summary.percent = summary.total === 0 ? 0 : Math.round((summary.completed / summary.total) * 100);
  return summary;
}

function readState(filePath, requestId, issues, label = 'state.json') {
  try { return readWorkflowState(filePath, { expectedRequestId: requestId }); }
  catch (error) { issues.push(`${label} unavailable: ${error.message}`); return null; }
}

function readEvents(filePath, issues, label = 'events.jsonl') {
  let text;
  try { text = fs.readFileSync(filePath, 'utf8'); }
  catch (error) { issues.push(`${label} unavailable: ${error.code || error.message}`); return []; }
  const events = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    try {
      const event = JSON.parse(line);
      if (!event || typeof event !== 'object' || Array.isArray(event)) throw new Error('event must be an object');
      events.push(event);
    } catch (error) { issues.push(`${label} line ${index + 1} invalid: ${error.message}`); }
  });
  return events;
}

function emptyWorkflow(requestId) {
  return { request_id: requestId, current_stage: 'unknown', current_status: 'unknown', blockers: [], open_questions: [], verify_summary: { status: 'unknown', deviations: [] }, final_review_summary: { status: 'unknown', findings: [] } };
}

function deriveWorkflow(requestId, taskSummary) {
  let currentStage = 'task_execution';
  let currentStatus = 'pending';
  if (taskSummary.blocked > 0) currentStatus = 'blocked';
  else if (taskSummary.inProgress > 0) currentStatus = 'in_progress';
  else if (taskSummary.total > 0 && taskSummary.completed === taskSummary.total) {
    currentStage = 'final_review';
    currentStatus = 'completed';
  }
  return {
    request_id: requestId,
    current_stage: currentStage,
    current_status: currentStatus,
    blockers: taskSummary.blocked ? [`${taskSummary.blocked} 个 Task 处于阻塞状态`] : [],
    open_questions: [],
    task_summary: taskSummary,
    verify_summary: { status: 'unverified', deviations: [] },
    final_review_summary: { status: 'unverified', findings: [] },
  };
}

function extractDocumentTitle(text, fallback) {
  const match = String(text || '').match(/^\s*#\s+(.+?)\s*$/m);
  return match ? match[1].replace(/[`*_~]/g, '').trim() : fallback;
}

function readWorkflowRequest(projectRoot, requestId, docsDir, issues) {
  const requestIssues = [];
  const paths = resolveDashboardPaths({ root: projectRoot, requestId, docsDir });
  const documents = Object.fromEntries(DOCUMENT_NAMES.map((name) => [name, readTextFile(paths.documents[name], `${requestId}/${name}.md`, requestIssues)]));
  const taskSummary = parseTaskTable(documents.task, requestIssues);
  const state = fs.existsSync(paths.statePath)
    ? readState(paths.statePath, requestId, requestIssues, `${requestId}/state.json`)
    : null;
  const events = fs.existsSync(paths.eventsPath)
    ? readEvents(paths.eventsPath, requestIssues, `${requestId}/events.jsonl`)
    : [];
  const workflow = state || deriveWorkflow(requestId, taskSummary);
  issues.push(...requestIssues);
  const lastEvent = events[events.length - 1] || {};
  return {
    requestId, paths, documents, workflow, taskSummary, events, issues: requestIssues,
    updatedAt: workflow.updated_at || lastEvent.recorded_at || lastEvent.timestamp || '',
    featureTitle: workflow.feature || workflow.objective || workflow.goal || (Array.isArray(workflow.requirements) && workflow.requirements[0]) || extractDocumentTitle(documents.spec, requestId),
  };
}

function readProjectMetadata(projectRoot, issues) {
  const filePath = path.join(projectRoot, '.mcu-workbench', 'project.json');
  if (!fs.existsSync(filePath)) return { project: path.basename(projectRoot), source: '' };
  try { return { ...JSON.parse(fs.readFileSync(filePath, 'utf8')), source: safeRelative(projectRoot, filePath) }; }
  catch (error) { issues.push(`.mcu-workbench/project.json unavailable: ${error.message}`); return { project: path.basename(projectRoot), source: safeRelative(projectRoot, filePath) }; }
}

function walkTextFiles(root, output, seen) {
  if (!fs.existsSync(root) || output.length >= MAX_EVIDENCE_FILES) return;
  const stat = fs.statSync(root);
  if (stat.isFile()) { if (EVIDENCE_EXTENSIONS.has(path.extname(root).toLowerCase())) output.push(root); return; }
  fs.readdirSync(root, { withFileTypes: true }).forEach((entry) => {
    if (output.length >= MAX_EVIDENCE_FILES || (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name.toLowerCase()))) return;
    const candidate = path.join(root, entry.name);
    const key = path.resolve(candidate).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    walkTextFiles(candidate, output, seen);
  });
}

function extractMermaidBlocks(text) {
  const blocks = [];
  const pattern = /```(?:mermaid|flowchart|graph)\s*\n([\s\S]*?)```/gi;
  let match;
  while ((match = pattern.exec(text))) blocks.push(match[1].trim());
  return blocks;
}

function isArchitectureSource(relativePath, content) {
  const lower = relativePath.toLowerCase();
  return /architecture|架构|context|系统设计/.test(lower) || /软件架构|分层架构|app\s*[→>-]\s*service|platform.*impl.*vendor/i.test(content) || /^(readme|context)(\.[^.]+)?$/i.test(path.basename(relativePath));
}

function isStartupSource(relativePath, content) {
  const lower = relativePath.toLowerCase();
  return /boot|startup|start-up|init|启动|初始化|流程/.test(lower) || /启动流程|系统启动|初始化流程|启动阶段/i.test(content);
}

function collectEvidence(projectRoot, kind, issues) {
  const candidates = [];
  const seen = new Set();
  [PLUGIN_OUTPUT_ROOT, 'docs', '00_Docs', 'README.md', 'CONTEXT.md'].forEach((relative) => {
    const candidate = path.join(projectRoot, relative);
    if (fs.existsSync(candidate)) walkTextFiles(candidate, candidates, seen);
  });
  const sources = [];
  candidates.forEach((filePath) => {
    let content;
    try {
      if (fs.statSync(filePath).size > MAX_EVIDENCE_BYTES) { issues.push(`${safeRelative(projectRoot, filePath)} skipped: evidence file is larger than ${MAX_EVIDENCE_BYTES} bytes`); return; }
      content = fs.readFileSync(filePath, 'utf8');
    } catch (error) { issues.push(`${safeRelative(projectRoot, filePath)} unavailable: ${error.message}`); return; }
    const relativePath = safeRelative(projectRoot, filePath);
    if (/^00_Docs\/04_需求文档(?:\/|$)/i.test(relativePath)) return;
    const matched = kind === 'architecture' ? isArchitectureSource(relativePath, content) : isStartupSource(relativePath, content);
    if (!matched) return;
    const explicit = kind === 'architecture' ? /architecture|架构|系统设计/i.test(relativePath) : /boot|startup|start-up|init|启动|初始化|流程/i.test(relativePath);
    sources.push({ path: relativePath, content, confidence: explicit ? 'confirmed' : 'inferred', mermaid: extractMermaidBlocks(content) });
  });
  return { kind, sources, confirmed: sources.some((source) => source.confidence === 'confirmed') };
}

function walkNamedFiles(root, names, output, seen) {
  if (!fs.existsSync(root) || output.length >= 16) return;
  const key = path.resolve(root).toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  const stat = fs.statSync(root);
  if (stat.isFile()) {
    if (names.has(path.basename(root).toLowerCase())) output.push(root);
    return;
  }
  fs.readdirSync(root, { withFileTypes: true }).forEach((entry) => {
    if (output.length >= 16 || (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name.toLowerCase()))) return;
    walkNamedFiles(path.join(root, entry.name), names, output, seen);
  });
}

function readStartupCodeEvidence(projectRoot) {
  const names = new Set(['main.c', 'freertos.c', 'app_boot.c', 'app_system.c']);
  const files = [];
  ['01_App', '06_Toolchain'].forEach((relative) => walkNamedFiles(path.join(projectRoot, relative), names, files, new Set()));
  const sources = files.map((filePath) => ({ path: safeRelative(projectRoot, filePath), content: fs.readFileSync(filePath, 'utf8') }));
  const findSource = (name) => sources.find((source) => path.basename(source.path).toLowerCase() === name);
  const steps = [{ id: 'power-reset', title: '上电 / 复位 → C 运行时入口', status: 'unverified', detail: '当前工程未收集启动文件、向量表或复位处理器证据；main() 之前的处理尚未确认。', source: '启动文件未确认' }];
  const addStep = (id, title, status, detail, source) => steps.push({ id, title, status, detail, source });
  const main = findSource('main.c');
  if (main) {
    const peripheralInitializers = Array.from(main.content.matchAll(/\b(MX_[A-Z0-9_]+_Init)\s*\(\s*\)\s*;/g)).map((match) => match[1]);
    if (/\bHAL_Init\s*\(\s*\)/.test(main.content)) addStep('hal-init', 'HAL_Init()', 'confirmed', '初始化 HAL、Flash 接口和系统节拍基础。', main.path);
    if (/\bSystemClock_Config\s*\(\s*\)/.test(main.content)) addStep('clock-init', 'SystemClock_Config()', 'confirmed', '配置振荡器、PLL、系统时钟以及 AHB/APB 分频。', main.path);
    if (peripheralInitializers.length) addStep('peripheral-init', 'MX_*_Init() 外设初始化', 'confirmed', `工程中检测到：${peripheralInitializers.join('、')}。`, main.path);
    if (/\bosKernelInitialize\s*\(\s*\)/.test(main.content)) addStep('kernel-init', 'osKernelInitialize()', 'confirmed', '初始化 CMSIS-RTOS/FreeRTOS 内核对象。', main.path);
    if (/\bMX_FREERTOS_Init\s*\(\s*\)/.test(main.content)) addStep('rtos-object-init', 'MX_FREERTOS_Init()', 'confirmed', '创建工程配置的 RTOS 线程和同步对象。', main.path);
    if (/\bosKernelStart\s*\(\s*\)/.test(main.content)) addStep('kernel-start', 'osKernelStart()', 'confirmed', '启动调度器，控制权转移到 RTOS 任务。', main.path);
  }
  const freertos = findSource('freertos.c');
  if (freertos) {
    if (/\bosThreadNew\s*\(\s*StartDefaultTask/.test(freertos.content)) addStep('default-task', 'StartDefaultTask', 'confirmed', 'RTOS 创建并运行默认任务。', freertos.path);
    if (/\bapp_boot_init\s*\(\s*\)/.test(freertos.content)) addStep('app-boot-init', 'app_boot_init()', 'confirmed', '执行板级注册、服务初始化、服务注册、Manager 初始化和运行态启动。', freertos.path);
    if (/\bapp_system_process\s*\(\s*\)/.test(freertos.content)) addStep('app-process', 'app_system_process()', 'confirmed', '进入应用运行循环，处理 Board Manager 和 Service Manager。', freertos.path);
    if (/\bosDelay\s*\(\s*10\s*\)/.test(freertos.content)) addStep('runtime-loop', 'osDelay(10)', 'confirmed', '运行循环每 10 ms 让出调度权。', freertos.path);
  }
  const boot = findSource('app_boot.c');
  if (boot && /APP_SYSTEM_STATE_RUNNING/.test(boot.content)) addStep('running-state', 'APP_SYSTEM_STATE_RUNNING', 'confirmed', '完成板级、服务和 MCU 探测后进入应用运行态。', boot.path);
  return { sources: sources.map(({ path: sourcePath }) => ({ path: sourcePath, confidence: 'confirmed' })), steps };
}

function readArchitectureDirectoryTree(projectRoot) {
  let nodeCount = 0;
  const walk = (absolutePath, relativePath, level) => {
    if (level > 3 || nodeCount >= MAX_ARCHITECTURE_TREE_NODES) return [];
    let entries;
    try { entries = fs.readdirSync(absolutePath, { withFileTypes: true }); } catch { return []; }
    return entries
      .filter((entry) => entry.isDirectory() && !SKIPPED_DIRECTORIES.has(entry.name.toLowerCase()))
      .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
      .map((entry) => {
        if (nodeCount >= MAX_ARCHITECTURE_TREE_NODES) return null;
        nodeCount += 1;
        const childRelativePath = `${relativePath}/${entry.name}`;
        return { name: entry.name, path: childRelativePath, level, children: walk(path.join(absolutePath, entry.name), childRelativePath, level + 1) };
      })
      .filter(Boolean);
  };
  return ARCHITECTURE_LAYER_ROOTS.map((layer) => {
    const absolutePath = path.join(projectRoot, layer.path);
    const exists = fs.existsSync(absolutePath);
    return { ...layer, exists, children: exists ? walk(absolutePath, layer.path, 2) : [] };
  });
}

function normalizeColumnName(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s_`*]/g, '');
}

function findColumn(headers, candidates) {
  const normalized = headers.map(normalizeColumnName);
  return normalized.findIndex((header) => candidates.some((candidate) => header === normalizeColumnName(candidate)));
}

function parseRequestLinks(value) {
  return Array.from(new Set(String(value || '').match(/REQ-[A-Za-z0-9][A-Za-z0-9_-]*/gi) || []));
}

function parseFeatureCatalog(text, issues) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const headerIndex = lines.findIndex((line, index) => line.trim().startsWith('|') && index + 1 < lines.length && isTableSeparator(lines[index + 1]));
  if (headerIndex < 0) {
    issues.push('项目功能清单.md 未找到可解析的 Markdown 表格');
    return [];
  }
  const headers = splitTableRow(lines[headerIndex]);
  const idIndex = findColumn(headers, ['功能ID', '功能编号', 'id', 'feature_id']);
  const nameIndex = findColumn(headers, ['功能名称', '功能', '名称', 'name', 'title']);
  const descriptionIndex = findColumn(headers, ['功能描述', '描述', '说明', 'description']);
  const layerIndex = findColumn(headers, ['所属层', '软件层', '层', 'layer']);
  const requestIndex = findColumn(headers, ['关联REQ', '关联需求', 'REQ', 'request', 'requests']);
  if (nameIndex < 0) {
    issues.push('项目功能清单.md 缺少“功能名称”列');
    return [];
  }
  const features = [];
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    if (!lines[index].trim().startsWith('|')) break;
    const cells = splitTableRow(lines[index]);
    const name = cells[nameIndex] || '';
    if (!name) continue;
    features.push({
      id: cells[idIndex] || `FEATURE-${String(features.length + 1).padStart(3, '0')}`,
      name,
      description: cells[descriptionIndex] || '',
      layer: cells[layerIndex] || '未归类',
      requestIds: parseRequestLinks(cells[requestIndex] || ''),
    });
  }
  return features;
}

function hasCompletionEvidence(request) {
  const workflow = request.workflow || {};
  const verify = workflow.verify_summary || {};
  const finalReview = workflow.final_review_summary || {};
  return workflow.current_status === 'completed'
    || verify.status === 'completed'
    || finalReview.status === 'completed'
    || (request.events || []).some((event) => /final_(review|verify)_completed|task_completed/.test(event.event || ''))
    || /最终审查.{0,12}(完成|通过)|完成证据/.test(request.documents?.task || '');
}

function summarizeFeatureStatus(feature, requestMap) {
  const linked = feature.requestIds.map((requestId) => requestMap.get(requestId)).filter(Boolean);
  const missingRequestIds = feature.requestIds.filter((requestId) => !requestMap.has(requestId));
  const total = linked.reduce((sum, request) => sum + (request.taskSummary.total || 0), 0);
  const completed = linked.reduce((sum, request) => sum + (request.taskSummary.completed || 0), 0);
  const inProgress = linked.reduce((sum, request) => sum + (request.taskSummary.inProgress || 0), 0);
  const blocked = linked.reduce((sum, request) => sum + (request.taskSummary.blocked || 0), 0);
  const updatedAt = linked.map((request) => request.updatedAt).filter(Boolean).sort().pop() || '';
  const allComplete = linked.length > 0 && missingRequestIds.length === 0 && linked.every((request) => request.taskSummary.total > 0
    && request.taskSummary.completed === request.taskSummary.total && hasCompletionEvidence(request));
  const status = allComplete ? 'completed' : inProgress > 0 ? 'inProgress' : 'pending';
  const reason = missingRequestIds.length ? `未找到关联 REQ：${missingRequestIds.join('、')}`
    : blocked > 0 ? `${blocked} 个关联 Task 阻塞`
      : !linked.length ? '尚未关联 REQ' : total === 0 ? '尚未发现 Task 证据' : allComplete ? '关联 Task 已完成且有完成证据' : '关联 Task 尚未全部完成';
  return { ...feature, status, linkedRequests: linked, missingRequestIds, taskSummary: { total, completed, inProgress, blocked, percent: total ? Math.round((completed / total) * 100) : 0 }, updatedAt, reason };
}

function readFeatureCatalog(projectRoot, requests, issues) {
  const filePath = path.join(projectRoot, FEATURE_CATALOG_RELATIVE);
  if (!fs.existsSync(filePath)) return { path: FEATURE_CATALOG_RELATIVE, available: false, features: [], counts: { completed: 0, inProgress: 0, pending: 0 } };
  let content;
  try { content = fs.readFileSync(filePath, 'utf8'); }
  catch (error) { issues.push(`${FEATURE_CATALOG_RELATIVE} unavailable: ${error.message}`); return { path: FEATURE_CATALOG_RELATIVE, available: false, features: [], counts: { completed: 0, inProgress: 0, pending: 0 } }; }
  const requestMap = new Map(requests.map((request) => [request.requestId.toLowerCase(), request]));
  const normalizedMap = new Map(Array.from(requestMap.entries()).map(([id, request]) => [id.toUpperCase(), request]));
  const resolved = parseFeatureCatalog(content, issues).map((feature) => summarizeFeatureStatus(feature, new Map(feature.requestIds.map((requestId) => [requestId, normalizedMap.get(requestId.toUpperCase())]))));
  const counts = { completed: 0, inProgress: 0, pending: 0 };
  resolved.forEach((feature) => { counts[feature.status] += 1; });
  return { path: FEATURE_CATALOG_RELATIVE, available: true, features: resolved, counts };
}

function parseRuntimeKeyValues(line) {
  return Object.fromEntries(Array.from(String(line || '').matchAll(/([A-Za-z][A-Za-z0-9_]*)=([^\s]+)/g)).map((match) => [match[1].toLowerCase(), match[2]]));
}

function parseRuntimeNumber(value) {
  const number = Number(String(value || '').replace(/[%uUlL]+$/g, ''));
  return Number.isFinite(number) ? number : null;
}

function parseRuntimeResourceLines(lines, sourcePath) {
  const runtime = { heapFreeBytes: null, heapMinimumFreeBytes: null, cpuPercent: null, tasks: [], sampleCount: 0, sources: [] };
  const inputLines = Array.isArray(lines) ? lines : String(lines || '').split('\n');
  inputLines.forEach((line) => {
    const normalized = line.trim();
    if (normalized.startsWith('MCUWB_RUNTIME ')) {
      const values = parseRuntimeKeyValues(normalized);
      const heapFree = parseRuntimeNumber(values.heap_free_bytes || values.free_heap_bytes || values.heap_free);
      const heapMinimum = parseRuntimeNumber(values.heap_min_free_bytes || values.minimum_ever_free_heap_bytes || values.heap_min_free);
      const cpu = parseRuntimeNumber(values.cpu_percent || values.cpu);
      if (heapFree !== null) runtime.heapFreeBytes = heapFree;
      if (heapMinimum !== null) runtime.heapMinimumFreeBytes = heapMinimum;
      if (cpu !== null) runtime.cpuPercent = cpu;
      if (heapFree !== null || heapMinimum !== null || cpu !== null) { runtime.sampleCount += 1; runtime.sources.push(sourcePath); }
      return;
    }
    if (!normalized.startsWith('MCUWB_TASK ')) return;
    const values = parseRuntimeKeyValues(normalized);
    const name = values.name || values.task || '';
    const stackHighWaterWords = parseRuntimeNumber(values.stack_high_water_words || values.high_water_words || values.stack_hwm_words);
    const cpu = parseRuntimeNumber(values.cpu_percent || values.cpu);
    if (!name || (stackHighWaterWords === null && cpu === null && !values.state)) return;
    const task = { name, stackHighWaterWords, cpuPercent: cpu, state: values.state || '未登记', source: sourcePath };
    const existing = runtime.tasks.findIndex((item) => item.name === name);
    if (existing >= 0) runtime.tasks[existing] = task;
    else runtime.tasks.push(task);
    runtime.sampleCount += 1;
    runtime.sources.push(sourcePath);
  });
  runtime.sources = Array.from(new Set(runtime.sources));
  return runtime;
}

function mergeRuntimeResourceEvidence(samples) {
  const merged = { heapFreeBytes: null, heapMinimumFreeBytes: null, cpuPercent: null, tasks: [], sampleCount: 0, sources: [] };
  samples.forEach((sample) => {
    if (sample.heapFreeBytes !== null) merged.heapFreeBytes = sample.heapFreeBytes;
    if (sample.heapMinimumFreeBytes !== null) merged.heapMinimumFreeBytes = sample.heapMinimumFreeBytes;
    if (sample.cpuPercent !== null) merged.cpuPercent = sample.cpuPercent;
    sample.tasks.forEach((task) => {
      const existing = merged.tasks.findIndex((item) => item.name === task.name);
      if (existing >= 0) merged.tasks[existing] = task;
      else merged.tasks.push(task);
    });
    merged.sampleCount += sample.sampleCount;
    merged.sources.push(...sample.sources);
  });
  merged.sources = Array.from(new Set(merged.sources));
  return {
    ...merged,
    available: merged.sampleCount > 0,
    confidence: merged.sampleCount > 0 ? 'confirmed' : 'unverified',
    note: merged.sampleCount > 0 ? '运行时数据来自日志中的 MCUWB_RUNTIME / MCUWB_TASK 采样行，表示最近一次采样，不代表持续监测。' : '尚未发现 MCUWB_RUNTIME / MCUWB_TASK 采样行；需要目标板通过串口或 RTT 写入 05_日志 后才能确认。',
  };
}

function readLogEvidence(projectRoot, issues) {
  const directory = path.join(projectRoot, LOG_DIRECTORY_RELATIVE);
  const files = [];
  const runtimeSamples = [];
  Object.entries(LOG_FILE_LABELS).forEach(([name, label]) => {
    const filePath = path.join(directory, name);
    if (!fs.existsSync(filePath)) return;
    try {
      const stat = fs.statSync(filePath);
      if (stat.size > MAX_LOG_BYTES) { issues.push(`${safeRelative(projectRoot, filePath)} skipped: log is larger than ${MAX_LOG_BYTES} bytes`); return; }
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.replace(/\r\n/g, '\n').split('\n');
      runtimeSamples.push(parseRuntimeResourceLines(lines, safeRelative(projectRoot, filePath)));
      files.push({ name, label, path: safeRelative(projectRoot, filePath), updatedAt: stat.mtime.toISOString(), lineCount: Math.max(0, lines.length - (lines[lines.length - 1] === '' ? 1 : 0)), errorCount: lines.filter((line) => /\berror\b|错误|fault|异常/i.test(line)).length, warningCount: lines.filter((line) => /\bwarn(?:ing)?\b|警告/i.test(line)).length, tail: lines.slice(-MAX_LOG_LINES).join('\n') });
    } catch (error) { issues.push(`${safeRelative(projectRoot, filePath)} unavailable: ${error.message}`); }
  });
  return { directory: LOG_DIRECTORY_RELATIVE, available: files.length > 0, files, runtime: mergeRuntimeResourceEvidence(runtimeSamples) };
}

function collectBuildArtifacts(root, projectRoot, output, seen) {
  if (!fs.existsSync(root) || output.length >= MAX_BUILD_ARTIFACTS) return;
  let entries;
  try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch { return; }
  entries.forEach((entry) => {
    if (output.length >= MAX_BUILD_ARTIFACTS || SKIPPED_DIRECTORIES.has(entry.name.toLowerCase())) return;
    const candidate = path.join(root, entry.name);
    const key = path.resolve(candidate).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    if (entry.isDirectory()) collectBuildArtifacts(candidate, projectRoot, output, seen);
    else if (entry.isFile() && BUILD_ARTIFACT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      try { const stat = fs.statSync(candidate); output.push({ path: safeRelative(projectRoot, candidate), type: path.extname(entry.name).slice(1).toUpperCase(), bytes: stat.size, updatedAt: stat.mtime.toISOString() }); } catch { /* 文件在扫描期间消失，忽略本次快照 */ }
    }
  });
}

function readBuildEvidence(projectRoot, logs) {
  const artifacts = [];
  const seen = new Set();
  [path.join(projectRoot, 'build'), path.join(projectRoot, '06_Toolchain')].forEach((root) => collectBuildArtifacts(root, projectRoot, artifacts, seen));
  const buildLog = (logs.files || []).find((file) => file.name === 'build.log');
  return { available: artifacts.length > 0 || Boolean(buildLog), artifacts: artifacts.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))), buildLog: buildLog || null, note: artifacts.length ? '仅展示已有产物，不代表本次已重新构建。' : '未发现已登记的构建产物。' };
}

const RESOURCE_ALLOCATION_FILES = [
  '00_Docs/01_资源分配表/核心引脚分配表.md',
  '00_Docs/01_资源分配表/总线资源分配表.md',
];
const BOARD_RESOURCE_HEADER_NAMES = new Set(['board_busmap.h', 'board_pinmap.h', 'board_irqmap.h', 'board_powermap.h', 'board_cfg.h']);

function normalizeResourcePin(value) {
  return String(value || '').replace(/\\/g, '').replace(/\s+/g, ' ').trim();
}

function readResourceSource(projectRoot, filePath, kind, issues, maxBytes = MAX_EVIDENCE_BYTES) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > maxBytes) {
      issues.push(`${safeRelative(projectRoot, filePath)} skipped: resource evidence is larger than ${maxBytes} bytes`);
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return { path: safeRelative(projectRoot, filePath), kind, hash: crypto.createHash('sha256').update(content).digest('hex'), content };
  } catch (error) {
    issues.push(`${safeRelative(projectRoot, filePath)} unavailable: ${error.message}`);
    return null;
  }
}

function findResourceFiles(root, predicate, limit = 16, output = [], seen = new Set()) {
  if (!root || output.length >= limit || !fs.existsSync(root)) return output;
  let stat;
  try { stat = fs.statSync(root); } catch { return output; }
  if (stat.isFile()) { if (predicate(root)) output.push(root); return output; }
  let entries;
  try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch { return output; }
  entries.sort((left, right) => left.name.localeCompare(right.name, 'zh-CN')).forEach((entry) => {
    if (output.length >= limit || (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name.toLowerCase()))) return;
    const candidate = path.join(root, entry.name);
    const key = path.resolve(candidate).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    findResourceFiles(candidate, predicate, limit, output, seen);
  });
  return output;
}

function splitCInitializerFields(value) {
  const fields = [];
  let current = '';
  let depth = 0;
  let quoted = false;
  let escaped = false;
  String(value || '').split('').forEach((character) => {
    if (quoted) {
      current += character;
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
      return;
    }
    if (character === '"') { quoted = true; current += character; return; }
    if (character === '{' || character === '(' || character === '[') depth += 1;
    if (character === '}' || character === ')' || character === ']') depth = Math.max(0, depth - 1);
    if (character === ',' && depth === 0) { fields.push(current.trim()); current = ''; return; }
    current += character;
  });
  if (current.trim()) fields.push(current.trim());
  return fields;
}

function parseCArrayEntries(content, symbol) {
  const match = String(content || '').match(new RegExp(`${symbol}\\s*\\[[^\\]]*\\]\\s*=\\s*\\{([\\s\\S]*?)\\};`));
  if (!match) return [];
  const entries = [];
  let depth = 0;
  let start = -1;
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < match[1].length; index += 1) {
    const character = match[1][index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') { quoted = true; continue; }
    if (character === '{') { if (depth === 0) start = index + 1; depth += 1; }
    else if (character === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) { entries.push(splitCInitializerFields(match[1].slice(start, index).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''))); start = -1; }
    }
  }
  return entries;
}

function cleanCValue(value) {
  return String(value || '').trim().replace(/^\(?\s*|\s*\)?$/g, '').replace(/[uUlL]+$/, '');
}

function formatBoardReference(value, labels = new Map()) {
  const normalized = cleanCValue(value);
  if (!normalized || /NONE$/i.test(normalized)) return '未使用';
  const numeric = normalized.match(/^\d+$/) ? Number(normalized) : normalized.match(/^0x[0-9a-f]+$/i) ? Number.parseInt(normalized, 16) : null;
  if (numeric !== null && labels.has(numeric)) return labels.get(numeric);
  return normalized;
}

function readBoardAttachmentEvidence(projectRoot, issues) {
  const boardRoot = path.join(projectRoot, '04_Impl', 'impl_board');
  const headerPaths = findResourceFiles(boardRoot, (filePath) => BOARD_RESOURCE_HEADER_NAMES.has(path.basename(filePath).toLowerCase()), 16);
  const implementationPaths = findResourceFiles(boardRoot, (filePath) => {
    const name = path.basename(filePath).toLowerCase();
    return path.extname(filePath).toLowerCase() === '.c' && /(resource|profile|busmap|pinmap|irqmap|powermap)/i.test(name);
  }, 32);
  const headerSources = headerPaths.map((filePath) => readResourceSource(projectRoot, filePath, '板级资源模型', issues)).filter(Boolean);
  const implementationSources = implementationPaths.map((filePath) => readResourceSource(projectRoot, filePath, '板级资源实例', issues)).filter(Boolean);
  const allSources = [...headerSources, ...implementationSources];
  const busHeader = headerSources.find((source) => path.basename(source.path).toLowerCase() === 'board_busmap.h');
  const hasAttachmentContract = Boolean(busHeader && /board_bus_attachment_t/.test(busHeader.content) && /g_board_bus_attachments/.test(busHeader.content));
  const busEntries = implementationSources.flatMap((source) => parseCArrayEntries(source.content, 'g_board_busmap').map((fields) => ({ fields, source: source.path })));
  const pinEntries = implementationSources.flatMap((source) => parseCArrayEntries(source.content, 'g_board_pinmap').map((fields) => ({ fields, source: source.path })));
  const irqEntries = implementationSources.flatMap((source) => parseCArrayEntries(source.content, 'g_board_irqmap').map((fields) => ({ fields, source: source.path })));
  const powerEntries = implementationSources.flatMap((source) => parseCArrayEntries(source.content, 'g_board_powermap').map((fields) => ({ fields, source: source.path })));
  const busLabels = new Map(busEntries.map(({ fields }) => [Number(cleanCValue(fields[0])), cleanCValue(fields[1]).replace(/^"|"$/g, '')]).filter(([id, name]) => Number.isFinite(id) && name));
  const pinLabels = new Map(pinEntries.map(({ fields }) => [Number(cleanCValue(fields[0])), cleanCValue(fields[1]).replace(/^"|"$/g, '')]).filter(([id, name]) => Number.isFinite(id) && name));
  const irqLabels = new Map(irqEntries.map(({ fields }) => [Number(cleanCValue(fields[0])), cleanCValue(fields[1]).replace(/^"|"$/g, '')]).filter(([id, name]) => Number.isFinite(id) && name));
  const powerLabels = new Map(powerEntries.map(({ fields }) => [Number(cleanCValue(fields[0])), cleanCValue(fields[1]).replace(/^"|"$/g, '')]).filter(([id, name]) => Number.isFinite(id) && name));
  const attachments = implementationSources.flatMap((source) => parseCArrayEntries(source.content, 'g_board_bus_attachments').map((fields) => ({
    device: cleanCValue(fields[1]).replace(/^"|"$/g, '') || cleanCValue(fields[0]) || '未命名器件',
    bus: formatBoardReference(fields[2], busLabels),
    address: formatBoardReference(fields[3]),
    chipSelect: formatBoardReference(fields[4], pinLabels),
    reset: formatBoardReference(fields[5], pinLabels),
    irq: formatBoardReference(fields[6], irqLabels),
    power: formatBoardReference(fields[7], powerLabels),
    status: 'confirmed',
    source: source.path,
  })));
  const instanceSymbols = ['g_board_cfg', 'g_board_busmap', 'g_board_bus_attachments', 'g_board_pinmap', 'g_board_irqmap', 'g_board_powermap'];
  const foundInstanceSymbols = instanceSymbols.filter((symbol) => implementationSources.some((source) => new RegExp(`\\b${symbol}\\b\\s*(?:\\[[^\\]]*\\])?\\s*=`).test(source.content)));
  const expectedMissing = instanceSymbols.filter((symbol) => !foundInstanceSymbols.includes(symbol));
  return {
    available: headerSources.length > 0 || implementationSources.length > 0,
    status: attachments.length ? 'confirmed' : 'unverified',
    attachments,
    contract: { hasAttachmentContract, headerCount: headerSources.length, implementationCount: implementationSources.length, foundInstanceSymbols, expectedMissing },
    sources: allSources.map(({ path: sourcePath, kind, hash }) => ({ path: sourcePath, kind, hash, confidence: 'confirmed' })),
    note: attachments.length ? '器件挂接实例来自 impl_board 资源表；字段按器件→总线→地址/片选/复位/IRQ/供电展示。' : hasAttachmentContract ? '已确认板级资源模型定义，但未找到 g_board_bus_attachments[] 等实例定义；具体器件接线暂不能确认。' : '未发现板级器件挂接模型或实例定义。',
  };
}

function parseCubeMxIoc(content) {
  const values = {};
  String(content || '').split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) values[match[1].trim()] = match[2].trim();
  });
  const pins = Object.keys(values).filter((key) => /\.Signal$/.test(key) && /^[A-Z]{2}\d/.test(key)).map((key) => {
    const rawPin = normalizeResourcePin(key.replace(/\.Signal$/, ''));
    const signal = values[key];
    const interfaceMatch = signal.match(/^(I2C\d+|SPI\d+|USART\d+|UART\d+|ADC\d+|TIM\d+)/i);
    return {
      pin: rawPin,
      signal,
      interface: interfaceMatch ? interfaceMatch[1].toUpperCase() : '',
      mode: values[`${key.replace(/\.Signal$/, '')}.Mode`] || '',
      port: rawPin.match(/^(P[A-Z])/i)?.[1]?.toUpperCase() || '',
      confidence: 'confirmed',
    };
  });
  const ips = Object.keys(values).filter((key) => /^Mcu\.IP\d+$/.test(key)).map((key) => values[key]).filter(Boolean);
  const dma = Object.keys(values).filter((key) => /^Dma\..+\.\d+\.Instance$/.test(key)).map((key) => {
    const match = key.match(/^Dma\.(.+)\.(\d+)\.Instance$/);
    const base = `Dma.${match[1]}.${match[2]}`;
    return { request: match[1], instance: values[key], direction: values[`${base}.Direction`] || '', mode: values[`${base}.Mode`] || '', priority: values[`${base}.Priority`] || '', confidence: 'confirmed' };
  });
  const initialized = String(values['ProjectManager.functionlistsort'] || '').split(',').map((item) => item.split('-')[1]).filter(Boolean).map((name) => `${name.endsWith('()') ? name.slice(0, -2) : name}()`);
  return {
    mcu: values['Mcu.Name'] || values['Mcu.UserName'] || values['Mcu.CPN'] || '',
    package: values['Mcu.Package'] || '',
    board: values.board || '',
    toolchain: values['ProjectManager.TargetToolchain'] || values['ProjectManager.CompilerLinker'] || '',
    hclk: values['RCC.HCLKFreq_Value'] ? `${values['RCC.HCLKFreq_Value']} Hz` : '',
    hse: values['RCC.HSE_VALUE'] ? `${values['RCC.HSE_VALUE']} Hz` : '',
    ips,
    initialized,
    pins,
    dma,
  };
}

function parseResourceTable(content, requiredColumns) {
  const lines = String(content || '').replace(/\r\n/g, '\n').split('\n');
  const headerIndex = lines.findIndex((line, index) => line.trim().startsWith('|') && index + 1 < lines.length && isTableSeparator(lines[index + 1]) && requiredColumns.every((column) => normalizeColumnName(line).includes(normalizeColumnName(column))));
  if (headerIndex < 0) return [];
  const headers = splitTableRow(lines[headerIndex]);
  const rows = [];
  for (let index = headerIndex + 2; index < lines.length && lines[index].trim().startsWith('|'); index += 1) rows.push(Object.fromEntries(headers.map((header, column) => [normalizeColumnName(header), splitTableRow(lines[index])[column] || ''])));
  return rows;
}

function tableValue(row, names) {
  const key = Object.keys(row || {}).find((candidate) => names.some((name) => candidate === normalizeColumnName(name)));
  return key ? row[key] : '';
}

function parseBusAllocation(content, sourcePath) {
  return parseResourceTable(content, ['逻辑能力', '引脚']).map((row) => ({
    interface: tableValue(row, ['逻辑能力']),
    instance: tableValue(row, ['STM32/CubeMX 实例', '实例']),
    pins: tableValue(row, ['引脚']),
    configuration: tableValue(row, ['配置']),
    usage: tableValue(row, ['当前绑定']),
    status: tableValue(row, ['状态']) || 'confirmed',
    source: sourcePath,
    confidence: 'confirmed',
  }));
}

function parsePinAllocation(content, sourcePath) {
  return parseResourceTable(content, ['引脚', '功能']).map((row) => ({
    pin: tableValue(row, ['引脚']),
    signal: tableValue(row, ['功能']),
    mode: tableValue(row, ['方向/模式', '模式']),
    usage: tableValue(row, ['当前用途或备注', '用途', '备注']),
    status: tableValue(row, ['状态']) || 'confirmed',
    source: sourcePath,
    confidence: 'confirmed',
  }));
}

function addResourceConflict(conflicts, category, severity, resource, detail, sources) {
  conflicts.push({ category, severity, resource, detail, sources: Array.from(new Set((sources || []).filter(Boolean))) });
}

function parseResourceConflicts(ioc, allocatedPins, allocationBuses, boardAttachments) {
  const conflicts = [];
  const iocPins = Array.isArray(ioc?.pins) ? ioc.pins : [];
  const dma = Array.isArray(ioc?.dma) ? ioc.dma : [];
  const pins = Array.isArray(allocatedPins) ? allocatedPins : [];
  const buses = Array.isArray(allocationBuses) ? allocationBuses : [];
  const interfaceNames = new Set(iocPins.map((pin) => String(pin.interface || '').toUpperCase()).filter(Boolean));
  const addDuplicateConflict = (items, key, label, sourceKey = 'source') => {
    const groups = new Map();
    items.forEach((item) => {
      const value = String(item[key] || '').trim();
      if (!value) return;
      if (!groups.has(value)) groups.set(value, []);
      groups.get(value).push(item);
    });
    groups.forEach((group, value) => {
      const distinct = Array.from(new Set(group.map((item) => String(item.signal || item.request || item.interface || item.device || '').trim()).filter(Boolean)));
      if (group.length > 1 && distinct.length > 1) addResourceConflict(conflicts, '重复占用', 'error', `${label} ${value}`, `发现多个不同用途：${distinct.join('、')}`, group.map((item) => item[sourceKey]));
    });
  };
  addDuplicateConflict(iocPins, 'pin', 'CubeMX 引脚');
  addDuplicateConflict(pins, 'pin', '资源表引脚');
  addDuplicateConflict(dma, 'instance', 'DMA 实例');
  const busPinGroups = new Map();
  buses.forEach((bus) => {
    const names = String(bus.pins || '').match(/\bP[A-Z]\d+\b/g) || [];
    names.forEach((pin) => {
      if (!busPinGroups.has(pin)) busPinGroups.set(pin, []);
      busPinGroups.get(pin).push(bus);
    });
  });
  busPinGroups.forEach((group, pin) => {
    const interfaces = Array.from(new Set(group.map((item) => String(item.interface || item.instance || '').trim()).filter(Boolean)));
    if (interfaces.length > 1) addResourceConflict(conflicts, '总线引脚冲突', 'error', pin, `同时出现在 ${interfaces.join('、')} 的资源分配中`, group.map((item) => item.source));
  });
  buses.forEach((bus) => {
    const rawInstance = String(bus.instance || bus.interface || '').toUpperCase();
    const instance = rawInstance.match(/^(I2C\d+|SPI\d+|USART\d+|UART\d+|ADC\d+|TIM\d+)/)?.[1] || rawInstance;
    if (instance && iocPins.length && !interfaceNames.has(instance)) addResourceConflict(conflicts, '配置不一致', 'warning', instance, '资源分配表声明了该接口，但 CubeMX 引脚信号中未找到对应实例。', [bus.source]);
  });
  const attachments = Array.isArray(boardAttachments?.attachments) ? boardAttachments.attachments : [];
  addDuplicateConflict(attachments.map((item) => ({ ...item, chipSelect: item.chipSelect })), 'chipSelect', '板级片选');
  addDuplicateConflict(attachments.map((item) => ({ ...item, irq: item.irq })), 'irq', '板级 IRQ');
  const sourceAvailable = iocPins.length > 0 || dma.length > 0 || pins.length > 0 || buses.length > 0 || Boolean(boardAttachments?.available);
  return {
    available: sourceAvailable,
    status: !sourceAvailable ? 'unverified' : conflicts.some((item) => item.severity === 'error') ? 'error' : conflicts.length ? 'warning' : 'confirmed',
    conflicts,
    checked: ['CubeMX 引脚', 'CubeMX DMA', '资源分配表', '板级挂接实例'],
    note: !sourceAvailable ? '未找到足够的静态资源证据，冲突状态未确认。' : conflicts.length ? '发现需要处理或复核的资源冲突；该结果来自静态配置比对。' : '基于当前静态配置未发现重复占用；不等同于目标板电气验证。',
  };
}

function parsePinLabels(content) {
  const labels = {};
  const pinPattern = /^\s*#define\s+([A-Za-z0-9_]+)_Pin\s+GPIO_PIN_(\d+)\s*$/gm;
  let match;
  while ((match = pinPattern.exec(String(content || '')))) {
    const label = match[1];
    const portMatch = String(content || '').match(new RegExp(`^\\s*#define\\s+${label}_GPIO_Port\\s+GPIO([A-Z])\\s*$`, 'm'));
    if (portMatch) labels[`P${portMatch[1]}${match[2]}`] = label;
  }
  return labels;
}

function parseMemoryNumber(value) {
  const normalized = String(value || '').replace(/\(\s*(?:size_t|uint\d+_t|int\d+_t|unsigned\s+long)\s*\)/gi, '').replace(/[()\s]/g, '').replace(/[uUlL]+$/g, '');
  if (/^0x[0-9a-f]+$/i.test(normalized)) return Number.parseInt(normalized, 16);
  if (/^\d+$/.test(normalized)) return Number.parseInt(normalized, 10);
  const product = normalized.match(/^(0x[0-9a-f]+|\d+)\*(0x[0-9a-f]+|\d+)$/i);
  if (product) return parseMemoryNumber(product[1]) * parseMemoryNumber(product[2]);
  return null;
}

function formatMemoryBytes(value) {
  if (!Number.isFinite(value)) return '未确认';
  const bytes = Math.round(value);
  return bytes >= 1024 ? `${(bytes / 1024).toFixed(bytes % 1024 ? 1 : 0)} KB (${bytes} B)` : `${bytes} B`;
}

function parseMemoryMacro(content, name) {
  const match = String(content || '').match(new RegExp(`^\\s*#define\\s+${name}\\s+(.+?)\\s*(?:/\\*.*)?$`, 'm'));
  return match ? parseMemoryNumber(match[1]) : null;
}

function readMemoryEvidence(projectRoot, build, issues) {
  const mapArtifact = (build.artifacts || []).find((artifact) => artifact.type === 'MAP');
  const mapPath = mapArtifact ? path.join(projectRoot, mapArtifact.path) : '';
  const mapSource = readResourceSource(projectRoot, mapPath, '链接 Map', issues, 2 * 1024 * 1024);
  const linkerPath = findResourceFiles(path.join(projectRoot, '06_Toolchain'), (filePath) => path.extname(filePath).toLowerCase() === '.ld', 1)[0] || '';
  const linkerSource = readResourceSource(projectRoot, linkerPath, '链接脚本', issues);
  const configPath = findResourceFiles(path.join(projectRoot, '06_Toolchain'), (filePath) => path.basename(filePath).toLowerCase() === 'freertosconfig.h', 1)[0] || '';
  const configSource = readResourceSource(projectRoot, configPath, 'FreeRTOS 配置', issues);
  const mapText = mapSource?.content || '';
  const memoryIndex = mapText.indexOf('Memory Configuration');
  const mapStart = mapText.indexOf('Linker script and memory map', memoryIndex >= 0 ? memoryIndex : 0);
  const memoryBlock = memoryIndex >= 0 ? mapText.slice(memoryIndex, mapStart >= 0 ? mapStart : undefined) : '';
  const mapRegion = (name) => {
    const match = memoryBlock.match(new RegExp(`^${name}\\s+0x([0-9a-f]+)\\s+0x([0-9a-f]+)`, 'im'));
    return match ? { name, origin: Number.parseInt(match[1], 16), capacity: Number.parseInt(match[2], 16), confidence: 'confirmed' } : null;
  };
  const regions = [mapRegion('FLASH'), mapRegion('RAM')].filter(Boolean);
  const linkMap = mapStart >= 0 ? mapText.slice(mapStart) : '';
  const sections = [];
  const sectionPattern = /^(\.[A-Za-z0-9_.$-]+)\s+0x([0-9a-f]+)\s+0x([0-9a-f]+)/gim;
  let sectionMatch;
  while ((sectionMatch = sectionPattern.exec(linkMap))) {
    const name = sectionMatch[1];
    if (!sections.some((section) => section.name === name)) sections.push({ name, address: Number.parseInt(sectionMatch[2], 16), size: Number.parseInt(sectionMatch[3], 16), confidence: 'confirmed' });
  }
  const sectionSize = (name) => sections.find((section) => section.name === name)?.size || 0;
  const flashNames = ['.isr_vector', '.text', '.rodata', '.ARM.extab', '.ARM', '.preinit_array', '.init_array', '.fini_array'];
  const ramNames = ['.data', '.tdata', '.noinit', '.tbss', '.bss'];
  const flashUsed = flashNames.reduce((total, name) => total + sectionSize(name), 0) + sectionSize('.data');
  const ramStaticUsed = ramNames.reduce((total, name) => total + sectionSize(name), 0);
  const linkerHeap = parseMemoryNumber(linkerSource?.content.match(/_Min_Heap_Size\s*=\s*([^;]+)/)?.[1]);
  const linkerStack = parseMemoryNumber(linkerSource?.content.match(/_Min_Stack_Size\s*=\s*([^;]+)/)?.[1]);
  const linkerHeapStack = sectionSize('._user_heap_stack') || (linkerHeap || 0) + (linkerStack || 0);
  const freertosHeap = parseMemoryMacro(configSource?.content, 'configTOTAL_HEAP_SIZE');
  const minimalStackWords = parseMemoryMacro(configSource?.content, 'configMINIMAL_STACK_SIZE');
  const timerStackWords = parseMemoryMacro(configSource?.content, 'configTIMER_TASK_STACK_DEPTH');
  const stackApiEnabled = /#define\s+INCLUDE_uxTaskGetStackHighWaterMark\s+1/.test(configSource?.content || '');
  const taskFilePredicate = (filePath) => ['.c', '.h'].includes(path.extname(filePath).toLowerCase()) && (() => { try { return fs.statSync(filePath).size <= MAX_EVIDENCE_BYTES; } catch { return false; } })();
  const taskSourceRoots = ['01_App', '02_Service', '04_Impl', path.join('06_Toolchain', 'cubemx')].map((relative) => path.join(projectRoot, relative));
  const taskSourcePaths = Array.from(new Set(taskSourceRoots.flatMap((root) => findResourceFiles(root, taskFilePredicate, 120))));
  const taskSources = taskSourcePaths.map((filePath) => readResourceSource(projectRoot, filePath, '任务栈配置', issues)).filter(Boolean);
  const taskStacks = [];
  const addTaskStack = (name, expression, sourcePath) => {
    const bytes = parseMemoryNumber(expression);
    if (bytes !== null && !taskStacks.some((task) => task.name === name)) taskStacks.push({ name, bytes, expression: String(expression).trim(), source: sourcePath, confidence: 'confirmed' });
  };
  taskSources.forEach((source) => {
    const attributes = /(?:const\s+)?osThreadAttr_t\s+(\w+)\s*=\s*\{([\s\S]*?)\};/g;
    let attribute;
    while ((attribute = attributes.exec(source.content))) {
      const taskName = attribute[2].match(/\.name\s*=\s*"([^"]+)"/)?.[1] || attribute[1];
      const stackExpression = attribute[2].match(/\.stack_size\s*=\s*([^,\n}]+)/)?.[1];
      if (stackExpression) addTaskStack(taskName, stackExpression, source.path);
    }
    const macroPattern = /^\s*#define\s+([A-Za-z0-9_]*TASK_STACK_SIZE)\s+([^\s/]+).*$/gm;
    let macro;
    while ((macro = macroPattern.exec(source.content))) {
      const taskCall = source.content.match(new RegExp(`(?:platform_os_task_create|osThreadAttr_t)[\\s\\S]{0,220}${macro[1]}`));
      if (taskCall) addTaskStack(macro[1].replace(/_TASK_STACK_SIZE$/, '').toLowerCase(), macro[2], source.path);
    }
  });
  const flash = regions.find((region) => region.name === 'FLASH');
  const ram = regions.find((region) => region.name === 'RAM');
  const reservedRam = ramStaticUsed + linkerHeapStack;
  return {
    available: Boolean(mapSource),
    flash: flash ? { ...flash, used: flashUsed, remaining: Math.max(0, flash.capacity - flashUsed), percent: flash.capacity ? Math.round((flashUsed / flash.capacity) * 1000) / 10 : null } : null,
    ram: ram ? { ...ram, used: ramStaticUsed, reserved: reservedRam, remaining: Math.max(0, ram.capacity - reservedRam), percent: ram.capacity ? Math.round((ramStaticUsed / ram.capacity) * 1000) / 10 : null, reservedPercent: ram.capacity ? Math.round((reservedRam / ram.capacity) * 1000) / 10 : null } : null,
    sections: sections.filter((section) => !/^\.debug|^\.comment|^\.ARM\.attributes/.test(section.name)),
    heap: { freertosBytes: freertosHeap, linkerBytes: linkerHeap, runtimeFreeBytes: null, runtimeMinimumFreeBytes: null, source: configSource?.path || linkerSource?.path || '', confidence: freertosHeap !== null || linkerHeap !== null ? 'confirmed' : 'unverified' },
    stack: { linkerBytes: linkerStack, minimalTaskBytes: minimalStackWords === null ? null : minimalStackWords * 4, timerTaskBytes: timerStackWords === null ? null : timerStackWords * 4, tasks: taskStacks, highWaterMarkAvailable: stackApiEnabled, runtimeHighWaterMark: null, source: configSource?.path || linkerSource?.path || '', confidence: linkerStack !== null || taskStacks.length > 0 ? 'confirmed' : 'unverified' },
    sources: [mapSource, linkerSource, configSource, ...taskSources.filter((source) => taskStacks.some((task) => task.source === source.path))].filter(Boolean).map(({ path: sourcePath, kind, hash }) => ({ path: sourcePath, kind, hash, confidence: 'confirmed' })),
    note: mapSource ? 'Flash/RAM 段占用来自同一次构建的 Map 文件；堆和栈配置来自链接脚本、FreeRTOSConfig.h 与任务属性。运行时空闲堆和栈 high-water mark 需要目标板采样。' : '未找到当前构建对应的 Map 文件，Flash/RAM 实际占用未确认。',
  };
}

function readResourceEvidence(projectRoot, project, build, logs, issues) {
  const iocPath = findResourceFiles(path.join(projectRoot, '06_Toolchain'), (filePath) => path.extname(filePath).toLowerCase() === '.ioc', 1)[0] || '';
  const iocSource = readResourceSource(projectRoot, iocPath, 'CubeMX 配置', issues);
  const ioc = parseCubeMxIoc(iocSource?.content || '');
  const allocationSources = RESOURCE_ALLOCATION_FILES.map((relative) => readResourceSource(projectRoot, path.join(projectRoot, relative), '资源分配表', issues)).filter(Boolean);
  const pinSource = allocationSources.find((source) => /核心引脚分配表/.test(source.path));
  const busSource = allocationSources.find((source) => /总线资源分配表/.test(source.path));
  const mainSources = findResourceFiles(path.join(projectRoot, '06_Toolchain'), (filePath) => ['main.c', 'gpio.c', 'i2c.c', 'spi.c', 'usart.c', 'adc.c', 'dma.c', 'rtc.c', 'tim.c'].includes(path.basename(filePath).toLowerCase()), 20).map((filePath) => readResourceSource(projectRoot, filePath, '外设初始化源码', issues)).filter(Boolean);
  const mainHeader = mainSources.find((source) => path.basename(source.path).toLowerCase() === 'main.h') || readResourceSource(projectRoot, findResourceFiles(path.join(projectRoot, '06_Toolchain'), (filePath) => path.basename(filePath).toLowerCase() === 'main.h', 1)[0], '引脚宏定义', issues);
  const pinLabels = parsePinLabels(mainHeader?.content || '');
  const allocationBuses = parseBusAllocation(busSource?.content || '', busSource?.path || '');
  const interfaces = allocationBuses.length ? allocationBuses : Array.from(new Set(ioc.pins.map((pin) => pin.interface).filter(Boolean))).map((name) => {
    const pins = ioc.pins.filter((pin) => pin.interface === name);
    return { interface: name, instance: name, pins: pins.map((pin) => `${pin.pin}=${pin.signal.replace(`${name}_`, '')}`).join('、'), configuration: '', usage: '来自 CubeMX 引脚信号配置', status: 'confirmed', source: iocSource?.path || '', confidence: 'inferred' };
  });
  const allocatedPins = parsePinAllocation(pinSource?.content || '', pinSource?.path || '');
  const pins = allocatedPins.length ? allocatedPins : ioc.pins.map((pin) => ({ pin: pin.pin, signal: pin.signal, mode: pin.mode || '未登记', usage: pinLabels[pin.pin] ? `源码标签：${pinLabels[pin.pin]}` : '', status: 'confirmed', source: iocSource?.path || '', confidence: 'inferred' }));
  const initializedPeripherals = ioc.initialized.filter((name) => /^MX_[A-Za-z0-9_]+_Init\(\)$/.test(name));
  const peripheralNames = Array.from(new Set([...ioc.ips, ...initializedPeripherals.map((name) => name.replace(/^MX_/, '').replace(/_Init\(\)$/, '').replace(/_UART$/, ''))])).filter((name) => name && !['DMA', 'FREERTOS', 'NVIC', 'RCC', 'SYS'].includes(name));
  const boardAttachments = readBoardAttachmentEvidence(projectRoot, issues);
  const conflicts = parseResourceConflicts(ioc, allocatedPins, allocationBuses, boardAttachments);
  const runtime = logs?.runtime || mergeRuntimeResourceEvidence([]);
  const hardwareResources = [
    ...peripheralNames.map((name) => { const initializer = initializedPeripherals.find((candidate) => candidate === `MX_${name}_Init()` || candidate.startsWith(`MX_${name}_`)); return { name, kind: '外设', mapping: initializer ? `已发现 ${initializer}` : 'CubeMX 已登记，初始化调用未确认', status: initializer ? 'confirmed' : 'unverified', source: iocSource?.path || '' }; }),
    ...ioc.dma.map((item) => ({ name: item.instance, kind: 'DMA', mapping: `${item.request} · ${item.direction.replace(/^DMA_/, '').replace(/_TO_/, ' → ').replace(/_/g, ' ')}`, status: 'confirmed', source: iocSource?.path || '' })),
    ...(ioc.mcu ? [{ name: '系统时钟', kind: '时钟', mapping: [ioc.hclk && `HCLK ${ioc.hclk}`, ioc.hse && `HSE ${ioc.hse}`].filter(Boolean).join(' · ') || '已配置，频率未登记', status: ioc.hclk || ioc.hse ? 'confirmed' : 'unverified', source: iocSource?.path || '' }] : []),
    { name: '器件级板级挂接', kind: '板级资源', mapping: boardAttachments.attachments.length ? `${boardAttachments.attachments.length} 个器件挂接实例` : boardAttachments.note, status: boardAttachments.status, source: boardAttachments.sources[0]?.path || '04_Impl/impl_board' },
  ];
  const memory = readMemoryEvidence(projectRoot, build, issues);
  const fields = [
    ['MCU', ioc.mcu || project.mcu || project.mcu_model],
    ['封装', ioc.package],
    ['板卡', ioc.board || project.board || project.board_name],
    ['工具链', ioc.toolchain || project.toolchain || project.tool_chain],
    ['HCLK', ioc.hclk],
    ['HSE', ioc.hse],
    ['Flash', memory.flash ? `${formatMemoryBytes(memory.flash.used)} / ${formatMemoryBytes(memory.flash.capacity)}` : (project.flash || project.flash_size)],
    ['RAM', memory.ram ? `${formatMemoryBytes(memory.ram.used)} / ${formatMemoryBytes(memory.ram.capacity)}` : (project.ram || project.ram_size)],
  ].map(([label, value]) => ({ label, value: value || '未登记', confidence: value ? 'confirmed' : 'unverified' }));
  const sources = [iocSource, ...allocationSources, ...mainSources, mainHeader, ...boardAttachments.sources].filter(Boolean).map(({ path: sourcePath, kind, hash, confidence }) => ({ path: sourcePath, kind, hash, confidence: confidence || 'confirmed' }));
  return {
    fields,
    interfaces,
    pins: pins.map((pin) => ({ ...pin, label: pinLabels[normalizeResourcePin(pin.pin)] || '' })),
    hardwareResources,
    boardAttachments,
    conflicts,
    runtime,
    memory,
    artifacts: (build.artifacts || []).slice(0, 20),
    sources,
    note: '接口、引脚和外设资源来自 CubeMX 配置、资源分配表和初始化源码；具体器件的片选、地址、复位、IRQ 与供电挂接若无板级实例则标记为未确认。当前页面是静态配置证据，不代表目标板已上电、已连接探针或已完成电气测量。',
  };
}

function runGit(projectRoot, args) {
  const result = spawnSync('git', ['-C', projectRoot, ...args], { encoding: 'utf8', timeout: 3000, windowsHide: true });
  if (result.error) return { ok: false, error: result.error.message, stdout: '', stderr: '' };
  return { ok: result.status === 0, error: result.status === 0 ? '' : (result.stderr || result.stdout || `exit ${result.status}`).trim(), stdout: result.stdout || '', stderr: result.stderr || '' };
}

function parseGitStatus(text) {
  const status = { staged: [], unstaged: [], untracked: [], raw: text };
  String(text || '').split(/\r?\n/).filter(Boolean).forEach((line) => {
    const code = line.slice(0, 2);
    const file = line.slice(3) || line;
    if (code === '??') status.untracked.push(file);
    else { if (code[0] && code[0] !== ' ') status.staged.push(file); if (code[1] && code[1] !== ' ') status.unstaged.push(file); }
  });
  return status;
}

function parseGitCommits(text) {
  return String(text || '').split(/\r?\n/).filter(Boolean).map((line) => {
    const [hash, shortHash, date, author, ...subject] = line.split('\t');
    return { hash, shortHash, date, author, subject: subject.join('\t') };
  });
}

function readGitSnapshot(projectRoot, issues) {
  if (!fs.existsSync(path.join(projectRoot, '.git'))) {
    const error = '项目根目录未发现 .git 元数据';
    issues.push(`Git unavailable: ${error}`);
    return { available: false, error, status: { staged: [], unstaged: [], untracked: [] }, commits: [] };
  }
  const top = runGit(projectRoot, ['rev-parse', '--show-toplevel']);
  if (!top.ok) { issues.push(`Git unavailable: ${top.error}`); return { available: false, error: top.error, status: { staged: [], unstaged: [], untracked: [] }, commits: [] }; }
  const branch = runGit(projectRoot, ['branch', '--show-current']);
  const head = runGit(projectRoot, ['rev-parse', '--short', 'HEAD']);
  const status = runGit(projectRoot, ['status', '--porcelain=v1']);
  const commits = runGit(projectRoot, ['log', '-8', '--date=iso-strict', '--pretty=format:%H\t%h\t%ad\t%an\t%s']);
  const diff = runGit(projectRoot, ['diff', '--stat']);
  const stagedDiff = runGit(projectRoot, ['diff', '--cached', '--stat']);
  return { available: true, root: top.stdout.trim(), branch: branch.stdout.trim() || '(detached HEAD)', head: head.stdout.trim(), status: parseGitStatus(status.stdout), commits: parseGitCommits(commits.stdout), diffStat: diff.stdout.trim(), stagedDiffStat: stagedDiff.stdout.trim() };
}

function summarizeTasks(requests) {
  const summary = { total: 0, completed: 0, inProgress: 0, blocked: 0, pending: 0, superseded: 0, unknown: 0, percent: 0 };
  requests.forEach((request) => TASK_STATUS_NAMES.forEach((name) => { summary[name] += request.taskSummary[name] || 0; }));
  summary.total = requests.reduce((total, request) => total + (request.taskSummary.total || 0), 0);
  summary.percent = summary.total === 0 ? 0 : Math.round((summary.completed / summary.total) * 100);
  return summary;
}

function collectAdjustments(requests, git) {
  const items = [];
  requests.forEach((request) => request.events.forEach((event) => {
    if (!/requirements_change|version|review_gate|blocked|task_completed|final_review|final_verify/.test(event.event || '')) return;
    items.push({ time: event.recorded_at || event.timestamp || '', kind: 'workflow', label: eventLabel(event.event), detail: `${request.requestId}${event.task_id ? ` · ${event.task_id}` : ''}` });
  }));
  (git.commits || []).slice(0, 8).forEach((commit) => items.push({ time: commit.date, kind: 'git', label: 'Git 提交', detail: `${commit.shortHash || commit.hash} · ${commit.subject}` }));
  return items.sort((a, b) => String(b.time).localeCompare(String(a.time))).slice(0, 40);
}

function readDashboardSnapshot(options = {}) {
  const paths = resolveDashboardPaths(options);
  const issues = [];
  const hasProjectDocuments = DOCUMENT_NAMES.some((name) => fs.existsSync(path.join(paths.docsDir, `${name}.md`)));
  const includeProject = hasProjectDocuments && (!options.requestId || paths.requestId === 'project');
  const requestIds = Array.from(new Set([
    ...(includeProject ? ['project'] : []),
    ...discoverRequestIds(paths.projectRoot),
    ...(paths.requestId !== 'project' ? [paths.requestId] : []),
  ]));
  const requests = requestIds.map((requestId) => readWorkflowRequest(paths.projectRoot, requestId, requestId === paths.requestId ? paths.docsDir : undefined, issues));
  if (!requests.length && paths.requestId !== 'project') requests.push(readWorkflowRequest(paths.projectRoot, paths.requestId, paths.docsDir, issues));
  const current = requests.find((request) => request.requestId === paths.requestId) || requests[0] || readWorkflowRequest(paths.projectRoot, paths.requestId, paths.docsDir, issues);
  const project = readProjectMetadata(paths.projectRoot, issues);
  const architecture = collectEvidence(paths.projectRoot, 'architecture', issues);
  const architectureTree = readArchitectureDirectoryTree(paths.projectRoot);
  const startup = collectEvidence(paths.projectRoot, 'startup', issues);
  const startupCode = readStartupCodeEvidence(paths.projectRoot);
  const git = readGitSnapshot(paths.projectRoot, issues);
  const taskSummary = summarizeTasks(requests);
  const adjustments = collectAdjustments(requests, git);
  const featureCatalog = readFeatureCatalog(paths.projectRoot, requests, issues);
  const logs = readLogEvidence(paths.projectRoot, issues);
  const build = readBuildEvidence(paths.projectRoot, logs);
  const resources = readResourceEvidence(paths.projectRoot, project, build, logs, issues);
  const snapshot = {
    generatedAt: new Date().toISOString(), paths, project, currentRequestId: current.requestId, documents: current.documents,
    taskSummary, workflow: current.workflow, events: current.events, issues, requests, architecture, architectureTree, startup, startupCode,
    progress: { requests: requests.map((request) => ({ requestId: request.requestId, featureTitle: request.featureTitle, taskSummary: request.taskSummary, workflow: request.workflow })) },
    adjustments, git, featureCatalog, logs, build, resources,
  };
  snapshot.contentDigest = computeSnapshotDigest(snapshot);
  return snapshot;
}

function computeSnapshotDigest(snapshot) {
  return crypto.createHash('sha256').update(JSON.stringify({ project: snapshot.project, documents: snapshot.documents, taskSummary: snapshot.taskSummary, workflow: snapshot.workflow, events: snapshot.events, issues: snapshot.issues, requests: snapshot.requests, architecture: snapshot.architecture, architectureTree: snapshot.architectureTree, startup: snapshot.startup, startupCode: snapshot.startupCode, adjustments: snapshot.adjustments, git: snapshot.git, featureCatalog: snapshot.featureCatalog, logs: snapshot.logs, build: snapshot.build, resources: snapshot.resources })).digest('hex');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function displayValue(value) { return value && typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''); }
function listItems(values, emptyText = '暂无') { const items = Array.isArray(values) ? values : []; return items.length ? items.map((value) => `<li>${escapeHtml(displayValue(value))}</li>`).join('') : `<li class="muted">${escapeHtml(emptyText)}</li>`; }
function sanitizeLinkUrl(value) { const url = String(value || '').trim(); return /^(https?:|mailto:)/i.test(url) ? url : ''; }

function renderInlineMarkdown(value) {
  const slots = [];
  const store = (html) => { const index = slots.push(html) - 1; return `\u0000${index}\u0000`; };
  let text = escapeHtml(value);
  text = text.replace(/`([^`\n]+)`/g, (_, code) => store(`<code>${code}</code>`));
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) => { const safeUrl = sanitizeLinkUrl(url); return safeUrl ? store(`<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${label}</a>`) : label; });
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_\n]+)__/g, '<strong>$1</strong>').replace(/~~([^~\n]+)~~/g, '<del>$1</del>').replace(/\*([^*\n]+)\*/g, '<em>$1</em>').replace(/_([^_\n]+)_/g, '<em>$1</em>');
  return text.replace(/\u0000(\d+)\u0000/g, (_, index) => slots[Number(index)] || '');
}

function isTableSeparator(line) { return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim()); }
function renderMarkdownTable(lines) {
  const headers = splitTableRow(lines[0]);
  const rows = lines.slice(2).map(splitTableRow);
  const renderCells = (cells, tag) => cells.map((cell) => `<${tag}>${renderInlineMarkdown(cell)}</${tag}>`).join('');
  return `<div class="table-scroll"><table class="markdown-table"><thead><tr>${renderCells(headers, 'th')}</tr></thead><tbody>${rows.map((row) => `<tr>${renderCells(row, 'td')}</tr>`).join('')}</tbody></table></div>`;
}

function renderMarkdown(value) {
  const lines = String(value || '').replace(/\r\n/g, '\n').split('\n');
  const output = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }
    const fence = line.match(/^\s*```\s*([\w+-]*)\s*$/);
    if (fence) {
      const codeLines = []; index += 1;
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) { codeLines.push(lines[index]); index += 1; }
      if (index < lines.length) index += 1;
      const language = fence[1] ? ` class="language-${escapeHtml(fence[1])}"` : '';
      output.push(`<pre class="code-block"><code${language}>${escapeHtml(codeLines.join('\n'))}</code></pre>`); continue;
    }
    if (index + 1 < lines.length && line.trim().startsWith('|') && isTableSeparator(lines[index + 1])) {
      const tableLines = [line, lines[index + 1]]; index += 2;
      while (index < lines.length && lines[index].trim().startsWith('|')) { tableLines.push(lines[index]); index += 1; }
      output.push(renderMarkdownTable(tableLines)); continue;
    }
    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) { const level = heading[1].length; output.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`); index += 1; continue; }
    if (/^\s{0,3}((\*\s*){3,}|(-\s*){3,}|(_\s*){3,})$/.test(line)) { output.push('<hr>'); index += 1; continue; }
    if (/^\s*>/.test(line)) {
      const quoteLines = []; while (index < lines.length && /^\s*>/.test(lines[index])) { quoteLines.push(lines[index].replace(/^\s*>\s?/, '')); index += 1; }
      output.push(`<blockquote>${renderMarkdown(quoteLines.join('\n'))}</blockquote>`); continue;
    }
    const unordered = line.match(/^\s*[-*+]\s+(.+)$/); const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      const orderedList = Boolean(ordered); const items = [];
      while (index < lines.length) {
        const match = lines[index].match(ordered ? /^\s*\d+[.)]\s+(.+)$/ : /^\s*[-*+]\s+(.+)$/); if (!match) break;
        let item = match[1]; const task = item.match(/^\[([ xX])\]\s+(.+)$/);
        if (task) { const checked = task[1].toLowerCase() === 'x'; item = `<label class="task-item"><input type="checkbox" disabled${checked ? ' checked' : ''}>${renderInlineMarkdown(task[2])}</label>`; } else item = renderInlineMarkdown(item);
        items.push(`<li>${item}</li>`); index += 1;
      }
      output.push(`<${orderedList ? 'ol' : 'ul'}>${items.join('')}</${orderedList ? 'ol' : 'ul'}>`); continue;
    }
    const paragraph = [line]; index += 1;
    while (index < lines.length && lines[index].trim()) { const next = lines[index]; if (/^\s*```|^\s{0,3}#{1,6}\s|^\s*>|^\s*[-*+]\s+|^\s*\d+[.)]\s+/.test(next)) break; paragraph.push(next); index += 1; }
    output.push(`<p>${paragraph.map(renderInlineMarkdown).join('<br>')}</p>`);
  }
  return output.join('') || '<p class="muted">文档暂无内容</p>';
}

function statusLabel(value) {
  const labels = { completed: '已完成', inProgress: '执行中', in_progress: '进行中', blocked: '阻塞', pending: '待处理', superseded: '已替代', unknown: '未知', task_execution: '任务执行', final_review: '最终审查', review_gate: '审查门禁', requirements_change: '需求变更', completed_status: '已完成', in_progress_status: '进行中' };
  return labels[String(value)] || String(value || '未知').replace(/_/g, ' ');
}
function formatDateTime(value) { if (!value) return '时间未知'; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'medium' }).format(date); }

function renderReadableValues(values, emptyText = '暂无') {
  const items = Array.isArray(values) ? values : [];
  if (!items.length) return `<span class="muted">${escapeHtml(emptyText)}</span>`;
  return `<ul>${items.map((value) => {
    if (!value || typeof value !== 'object') return `<li>${escapeHtml(displayValue(value))}</li>`;
    const id = value.id || value.task_id || value.question_id || ''; const title = value.question || value.message || value.detail || value.finding || value.event || '状态记录';
    const status = value.status ? ` · 状态：${statusLabel(value.status)}` : ''; const impact = value.impact ? ` · 影响：${value.impact}` : '';
    return `<li>${id ? `<strong>${escapeHtml(id)}</strong> ` : ''}${escapeHtml(title)}${escapeHtml(status)}${escapeHtml(impact)}</li>`;
  }).join('')}</ul>`;
}
function renderReviewCard(title, summary = {}) { const values = summary.deviations || summary.findings || []; return `<div class="summary-card"><div class="summary-card-title">${escapeHtml(title)}<span class="status">${escapeHtml(statusLabel(summary.status))}</span></div><p class="summary-line">${values.length ? `需要关注 ${escapeHtml(values.length)} 项` : '没有记录偏差或发现'}</p>${renderReadableValues(values, '没有偏差或发现')}</div>`; }

function eventLabel(eventName) {
  const labels = { task_started: '任务开始', task_completed: '任务完成', task_blocked: '任务阻塞', final_verify_completed: '最终验证完成', final_review_blocked: '最终审查阻塞', requirements_change_requested: '需求变更', requirements_change_confirmed: '需求变更确认', review_gate_reopened_and_approved: '审查门禁重新放行', final_review_completed: '最终审查完成' };
  return labels[eventName] || eventName || '状态事件';
}
function renderEventTimeline(events) {
  const items = (Array.isArray(events) ? events : []).slice(-24).reverse(); if (!items.length) return '<p class="muted">暂无状态事件</p>';
  return `<ol class="event-timeline">${items.map((event) => { const details = []; if (event.task_id) details.push(`任务 ${event.task_id}`); if (event.status) details.push(`状态：${statusLabel(event.status)}`); if (event.blocker) details.push(`阻塞：${event.blocker}`); if (event.tests) details.push(`验证：${event.tests}`); if (event.next) details.push(`下一步：${event.next}`); return `<li><div class="event-time">${escapeHtml(formatDateTime(event.recorded_at || event.timestamp))}</div><div class="event-body"><strong>${escapeHtml(eventLabel(event.event))}</strong>${details.length ? `<p>${escapeHtml(details.join(' · '))}</p>` : ''}</div></li>`; }).join('')}</ol>`;
}
function renderTaskRows(tasks, limit = 80) { if (!tasks.length) return '<tr><td colspan="4" class="muted">未找到 Task 行</td></tr>'; return tasks.slice(0, limit).map((task) => `<tr><td><strong>${escapeHtml(task.id)}</strong></td><td>${escapeHtml(task.title || '未命名任务')}</td><td><span class="status status-${escapeHtml(task.status)}">${escapeHtml(statusLabel(task.status))}</span></td><td>${escapeHtml(task.rawStatus)}</td></tr>`).join(''); }

function parseFlowEdges(block) {
  const edges = []; const pattern = /([A-Za-z0-9_-]+)(?:\s*[\[\(\{]([^\]\)\}]+)[\]\)\}])?\s*[-.]+>\s*([A-Za-z0-9_-]+)(?:\s*[\[\(\{]([^\]\)\}]+)[\]\)\}])?/g; let match;
  while ((match = pattern.exec(block))) edges.push({ from: match[2] || match[1], to: match[4] || match[3] });
  return edges;
}
function renderEvidencePage(title, evidence, emptyText) {
  const sourceCards = evidence.sources.map((source) => {
    const diagrams = source.mermaid.map((block) => { const edges = parseFlowEdges(block); const flow = edges.length ? `<div class="flow-list">${edges.map((edge) => `<div class="flow-step"><span>${escapeHtml(edge.from)}</span><b>→</b><span>${escapeHtml(edge.to)}</span></div>`).join('')}</div>` : '<p class="muted">未识别出可预览的箭头关系，保留 Mermaid 原文。</p>'; return `<section class="diagram-card"><h4>流程图预览</h4>${flow}<details><summary>查看 Mermaid 原文</summary><pre class="diagram-source">${escapeHtml(block)}</pre></details></section>`; }).join('');
    return `<article class="evidence-card"><div class="evidence-heading"><strong>${escapeHtml(source.path)}</strong><span class="status">${escapeHtml(source.confidence === 'confirmed' ? '已确认来源' : '推断匹配')}</span></div><div class="markdown-body">${renderMarkdown(source.content)}</div>${diagrams}<details class="source-view"><summary>查看原文</summary><pre>${escapeHtml(source.content)}</pre></details></article>`;
  }).join('');
  return `<section class="view-panel" data-page-panel="${evidence.kind}" id="page-${evidence.kind}" hidden><div class="section-title"><h2>${escapeHtml(title)}</h2><span class="subtle">文档/记录证据优先</span></div>${sourceCards || `<section class="panel warning"><strong>未确认</strong><p>${escapeHtml(emptyText)}</p><p class="muted">当前不会根据 C/C++ 源码自动猜测。</p></section>`}</section>`;
}
function renderRequestCards(requests) { if (!requests.length) return '<p class="muted">暂无 workflow request</p>'; return `<div class="request-grid">${requests.map((request) => `<article class="request-card"><div class="request-heading"><strong>${escapeHtml(request.requestId)}</strong><span class="status">${escapeHtml(statusLabel(request.workflow.current_status))}</span></div><h3>${escapeHtml(request.featureTitle)}</h3><p class="summary-line">当前阶段：${escapeHtml(statusLabel(request.workflow.current_stage))} · Task ${escapeHtml(request.taskSummary.completed)}/${escapeHtml(request.taskSummary.total)} · 完成度 ${escapeHtml(request.taskSummary.percent)}%</p><div class="progress"><span style="width:${Math.max(0, Math.min(100, request.taskSummary.percent))}%"></span></div><p class="muted">阻塞 ${escapeHtml(request.taskSummary.blocked)} 项 · 待处理 ${escapeHtml(request.taskSummary.pending)} 项 · 最近更新 ${escapeHtml(formatDateTime(request.updatedAt))}</p></article>`).join('')}</div>`; }
function renderAdjustments(adjustments) { if (!adjustments.length) return '<p class="muted">暂无调整记录</p>'; return `<ol class="event-timeline">${adjustments.map((item) => `<li><div class="event-time">${escapeHtml(formatDateTime(item.time))}</div><div class="event-body"><strong>${escapeHtml(item.label)}</strong><p>${escapeHtml(item.detail)}</p></div></li>`).join('')}</ol>`; }

function renderGitPage(git) {
  if (!git.available) return `<section class="view-panel" data-page-panel="git" id="page-git" hidden><div class="section-title"><h2>Git 管理</h2><span class="subtle">只读</span></div><section class="panel warning"><strong>Git 信息未确认</strong><p>${escapeHtml(git.error || '当前目录不是 Git 仓库或 Git 不可用。')}</p></section></section>`;
  const status = git.status || { staged: [], unstaged: [], untracked: [] }; const files = (values, empty) => values.length ? `<ul>${values.slice(0, 80).map((file) => `<li><code>${escapeHtml(file)}</code></li>`).join('')}</ul>` : `<p class="muted">${escapeHtml(empty)}</p>`; const commits = (git.commits || []).map((commit) => `<tr><td><code>${escapeHtml(commit.shortHash || '')}</code></td><td>${escapeHtml(commit.subject)}</td><td>${escapeHtml(commit.author)}</td><td>${escapeHtml(formatDateTime(commit.date))}</td></tr>`).join('');
  return `<section class="view-panel" data-page-panel="git" id="page-git" hidden><div class="section-title"><h2>Git 管理</h2><span class="subtle">只读仓库观测</span></div><section class="summary-grid compact"><div class="card"><span class="subtle">分支</span><strong>${escapeHtml(git.branch)}</strong></div><div class="card"><span class="subtle">HEAD</span><strong>${escapeHtml(git.head)}</strong></div><div class="card"><span class="subtle">已暂存</span><strong>${escapeHtml(status.staged.length)}</strong></div><div class="card"><span class="subtle">未提交/未跟踪</span><strong>${escapeHtml(status.unstaged.length + status.untracked.length)}</strong></div></section><section class="panel"><h3>工作区变更</h3><div class="git-columns"><div><h4>已暂存</h4>${files(status.staged, '没有已暂存文件')}</div><div><h4>未暂存</h4>${files(status.unstaged, '没有未暂存文件')}</div><div><h4>未跟踪</h4>${files(status.untracked, '没有未跟踪文件')}</div></div><h3>Diff 摘要</h3><pre class="git-stat">${escapeHtml([git.stagedDiffStat && `已暂存\n${git.stagedDiffStat}`, git.diffStat && `未暂存\n${git.diffStat}`].filter(Boolean).join('\n\n') || '暂无 diff stat')}</pre></section><section class="panel"><h3>最近提交</h3><div class="table-scroll"><table><thead><tr><th>提交</th><th>说明</th><th>作者</th><th>时间</th></tr></thead><tbody>${commits || '<tr><td colspan="4" class="muted">暂无提交记录</td></tr>'}</tbody></table></div></section></section>`;
}

function renderLegacyDashboardHtml(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') throw new TypeError('snapshot must be an object');
  const taskSummary = snapshot.taskSummary || {}; const workflow = snapshot.workflow || {}; const project = snapshot.project || {}; const issueItems = listItems(snapshot.issues, '没有发现解析问题'); const currentRequest = snapshot.requests?.find((request) => request.requestId === snapshot.currentRequestId); const documentLabels = { spec: '需求 Spec', plan: '实施 Plan', task: '任务 Task' };
  const documentPages = DOCUMENT_NAMES.map((name) => `<section class="view-panel" data-page-panel="${name}" id="page-${name}" hidden><article class="document-panel is-active" id="document-${name}"><div class="document-heading"><strong>${documentLabels[name]}</strong><span class="file-name">${escapeHtml(snapshot.paths?.documents?.[name] || `${name}.md`)}</span></div><div class="markdown-body">${renderMarkdown(snapshot.documents?.[name] || '')}</div><details class="source-view"><summary>查看原文</summary><pre>${escapeHtml(snapshot.documents?.[name] || '')}</pre></details></article></section>`).join('');
  const pageButtons = [['overview', '项目总览'], ['architecture', '软件架构'], ['startup', '启动流程'], ['progress', '工程进度'], ['adjustments', '调整记录'], ['git', 'Git 管理'], ['ai', 'AI 功能任务'], ['spec', '当前 Spec'], ['plan', '当前 Plan'], ['task', '当前 Task'], ['status', '问题与事件']].map(([name, label]) => `<button type="button" class="page-button${name === 'overview' ? ' is-active' : ''}" data-page-button="${name}" aria-selected="${name === 'overview' ? 'true' : 'false'}">${label}</button>`).join('');
  const percent = Math.max(0, Math.min(100, Number(taskSummary.percent) || 0));
  const overview = `<section class="view-panel is-active" data-page-panel="overview" id="page-overview"><div class="section-title"><h2>项目总览</h2><span class="subtle">一个项目 · 一个 HTML 驾驶舱</span></div><section class="panel project-intro"><h3>${escapeHtml(project.project || path.basename(snapshot.paths?.projectRoot || '项目'))}</h3><p>看板只在架构/启动资料、workflow、Git 观测内容真正变化时重写。当前功能：<strong>${escapeHtml(currentRequest?.featureTitle || snapshot.currentRequestId || '暂无')}</strong></p><p class="muted">项目路径：${escapeHtml(snapshot.paths?.projectRoot || '')} · MCU：${escapeHtml(project.mcu || '未登记')} · 工具链：${escapeHtml(project.toolchain || '未登记')}</p></section><section class="panel"><h3>总体工程进度</h3><p class="summary-line">总任务 ${escapeHtml(taskSummary.total || 0)} · 已完成 ${escapeHtml(taskSummary.completed || 0)} · 执行中 ${escapeHtml(taskSummary.inProgress || 0)} · 阻塞 ${escapeHtml(taskSummary.blocked || 0)} · 待处理 ${escapeHtml(taskSummary.pending || 0)} · 完成度 ${escapeHtml(percent)}%</p><div class="progress large"><span style="width:${percent}%"></span></div></section><section><h3>AI 功能工作流</h3>${renderRequestCards(snapshot.requests || [])}</section><section class="panel"><h3>最近调整</h3>${renderAdjustments((snapshot.adjustments || []).slice(0, 8))}</section></section>`;
  const progress = `<section class="view-panel" data-page-panel="progress" id="page-progress" hidden><div class="section-title"><h2>工程进度</h2><span class="subtle">跨 request 汇总</span></div>${renderRequestCards(snapshot.requests || [])}<section class="panel"><h3>当前功能 Task 明细</h3><div class="table-scroll"><table><thead><tr><th>Task</th><th>任务名称</th><th>状态</th><th>原始状态</th></tr></thead><tbody>${renderTaskRows(currentRequest?.taskSummary?.tasks || [])}</tbody></table></div></section></section>`;
  const adjustments = `<section class="view-panel" data-page-panel="adjustments" id="page-adjustments" hidden><div class="section-title"><h2>工程调整记录</h2><span class="subtle">需求、门禁、任务和 Git 提交</span></div><section class="panel">${renderAdjustments(snapshot.adjustments || [])}</section></section>`;
  const ai = `<section class="view-panel" data-page-panel="ai" id="page-ai" hidden><div class="section-title"><h2>AI 功能任务</h2><span class="subtle">需求 → 开发 → 测试 → 审查</span></div>${(snapshot.requests || []).map((request) => `<section class="panel feature-panel"><div class="request-heading"><div><strong>${escapeHtml(request.requestId)}</strong><h3>${escapeHtml(request.featureTitle)}</h3></div><span class="status">${escapeHtml(statusLabel(request.workflow.current_status))}</span></div><p class="summary-line">Spec：${escapeHtml(request.workflow.spec_version || '未记录')} · Plan：${escapeHtml(request.workflow.plan_version || '未记录')} · Task：${escapeHtml(request.workflow.task_version || '未记录')} · 当前阶段：${escapeHtml(statusLabel(request.workflow.current_stage))}</p><div class="progress"><span style="width:${Math.max(0, Math.min(100, request.taskSummary.percent))}%"></span></div><p class="summary-line">Task ${escapeHtml(request.taskSummary.completed)}/${escapeHtml(request.taskSummary.total)} 完成 · 阻塞 ${escapeHtml(request.taskSummary.blocked)} · 待处理 ${escapeHtml(request.taskSummary.pending)}</p><div class="two-column"><div><h4>阻塞项与待确认</h4>${renderReadableValues([...(request.workflow.blockers || []), ...(request.workflow.open_questions || [])], '没有阻塞或待确认问题')}</div><div><h4>最近 AI 事件</h4>${renderEventTimeline(request.events.slice(-8))}</div></div></section>`).join('') || '<section class="panel warning">暂无 AI 功能 request。</section>'}</section>`;
  const status = `<section class="view-panel" data-page-panel="status" id="page-status" hidden><div class="section-title"><h2>问题与事件</h2><span class="subtle">输入异常、阻塞、验证和最近事件</span></div><section class="panel ${snapshot.issues?.length ? 'warning' : 'ok'}"><h3>解析问题</h3><ul>${issueItems}</ul></section><section class="panel"><h3>当前状态</h3><div class="two-column"><div><h4>阻塞项</h4>${renderReadableValues(workflow.blockers, '当前没有阻塞项')}</div><div><h4>待确认问题</h4>${renderReadableValues(workflow.open_questions, '当前没有待确认问题')}</div></div><div class="stack"><h3>验证与审查</h3>${renderReviewCard('Verify', workflow.verify_summary || {})}${renderReviewCard('Final Review', workflow.final_review_summary || {})}</div></section><section class="panel"><h3>最近状态事件</h3>${renderEventTimeline(snapshot.events)}</section></section>`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>项目工程驾驶舱</title><style>
:root{color-scheme:light;font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;background:#f3f6f8;color:#173042}*{box-sizing:border-box}body{margin:0;padding:22px}main{max-width:1480px;margin:0 auto}h1,h2,h3,h4{margin:0}h1{font-size:clamp(24px,3vw,36px);letter-spacing:-.02em}h2{font-size:21px;margin-bottom:12px}h3{font-size:17px;margin-bottom:8px}h4{font-size:14px;margin-bottom:7px}.subtle,.muted{color:#627782}p{line-height:1.7}.header{display:flex;justify-content:space-between;gap:20px;align-items:flex-end;margin-bottom:18px}.header-meta{text-align:right;max-width:62%;overflow-wrap:anywhere}.eyebrow{color:#0f766e;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:18px}.summary-grid.compact{margin-bottom:14px}.card,.panel,.document-panel,.evidence-card,.request-card{background:#fff;border:1px solid #d6e1e6;border-radius:12px;box-shadow:0 3px 12px #17304212}.card{padding:15px;min-width:0}.card strong{display:block;font-size:24px;margin-top:6px;overflow-wrap:anywhere}.progress{height:10px;background:#e1eaee;border-radius:6px;overflow:hidden;margin-top:10px}.progress span{display:block;height:100%;background:linear-gradient(90deg,#0f766e,#2aa198)}.progress.large{height:14px}.panel{padding:16px;min-width:0;margin-bottom:18px}.page-nav{position:sticky;top:0;z-index:5;display:flex;flex-wrap:wrap;gap:7px;padding:8px;margin-bottom:18px;border:1px solid #d6e1e6;border-radius:10px;background:#eef5f6ee;backdrop-filter:blur(8px)}.page-button{border:1px solid transparent;border-radius:8px;padding:9px 13px;background:transparent;color:#42626b;cursor:pointer;font:inherit;font-weight:700}.page-button:hover,.page-button.is-active{color:#0b5f67;background:#fff;border-color:#9bc9c5;box-shadow:0 2px 5px #17304212}.view-panel[hidden]{display:none}.section-title{display:flex;justify-content:space-between;align-items:baseline;gap:12px}.request-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-bottom:18px}.request-card{padding:15px}.request-heading,.evidence-heading{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.request-card h3{margin-top:11px}.feature-panel{border-left:5px solid #79bdb6}.two-column,.git-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.git-columns{grid-template-columns:repeat(3,minmax(0,1fr))}.stack{display:grid;gap:12px}.summary-line{color:#4e6670;line-height:1.8}.summary-card{padding:12px 14px;border-radius:9px;background:#f8fbfc;border:1px solid #e4ecef}.summary-card-title{display:flex;justify-content:space-between;align-items:center;gap:10px;font-weight:800}.status{display:inline-block;border-radius:999px;padding:3px 9px;font-size:12px;font-weight:700;background:#edf1f2;color:#50636b;white-space:nowrap}.status-completed{background:#dcfce7;color:#166534}.status-inProgress{background:#dbeafe;color:#1d4ed8}.status-blocked{background:#fee2e2;color:#b91c1c}.status-pending{background:#fef3c7;color:#92400e}.status-superseded{background:#f1f5f9;color:#64748b}.warning{border-color:#f1c6a7;background:#fffaf6}.ok{border-color:#b8dec9;background:#f6fff8}ul{margin:8px 0 0;padding-left:22px}li{margin:5px 0;line-height:1.55;overflow-wrap:anywhere}code{white-space:pre-wrap;word-break:break-word;font:.9em/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}.table-scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;min-width:560px;background:#fff}th,td{text-align:left;border-bottom:1px solid #e4ecef;padding:9px 10px;vertical-align:top}th{background:#f7fafb;color:#4e6670;font-size:13px}.document-panel{overflow:hidden}.document-heading{display:flex;justify-content:space-between;gap:12px;padding:15px 17px;background:#f8fbfc;border-bottom:1px solid #e4ecef}.file-name{color:#71838b;font:12px ui-monospace,monospace;font-weight:500}.markdown-body{padding:18px 20px 20px;line-height:1.75;overflow-wrap:anywhere}.markdown-body h1,.markdown-body h2,.markdown-body h3,.markdown-body h4,.markdown-body h5,.markdown-body h6{margin:1.2em 0 .45em;line-height:1.3}.markdown-body h1{font-size:26px}.markdown-body h2{font-size:22px}.markdown-body h3{font-size:19px}.markdown-body p{margin:.65em 0}.markdown-body blockquote{margin:12px 0;padding:4px 15px;border-left:4px solid #79bdb6;background:#f2faf9;color:#42626b}.markdown-body ul,.markdown-body ol{margin:.5em 0 .8em}.markdown-body li{margin:3px 0}.markdown-body a{color:#0f6470}.markdown-body code{padding:2px 5px;border-radius:4px;background:#edf2f4}.markdown-body .code-block{overflow-x:auto;margin:12px 0;padding:14px;border-radius:8px;background:#172a35;color:#e5f3f1}.markdown-body .code-block code{padding:0;background:transparent;color:inherit}.markdown-body hr{border:0;border-top:1px solid #d6e1e6;margin:20px 0}.markdown-table{min-width:0}.markdown-table th,.markdown-table td{white-space:normal}.task-item{display:inline-flex;align-items:baseline;gap:7px}.source-view{margin:0 15px 15px;border-top:1px dashed #d6e1e6}.source-view summary,details summary{cursor:pointer;padding:12px 4px 0;color:#52707a;font-size:13px}.source-view pre,.diagram-source,.git-stat{margin:0;padding:10px 4px 0;overflow:auto;white-space:pre-wrap;word-break:break-word;font:13px/1.6 ui-monospace,monospace}.evidence-card{overflow:hidden;margin-bottom:16px}.evidence-heading{padding:14px 16px;background:#f8fbfc;border-bottom:1px solid #e4ecef}.evidence-card .markdown-body{max-height:600px;overflow:auto}.diagram-card{margin:0 16px 16px;padding:14px;border:1px solid #d6e1e6;border-radius:9px;background:#fbfefe}.flow-list{display:grid;gap:7px}.flow-step{display:flex;align-items:center;gap:9px;flex-wrap:wrap}.flow-step span{padding:7px 12px;border-radius:7px;background:#e4f4f1;color:#155e63;font-weight:700}.flow-step b{color:#0f766e}.event-timeline{list-style:none;margin:0;padding:0}.event-timeline li{display:grid;grid-template-columns:155px minmax(0,1fr);gap:12px;padding:10px 0;border-bottom:1px solid #e4ecef}.event-timeline li:last-child{border-bottom:0}.event-time{color:#71838b;font:12px/1.5 ui-monospace,monospace}.event-body p{margin:4px 0 0;color:#536b74}.git-stat{padding:12px;background:#f7fafb;border-radius:8px}.project-intro{border-left:5px solid #2aa198}@media(max-width:960px){body{padding:15px}.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.two-column,.git-columns{grid-template-columns:1fr}}@media(max-width:560px){.header{display:block}.header-meta{max-width:none;text-align:left;margin-top:8px}.summary-grid{grid-template-columns:1fr}.card strong{font-size:21px}.markdown-body{padding:14px}.event-timeline li{grid-template-columns:1fr;gap:3px}}
</style></head><body><main><header class="header"><div><div class="eyebrow">Project Engineering Cockpit</div><h1>项目工程驾驶舱</h1></div><div class="header-meta subtle">项目：${escapeHtml(project.project || '')}<br>当前功能：${escapeHtml(snapshot.currentRequestId || '暂无')}<br>生成时间：${escapeHtml(snapshot.generatedAt || '')}<br>仅在观测内容变化时更新</div></header><section class="summary-grid" aria-label="项目总览"><div class="card"><span class="subtle">当前阶段</span><strong>${escapeHtml(statusLabel(workflow.current_stage))}</strong></div><div class="card"><span class="subtle">工作流状态</span><strong>${escapeHtml(statusLabel(workflow.current_status))}</strong></div><div class="card"><span class="subtle">总体完成度</span><strong>${escapeHtml(`${taskSummary.completed || 0}/${taskSummary.total || 0}`)}</strong><div class="progress"><span style="width:${percent}%"></span></div></div><div class="card"><span class="subtle">需要关注</span><strong>${escapeHtml(String((snapshot.issues || []).length + (taskSummary.blocked || 0)))} 项</strong></div></section><nav class="page-nav" role="tablist" aria-label="项目驾驶舱页面导航">${pageButtons}</nav><div class="page-content">${overview}${renderEvidencePage('软件架构', snapshot.architecture || { kind: 'architecture', sources: [] }, '未找到 00_Docs/06_嵌入式插件输出/architecture、兼容的 docs/architecture 或明确的架构设计资料。')}${renderEvidencePage('启动流程', snapshot.startup || { kind: 'startup', sources: [] }, '未找到 docs/boot、docs/startup 或明确的启动流程资料。')}${progress}${adjustments}${renderGitPage(snapshot.git || { available: false })}${ai}${documentPages}${status}</div></main><script>(()=>{const buttons=Array.from(document.querySelectorAll('[data-page-button]'));const panels=Array.from(document.querySelectorAll('[data-page-panel]'));buttons.forEach(button=>button.addEventListener('click',()=>{const selected=button.dataset.pageButton;buttons.forEach(item=>{const active=item===button;item.classList.toggle('is-active',active);item.setAttribute('aria-selected',String(active));});panels.forEach(panel=>{const active=panel.dataset.pagePanel===selected;panel.hidden=!active;panel.classList.toggle('is-active',active);});}));})();</script></body></html>`;
}

function renderEvidenceContent(evidence, emptyText) {
  const sources = evidence.sources || [];
  if (!sources.length) return `<section class="panel warning"><strong>未确认</strong><p>${escapeHtml(emptyText)}</p><p class="muted">当前不会根据 C/C++ 源码自动猜测。</p></section>`;
  return sources.map((source) => {
    const diagrams = (source.mermaid || []).map((block) => {
      const edges = parseFlowEdges(block);
      const flow = edges.length ? `<div class="flow-list">${edges.map((edge) => `<div class="flow-step"><span>${escapeHtml(edge.from)}</span><b>→</b><span>${escapeHtml(edge.to)}</span></div>`).join('')}</div>` : '<p class="muted">未识别出可预览的箭头关系，保留 Mermaid 原文。</p>';
      return `<section class="diagram-card"><h4>流程图预览</h4>${flow}<details><summary>查看 Mermaid 原文</summary><pre class="diagram-source">${escapeHtml(block)}</pre></details></section>`;
    }).join('');
    return `<article class="evidence-card"><div class="evidence-heading"><strong>${escapeHtml(source.path)}</strong><span class="status">${escapeHtml(source.confidence === 'confirmed' ? '已确认来源' : '推断匹配')}</span></div><div class="markdown-body">${renderMarkdown(source.content)}</div>${diagrams}<details class="source-view"><summary>查看原文</summary><pre>${escapeHtml(source.content)}</pre></details></article>`;
  }).join('');
}

function renderGitContent(git, adjustments = []) {
  if (!git.available) return `<section class="panel warning"><strong>Git 信息未确认</strong><p>${escapeHtml(git.error || '当前目录不是 Git 仓库或 Git 不可用。')}</p></section>`;
  const status = git.status || { staged: [], unstaged: [], untracked: [] };
  const files = (values, empty) => values.length ? `<ul>${values.slice(0, 80).map((file) => `<li><code>${escapeHtml(file)}</code></li>`).join('')}</ul>` : `<p class="muted">${escapeHtml(empty)}</p>`;
  const changedCount = status.staged.length + status.unstaged.length + status.untracked.length;
  const latestCommit = (git.commits || [])[0];
  const fallbackTimeline = (git.commits || []).map((commit) => ({ time: commit.date, kind: 'git', label: 'Git 提交', detail: `${commit.shortHash || commit.hash} · ${commit.subject}` }));
  const timelineItems = (adjustments.length ? adjustments : fallbackTimeline).slice(0, 24);
  const timeline = timelineItems.length ? `<ol class="event-timeline">${timelineItems.map((item) => `<li><div class="event-time">${escapeHtml(formatDateTime(item.time))}</div><div class="event-body"><span class="tag">${escapeHtml(item.kind === 'git' ? 'Git 提交' : '工作流调整')}</span><strong>${escapeHtml(item.label || '状态调整')}</strong><p>${escapeHtml(item.detail || '暂无说明')}</p></div></li>`).join('')}</ol>` : '<p class="muted">暂无 Git 或工作流调整记录。</p>';
  const diffSummary = [git.stagedDiffStat && `已暂存\n${git.stagedDiffStat}`, git.diffStat && `未暂存\n${git.diffStat}`].filter(Boolean).join('\n\n') || '暂无 diff stat';
  return `<section class="summary-grid compact"><div class="card"><span class="subtle">当前分支</span><strong>${escapeHtml(git.branch || '未确认')}</strong></div><div class="card"><span class="subtle">HEAD</span><strong>${escapeHtml(git.head || '未确认')}</strong></div><div class="card"><span class="subtle">工作区状态</span><strong>${changedCount ? '有变更' : '干净'}</strong><span class="status ${changedCount ? 'status-pending' : 'status-completed'}">${changedCount ? `${changedCount} 个文件` : '无未提交文件'}</span></div><div class="card"><span class="subtle">最近提交</span><strong>${escapeHtml(latestCommit?.shortHash || '暂无')}</strong><span class="subtle">${escapeHtml(latestCommit ? formatDateTime(latestCommit.date) : '时间未知')}</span></div></section><section class="panel project-intro"><div class="section-title"><div><h3>项目变化时间线</h3><p class="muted">Git 提交与 AI 工作流调整合并展示，最近事件在前。</p></div><span class="status status-completed">只读观测</span></div>${timeline}</section><details class="panel"><summary>查看工作区变更（${escapeHtml(changedCount)} 个文件）</summary><div class="git-columns"><div><h4>已暂存 · ${escapeHtml(status.staged.length)}</h4>${files(status.staged, '没有已暂存文件')}</div><div><h4>未暂存 · ${escapeHtml(status.unstaged.length)}</h4>${files(status.unstaged, '没有未暂存文件')}</div><div><h4>未跟踪 · ${escapeHtml(status.untracked.length)}</h4>${files(status.untracked, '没有未跟踪文件')}</div></div></details><details class="panel"><summary>查看 Diff 摘要</summary><pre class="git-stat">${escapeHtml(diffSummary)}</pre></details>`;
}

function renderFeatureCard(feature) {
  const statusClass = `status-${feature.status}`;
  const requests = feature.requestIds.length ? feature.requestIds.join('、') : '未关联 REQ';
  return `<article class="feature-card"><div class="feature-heading"><div><span class="tag">${escapeHtml(feature.layer)}</span><h3>${escapeHtml(feature.name)}</h3></div><span class="status ${statusClass}">${escapeHtml(statusLabel(feature.status))}</span></div><p class="summary-line">${escapeHtml(feature.description || '暂无功能描述')}</p><p class="muted">关联 REQ：${escapeHtml(requests)} · Task ${escapeHtml(feature.taskSummary.completed)}/${escapeHtml(feature.taskSummary.total)} · ${escapeHtml(feature.reason)}</p><div class="progress"><span style="width:${Math.max(0, Math.min(100, feature.taskSummary.percent))}%"></span></div></article>`;
}

function renderFeatureGroup(title, features, emptyText) {
  return `<section class="panel feature-group"><div class="section-title"><h3>${escapeHtml(title)}</h3><span class="subtle">${escapeHtml(features.length)} 项</span></div>${features.length ? `<div class="feature-grid">${features.map(renderFeatureCard).join('')}</div>` : `<p class="muted">${escapeHtml(emptyText)}</p>`}</section>`;
}

function renderLogContent(logs) {
  if (!logs.available) return `<section class="panel warning"><strong>暂无日志</strong><p>目录 ${escapeHtml(logs.directory)} 中暂未发现约定的日志文件。</p><p class="muted">工作台只读展示，不连接串口、RTT 或 MCU 寄存器。</p></section>`;
  return `<section class="panel"><p class="muted">只显示日志摘要和末尾 ${MAX_LOG_LINES} 行；文件由外部工具写入，工作台不执行调试动作。</p><div class="log-grid">${logs.files.map((file) => `<article class="log-card"><div class="feature-heading"><div><strong>${escapeHtml(file.label)}</strong><p class="muted">${escapeHtml(file.path)}</p></div><span class="status">${escapeHtml(formatDateTime(file.updatedAt))}</span></div><p class="summary-line">${escapeHtml(file.lineCount)} 行 · 错误/异常 ${escapeHtml(file.errorCount)} · 警告 ${escapeHtml(file.warningCount)}</p><details><summary>查看末尾内容</summary><pre class="log-content">${escapeHtml(file.tail || '文件为空')}</pre></details></article>`).join('')}</div></section>`;
}

function renderBuildContent(build) {
  const artifacts = build.artifacts || [];
  return `<section class="panel ${build.available ? 'ok' : 'warning'}"><strong>${escapeHtml(build.available ? '已发现构建证据' : '未发现构建证据')}</strong><p>${escapeHtml(build.note)}</p><p class="muted">本页面只读展示已有文件，不代表本次已重新编译或目标板已运行。</p></section>${build.buildLog ? `<section class="panel"><h3>构建日志摘要</h3><p class="summary-line">${escapeHtml(build.buildLog.path)} · ${escapeHtml(build.buildLog.lineCount)} 行 · 错误/异常 ${escapeHtml(build.buildLog.errorCount)}</p><details><summary>查看末尾内容</summary><pre class="log-content">${escapeHtml(build.buildLog.tail || '文件为空')}</pre></details></section>` : ''}<section class="panel"><h3>已有产物</h3>${artifacts.length ? `<div class="table-scroll"><table><thead><tr><th>类型</th><th>路径</th><th>大小</th><th>更新时间</th></tr></thead><tbody>${artifacts.map((artifact) => `<tr><td>${escapeHtml(artifact.type)}</td><td><code>${escapeHtml(artifact.path)}</code></td><td>${escapeHtml(artifact.bytes)} B</td><td>${escapeHtml(formatDateTime(artifact.updatedAt))}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">暂无 .bin/.hex/.elf/.map 等已登记产物。</p>'}</section>`;
}

function renderResourceContent(resources) {
  const fields = Array.isArray(resources.fields) ? resources.fields : [];
  const interfaces = Array.isArray(resources.interfaces) ? resources.interfaces : [];
  const pins = Array.isArray(resources.pins) ? resources.pins : [];
  const hardwareResources = Array.isArray(resources.hardwareResources) ? resources.hardwareResources : [];
  const boardAttachments = resources.boardAttachments || {};
  const conflicts = resources.conflicts || {};
  const runtime = resources.runtime || {};
  const sources = Array.isArray(resources.sources) ? resources.sources : [];
  const memory = resources.memory || {};
  const statusText = (value) => value === 'confirmed' ? '已确认来源' : value === 'inferred' ? '推断匹配' : '未确认';
  const memoryStatus = (value) => value === 'confirmed' ? '已确认' : '未确认';
  const memoryMetric = (label, value, detail, status = 'confirmed') => `<article class="memory-card"><span class="subtle">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><p class="memory-detail">${escapeHtml(detail)}</p><span class="status ${status === 'confirmed' ? 'status-completed' : 'status-pending'}">${escapeHtml(memoryStatus(status))}</span></article>`;
  const flash = memory.flash;
  const ram = memory.ram;
  const memorySectionRows = (memory.sections || []).filter((section) => ['.isr_vector', '.text', '.rodata', '.data', '.bss', '._user_heap_stack'].includes(section.name)).map((section) => `<tr><td><code>${escapeHtml(section.name)}</code></td><td>${escapeHtml(formatMemoryBytes(section.size))}</td><td><code>0x${section.address.toString(16).toUpperCase()}</code></td><td><span class="status status-completed">已确认</span></td></tr>`).join('');
  const taskStackRows = (memory.stack?.tasks || []).map((task) => `<tr><td>${escapeHtml(task.name)}</td><td>${escapeHtml(formatMemoryBytes(task.bytes))}</td><td><code>${escapeHtml(task.expression)}</code></td><td><code>${escapeHtml(task.source)}</code></td></tr>`).join('');
  const memoryMarkup = `<section class="panel"><div class="section-title"><h3>Flash / RAM 占用</h3><span class="subtle">来源：同一次构建的 Map 文件</span></div><div class="memory-grid">${memoryMetric('Flash 已识别占用', flash ? formatMemoryBytes(flash.used) : '未确认', flash ? `容量 ${formatMemoryBytes(flash.capacity)} · 剩余 ${formatMemoryBytes(flash.remaining)} · ${flash.percent}%` : '未找到当前构建 Map', flash ? 'confirmed' : 'unverified')}${memoryMetric('RAM 静态段占用', ram ? formatMemoryBytes(ram.used) : '未确认', ram ? `容量 ${formatMemoryBytes(ram.capacity)} · 剩余（含保留区前）${formatMemoryBytes(Math.max(0, ram.capacity - ram.used))} · ${ram.percent}%` : '未找到当前构建 Map', ram ? 'confirmed' : 'unverified')}${memoryMetric('RAM 链接器保留后', ram ? formatMemoryBytes(ram.reserved) : '未确认', ram ? `包含 .data/.bss 与链接器堆栈保留 · 剩余 ${formatMemoryBytes(ram.remaining)} · ${ram.reservedPercent}%` : '未找到当前构建 Map', ram ? 'confirmed' : 'unverified')}</div>${memorySectionRows ? `<div class="table-scroll"><table class="resource-table"><thead><tr><th>段</th><th>大小</th><th>起始地址</th><th>证据</th></tr></thead><tbody>${memorySectionRows}</tbody></table></div>` : '<p class="muted">没有可解析的 Map 段信息。</p>'}</section><section class="panel"><div class="section-title"><h3>堆与堆栈配置</h3><span class="subtle">配置值 ≠ 运行时实际余量</span></div><div class="memory-grid">${memoryMetric('FreeRTOS 动态堆', memory.heap?.freertosBytes === null || memory.heap?.freertosBytes === undefined ? '未确认' : formatMemoryBytes(memory.heap.freertosBytes), 'configTOTAL_HEAP_SIZE；运行时空闲堆未采样', memory.heap?.freertosBytes === null || memory.heap?.freertosBytes === undefined ? 'unverified' : 'confirmed')}${memoryMetric('链接器保底堆', memory.heap?.linkerBytes === null || memory.heap?.linkerBytes === undefined ? '未确认' : formatMemoryBytes(memory.heap.linkerBytes), '._user_heap_stack 中的 _Min_Heap_Size', memory.heap?.linkerBytes === null || memory.heap?.linkerBytes === undefined ? 'unverified' : 'confirmed')}${memoryMetric('链接器主栈', memory.stack?.linkerBytes === null || memory.stack?.linkerBytes === undefined ? '未确认' : formatMemoryBytes(memory.stack.linkerBytes), '_Min_Stack_Size；实际栈使用未采样', memory.stack?.linkerBytes === null || memory.stack?.linkerBytes === undefined ? 'unverified' : 'confirmed')}${memoryMetric('最小任务栈', memory.stack?.minimalTaskBytes === null || memory.stack?.minimalTaskBytes === undefined ? '未确认' : formatMemoryBytes(memory.stack.minimalTaskBytes), 'configMINIMAL_STACK_SIZE × sizeof(StackType_t)', memory.stack?.minimalTaskBytes === null || memory.stack?.minimalTaskBytes === undefined ? 'unverified' : 'confirmed')}</div>${taskStackRows ? `<h4>源码中识别到的任务栈</h4><div class="table-scroll"><table class="resource-table"><thead><tr><th>任务</th><th>栈大小</th><th>配置表达式</th><th>来源</th></tr></thead><tbody>${taskStackRows}</tbody></table></div>` : '<p class="muted">未识别到任务栈属性。</p>'}<p class="memory-note">${escapeHtml(memory.note || '运行时空闲堆、任务栈 high-water mark 和目标板实际状态尚未采集。')} ${memory.stack?.highWaterMarkAvailable ? '当前 FreeRTOS 已启用 high-water mark API，但看板尚未发现对应运行日志。' : ''}</p></section>`;
  const runtimeMetric = (label, value, detail) => memoryMetric(label, value, detail, runtime.confidence === 'confirmed' ? 'confirmed' : 'unverified');
  const runtimeTaskRows = (runtime.tasks || []).length ? runtime.tasks.map((task) => `<tr><td>${escapeHtml(task.name)}</td><td>${task.stackHighWaterWords === null ? '未采集' : `${escapeHtml(task.stackHighWaterWords)} words`}</td><td>${task.cpuPercent === null ? '未采集' : `${escapeHtml(task.cpuPercent)}%`}</td><td>${escapeHtml(task.state || '未登记')}</td><td><code>${escapeHtml(task.source || '')}</code></td></tr>`).join('') : '<tr><td colspan="5" class="muted">尚未采集任务运行时状态。</td></tr>';
  const runtimeMarkup = `<section class="panel"><div class="section-title"><h3>目标板运行时资源状态</h3><span class="status ${runtime.confidence === 'confirmed' ? 'status-completed' : 'status-pending'}">${runtime.confidence === 'confirmed' ? '已采集日志' : '未采集'}</span></div><p class="muted">仅解析日志中的 <code>MCUWB_RUNTIME</code> 和 <code>MCUWB_TASK</code> 采样行；不连接目标板，也不执行调试动作。</p><div class="memory-grid">${runtimeMetric('运行时空闲堆', runtime.heapFreeBytes === null || runtime.heapFreeBytes === undefined ? '未采集' : formatMemoryBytes(runtime.heapFreeBytes), 'heap_free_bytes')}${runtimeMetric('历史最低空闲堆', runtime.heapMinimumFreeBytes === null || runtime.heapMinimumFreeBytes === undefined ? '未采集' : formatMemoryBytes(runtime.heapMinimumFreeBytes), 'heap_min_free_bytes')}${runtimeMetric('CPU 占用', runtime.cpuPercent === null || runtime.cpuPercent === undefined ? '未采集' : `${runtime.cpuPercent}%`, 'cpu_percent')}${runtimeMetric('任务采样数', `${(runtime.tasks || []).length}`, `采样行 ${runtime.sampleCount || 0} 条`)}</div><div class="table-scroll"><table class="resource-table"><thead><tr><th>任务</th><th>栈 high-water</th><th>CPU</th><th>状态</th><th>来源</th></tr></thead><tbody>${runtimeTaskRows}</tbody></table></div><p class="memory-note">${escapeHtml(runtime.note || '尚未采集目标板运行时资源。')} ${runtime.sources?.length ? `来源：${escapeHtml(runtime.sources.join('、'))}` : ''}</p></section>`;
  const detailForInterface = (item) => `接口 ${item.interface || '未命名'}；引脚：${item.pins || '未登记'}；当前绑定：${item.usage || '未登记'}；配置：${item.configuration || '未登记'}；证据：${item.source || '未登记'}。`;
  const detailForResource = (item) => `${item.kind || '资源'} ${item.name || '未命名'}；映射：${item.mapping || '未登记'}；证据：${item.source || '未登记'}。`;
  const detailForAttachment = (item) => `器件 ${item.device || '未命名'}；总线：${item.bus || '未登记'}；地址：${item.address || '未使用'}；片选：${item.chipSelect || '未使用'}；复位：${item.reset || '未使用'}；IRQ：${item.irq || '未使用'}；供电：${item.power || '未使用'}；证据：${item.source || '未登记'}。`;
  const interfaceRows = interfaces.length ? interfaces.map((item) => `<tr><td><button type="button" class="resource-row-button" data-hardware-item data-hardware-detail="${escapeHtml(detailForInterface(item))}">${escapeHtml(item.interface || '未命名')}</button><div class="subtle">${escapeHtml(item.instance || '')}</div></td><td>${escapeHtml(item.pins || '未登记')}</td><td>${escapeHtml(item.configuration || '未登记')}</td><td>${escapeHtml(item.usage || '未登记')}</td><td><span class="status ${item.confidence === 'confirmed' ? 'status-completed' : 'status-pending'}">${escapeHtml(statusText(item.confidence || item.status))}</span></td></tr>`).join('') : '<tr><td colspan="5" class="muted">未找到可确认的接口与引脚映射。</td></tr>';
  const resourceRows = hardwareResources.length ? hardwareResources.map((item) => `<tr><td><button type="button" class="resource-row-button" data-hardware-item data-hardware-detail="${escapeHtml(detailForResource(item))}">${escapeHtml(item.name || '未命名')}</button></td><td>${escapeHtml(item.kind || '未分类')}</td><td>${escapeHtml(item.mapping || '未登记')}</td><td><span class="status ${item.status === 'confirmed' ? 'status-completed' : 'status-pending'}">${escapeHtml(statusText(item.status))}</span></td></tr>`).join('') : '<tr><td colspan="4" class="muted">未发现外设、DMA 或时钟资源证据。</td></tr>';
  const attachmentRows = (boardAttachments.attachments || []).length ? boardAttachments.attachments.map((item) => `<tr><td><button type="button" class="resource-row-button" data-hardware-item data-hardware-detail="${escapeHtml(detailForAttachment(item))}">${escapeHtml(item.device || '未命名')}</button></td><td>${escapeHtml(item.bus || '未登记')}</td><td>${escapeHtml(item.address || '未使用')}</td><td>${escapeHtml(item.chipSelect || '未使用')}</td><td>${escapeHtml(item.reset || '未使用')}</td><td>${escapeHtml(item.irq || '未使用')}</td><td>${escapeHtml(item.power || '未使用')}</td><td><span class="status status-completed">${escapeHtml(statusText(item.status))}</span><div class="subtle">${escapeHtml(item.source || '')}</div></td></tr>`).join('') : `<tr><td colspan="8"><strong>暂未发现器件挂接实例</strong><div class="muted">${escapeHtml(boardAttachments.note || '未发现 g_board_bus_attachments[] 实例定义。')}</div><div class="muted">模型来源：${escapeHtml((boardAttachments.sources || []).map((source) => source.path).join('、') || '未发现')}</div></td></tr>`;
  const contract = boardAttachments.contract || {};
  const boardAttachmentMarkup = `<section class="panel"><div class="section-title"><h3>器件级板级挂接</h3><span class="status ${boardAttachments.status === 'confirmed' ? 'status-completed' : 'status-pending'}">${escapeHtml(statusText(boardAttachments.status))}</span></div><p class="muted">按“器件 → 总线 → 地址 / 片选 / 复位 / IRQ / 供电”查看板级连接。只有发现实例定义时才显示具体接线。</p><div class="summary-grid compact"><div class="card"><span class="subtle">挂接模型</span><strong>${contract.hasAttachmentContract ? '已定义' : '未发现'}</strong></div><div class="card"><span class="subtle">器件实例</span><strong>${escapeHtml((boardAttachments.attachments || []).length)} 个</strong></div><div class="card"><span class="subtle">当前结论</span><strong>${boardAttachments.attachments?.length ? '可查看接线' : '等待资源实例'}</strong></div></div><div class="table-scroll"><table class="resource-table"><thead><tr><th>器件</th><th>总线</th><th>I2C 地址</th><th>片选 CS</th><th>复位</th><th>IRQ</th><th>供电域</th><th>证据</th></tr></thead><tbody>${attachmentRows}</tbody></table></div><details><summary>查看板级资源模型检查结果</summary><p class="muted">已发现模型头文件 ${escapeHtml(contract.headerCount || 0)} 个，候选实例源码 ${escapeHtml(contract.implementationCount || 0)} 个。</p><p class="muted">已发现实例符号：${escapeHtml((contract.foundInstanceSymbols || []).join('、') || '无')}。</p><p class="muted">尚未发现实例符号：${escapeHtml((contract.expectedMissing || []).join('、') || '无')}。</p></details></section>`;
  const conflictStatusText = (value) => value === 'confirmed' ? '未发现冲突' : value === 'error' ? '发现错误' : value === 'warning' ? '需要复核' : '未确认';
  const conflictStatusClass = (value) => value === 'confirmed' ? 'status-completed' : value === 'error' ? 'status-blocked' : 'status-pending';
  const conflictRows = (conflicts.conflicts || []).length ? conflicts.conflicts.map((item) => `<tr><td><span class="status ${conflictStatusClass(item.severity)}">${escapeHtml(item.severity === 'error' ? '错误' : '提醒')}</span></td><td>${escapeHtml(item.category || '资源检查')}</td><td><code>${escapeHtml(item.resource || '未命名')}</code></td><td>${escapeHtml(item.detail || '')}</td><td>${escapeHtml((item.sources || []).join('、') || '未登记')}</td></tr>`).join('') : `<tr><td colspan="5" class="muted">${escapeHtml(conflicts.available ? '基于当前静态配置未发现重复占用或映射冲突。' : '没有足够的静态资源证据，暂不能判断。')}</td></tr>`;
  const conflictMarkup = `<section class="panel ${conflicts.status === 'error' ? 'warning' : ''}"><div class="section-title"><h3>资源冲突检查</h3><span class="status ${conflictStatusClass(conflicts.status)}">${escapeHtml(conflictStatusText(conflicts.status))}</span></div><p class="muted">${escapeHtml(conflicts.note || '资源冲突检查尚未执行。')}</p><div class="summary-grid compact"><div class="card"><span class="subtle">检查项</span><strong>${escapeHtml((conflicts.checked || []).length)} 类</strong></div><div class="card"><span class="subtle">冲突数量</span><strong>${escapeHtml((conflicts.conflicts || []).length)}</strong></div><div class="card"><span class="subtle">证据范围</span><strong>静态配置</strong></div></div><div class="table-scroll"><table class="resource-table"><thead><tr><th>级别</th><th>类别</th><th>资源</th><th>说明</th><th>来源</th></tr></thead><tbody>${conflictRows}</tbody></table></div></section>`;
  const pinRows = pins.length ? pins.map((item) => `<tr><td><code>${escapeHtml(item.pin || '未登记')}</code>${item.label ? `<div class="subtle">${escapeHtml(item.label)}</div>` : ''}</td><td>${escapeHtml(item.signal || '未登记')}</td><td>${escapeHtml(item.mode || '未登记')}</td><td>${escapeHtml(item.usage || '未登记')}</td><td><span class="status ${item.confidence === 'confirmed' ? 'status-completed' : 'status-pending'}">${escapeHtml(statusText(item.confidence || item.status))}</span></td></tr>`).join('') : '<tr><td colspan="5" class="muted">未找到引脚分配证据。</td></tr>';
  const sourceList = sources.length ? `<ul>${sources.map((source) => `<li><code>${escapeHtml(source.path)}</code> · ${escapeHtml(source.kind || '资源证据')} · ${escapeHtml(statusText(source.confidence))}</li>`).join('')}</ul>` : '<p class="muted">暂无资源证据来源。</p>';
  const resourcePageNav = `<nav class="resource-page-nav" role="tablist" aria-label="资源页面导航"><button type="button" class="resource-page-button is-active" role="tab" aria-selected="true" data-resource-page-button="resource-summary">资源总览</button><button type="button" class="resource-page-button" role="tab" aria-selected="false" data-resource-page-button="resource-hardware">器件与接口</button><button type="button" class="resource-page-button" role="tab" aria-selected="false" data-resource-page-button="resource-conflicts">冲突检查</button><button type="button" class="resource-page-button" role="tab" aria-selected="false" data-resource-page-button="resource-runtime">内存与运行时</button></nav>`;
  const resourceSummaryMarkup = `<section class="resource-page-panel is-active" data-resource-page-panel="resource-summary" role="tabpanel"><section class="panel"><p class="muted">${escapeHtml(resources.note || '资源证据尚未建立。')}</p><div class="resource-grid">${fields.map((field) => `<article class="resource-card"><span class="subtle">${escapeHtml(field.label)}</span><strong>${escapeHtml(field.value)}</strong><span class="status ${field.confidence === 'confirmed' ? 'status-completed' : 'status-pending'}">${escapeHtml(statusText(field.confidence))}</span></article>`).join('')}</div><div class="summary-grid compact"><div class="card"><span class="subtle">接口数量</span><strong>${escapeHtml(interfaces.length)}</strong></div><div class="card"><span class="subtle">引脚数量</span><strong>${escapeHtml(pins.length)}</strong></div><div class="card"><span class="subtle">硬件资源</span><strong>${escapeHtml(hardwareResources.length)}</strong></div><div class="card"><span class="subtle">冲突数量</span><strong>${escapeHtml((conflicts.conflicts || []).length)}</strong></div></div></section><details class="panel"><summary>查看资源证据来源</summary>${sourceList}</details><section class="panel"><h3>资源相关产物</h3>${resources.artifacts?.length ? `<ul>${resources.artifacts.map((artifact) => `<li><code>${escapeHtml(artifact.path)}</code> · ${escapeHtml(artifact.type)}</li>`).join('')}</ul>` : '<p class="muted">暂无可关联产物。</p>'}</section></section>`;
  const resourceHardwareMarkup = `<section class="resource-page-panel" data-resource-page-panel="resource-hardware" role="tabpanel" hidden>${boardAttachmentMarkup}<section class="panel"><div class="section-title"><h3>硬件接口 → 引脚</h3><span class="subtle">点击接口查看证据摘要</span></div><div class="table-scroll"><table class="resource-table"><thead><tr><th>接口 / 外设</th><th>连接引脚</th><th>配置</th><th>当前绑定</th><th>证据状态</th></tr></thead><tbody>${interfaceRows}</tbody></table></div><div class="resource-detail" data-hardware-detail>选择一个接口或硬件资源查看证据摘要。</div></section><section class="panel"><div class="section-title"><h3>使用到的硬件资源</h3><span class="subtle">外设、DMA、时钟与板级挂接</span></div><div class="table-scroll"><table class="resource-table"><thead><tr><th>资源</th><th>类型</th><th>用途 / 映射</th><th>状态</th></tr></thead><tbody>${resourceRows}</tbody></table></div></section><details class="panel"><summary>查看全部引脚分配</summary><div class="table-scroll"><table class="resource-table"><thead><tr><th>引脚</th><th>功能</th><th>方向 / 模式</th><th>当前用途</th><th>状态</th></tr></thead><tbody>${pinRows}</tbody></table></div></details></section>`;
  const resourceConflictMarkup = `<section class="resource-page-panel" data-resource-page-panel="resource-conflicts" role="tabpanel" hidden>${conflictMarkup}</section>`;
  const resourceRuntimeMarkup = `<section class="resource-page-panel" data-resource-page-panel="resource-runtime" role="tabpanel" hidden>${runtimeMarkup}${memoryMarkup}</section>`;
  return `${resourcePageNav}<div class="resource-page-content">${resourceSummaryMarkup}${resourceHardwareMarkup}${resourceConflictMarkup}${resourceRuntimeMarkup}</div>`;
}

function renderCurrentDashboardHtml(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') throw new TypeError('snapshot must be an object');
  const taskSummary = snapshot.taskSummary || {};
  const workflow = snapshot.workflow || {};
  const project = snapshot.project || {};
  const features = snapshot.featureCatalog?.features || [];
  const featureCounts = snapshot.featureCatalog?.counts || { completed: 0, inProgress: 0, pending: 0 };
  const percent = Math.max(0, Math.min(100, Number(taskSummary.percent) || 0));
  const focusFeatures = features.filter((feature) => feature.status === 'inProgress');
  const completedFeatures = features.filter((feature) => feature.status === 'completed').sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const pendingFeatures = features.filter((feature) => feature.status === 'pending');
  const requests = snapshot.requests || [];
  const issueItems = listItems(snapshot.issues, '没有发现解析问题');
  const pageDefinitions = [['overview', '项目总览'], ['progress', '功能进度'], ['architecture', '架构与启动'], ['git', 'Git 与调整'], ['ai', 'AI 工作流与问题'], ['debug', '调试日志'], ['build', '构建与验证'], ['resources', '资源与硬件']];
  const pageButtons = pageDefinitions.map(([name, label], index) => `<button type="button" class="page-button${index === 0 ? ' is-active' : ''}" data-page-button="${name}" aria-selected="${index === 0 ? 'true' : 'false'}">${label}</button>`).join('');
  const overview = `<section class="view-panel is-active" data-page-panel="overview" id="page-overview"><div class="section-title"><h2>项目总览</h2><span class="subtle">一个项目 · 一个 HTML 看板</span></div><section class="panel project-intro"><h3>${escapeHtml(project.project || path.basename(snapshot.paths?.projectRoot || '项目'))}</h3><p>当前看板聚合功能、需求任务、架构、Git、日志、构建和资源证据。</p><p class="muted">项目路径：${escapeHtml(snapshot.paths?.projectRoot || '')} · 看板只在输入内容摘要变化时重写。</p></section><section class="summary-grid"><div class="card"><span class="subtle">功能总数</span><strong>${escapeHtml(features.length)}</strong></div><div class="card"><span class="subtle">正在开发</span><strong>${escapeHtml(featureCounts.inProgress)}</strong></div><div class="card"><span class="subtle">已完成</span><strong>${escapeHtml(featureCounts.completed)}</strong></div><div class="card"><span class="subtle">未完成</span><strong>${escapeHtml(featureCounts.pending)}</strong></div></section><section class="panel"><h3>关联 Task 总体进度</h3><p class="summary-line">总 Task ${escapeHtml(taskSummary.total || 0)} · 已完成 ${escapeHtml(taskSummary.completed || 0)} · 执行中 ${escapeHtml(taskSummary.inProgress || 0)} · 阻塞 ${escapeHtml(taskSummary.blocked || 0)} · 完成度 ${escapeHtml(percent)}%</p><div class="progress large"><span style="width:${percent}%"></span></div></section>${renderFeatureGroup('正在开发', focusFeatures, '当前没有正在开发的功能。')}${renderFeatureGroup('最近已完成', completedFeatures.slice(0, 5), '当前没有带完成证据的功能。')}</section>`;
  const progress = `<section class="view-panel" data-page-panel="progress" id="page-progress"><div class="section-title"><h2>功能进度</h2><span class="subtle">来源：项目功能清单.md，REQ 只作为过程证据</span></div>${snapshot.featureCatalog?.available ? '' : '<section class="panel warning"><strong>尚未建立项目功能清单</strong><p>请在 00_Docs/04_需求文档/项目功能清单.md 中维护功能名称、所属层和关联 REQ；当前不自动把 REQ 当成功能。</p></section>'}${renderFeatureGroup('已完成', completedFeatures, '暂无已完成功能。')}${renderFeatureGroup('正在开发', focusFeatures, '暂无正在开发功能。')}${renderFeatureGroup('未完成', pendingFeatures, '暂无未完成功能。')}</section>`;
  const architecture = `<section class="view-panel" data-page-panel="architecture" id="page-architecture"><div class="section-title"><h2>软件架构与启动流程</h2><span class="subtle">文档证据优先，缺失则标记未确认</span></div><section class="panel"><h3>软件架构</h3>${renderEvidenceContent(snapshot.architecture || { sources: [] }, '未找到明确的软件架构设计资料。')}</section><section class="panel"><h3>启动流程</h3>${renderEvidenceContent(snapshot.startup || { sources: [] }, '未找到明确的启动流程资料。')}</section></section>`;
  const git = `<section class="view-panel" data-page-panel="git" id="page-git"><div class="section-title"><h2>Git 管理与项目调整</h2><span class="subtle">按时间查看项目变化 · 只读观测</span></div>${renderGitContent(snapshot.git || { available: false }, snapshot.adjustments || [])}</section>`;
  const ai = `<section class="view-panel" data-page-panel="ai" id="page-ai"><div class="section-title"><h2>AI 工作流与问题</h2><span class="subtle">需求 → 开发 → 验证 → 审查</span></div>${requests.length ? requests.map((request) => `<article class="panel feature-panel"><div class="feature-heading"><div><strong>${escapeHtml(request.requestId)}</strong><h3>${escapeHtml(request.featureTitle)}</h3></div><span class="status">${escapeHtml(statusLabel(request.workflow.current_status))}</span></div><p class="summary-line">当前阶段：${escapeHtml(statusLabel(request.workflow.current_stage))} · Task ${escapeHtml(request.taskSummary.completed)}/${escapeHtml(request.taskSummary.total)} · 完成度 ${escapeHtml(request.taskSummary.percent)}%</p><div class="progress"><span style="width:${Math.max(0, Math.min(100, request.taskSummary.percent))}%"></span></div><div class="two-column"><div><h4>阻塞与待确认</h4>${renderReadableValues([...(request.workflow.blockers || []), ...(request.workflow.open_questions || [])], '没有阻塞或待确认问题')}</div><div><h4>最近事件</h4>${renderEventTimeline(request.events.slice(-8))}</div></div></article>`).join('') : '<section class="panel warning">暂无 AI 工作流 request。</section>'}<section class="panel ${snapshot.issues?.length ? 'warning' : 'ok'}"><h3>看板解析问题</h3><ul>${issueItems}</ul></section></section>`;
  const debug = `<section class="view-panel" data-page-panel="debug" id="page-debug"><div class="section-title"><h2>调试日志</h2><span class="subtle">只读 · 不执行编译/烧录/寄存器读取</span></div>${renderLogContent(snapshot.logs || { available: false, directory: LOG_DIRECTORY_RELATIVE, files: [] })}</section>`;
  const build = `<section class="view-panel" data-page-panel="build" id="page-build"><div class="section-title"><h2>构建与验证</h2><span class="subtle">静态、主机、构建、目标和实物证据分开显示</span></div>${renderBuildContent(snapshot.build || { available: false, artifacts: [] })}</section>`;
  const resources = `<section class="view-panel" data-page-panel="resources" id="page-resources"><div class="section-title"><h2>资源与硬件状态</h2><span class="subtle">静态配置证据 · 实机状态未采集</span></div>${renderResourceContent(snapshot.resources || { fields: [], artifacts: [], note: '暂无资源证据。' })}</section>`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>embedded-framework 项目工程看板</title><style>
:root{color-scheme:light;font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;background:#f2f5f7;color:#173042}*{box-sizing:border-box}body{margin:0;padding:18px}main{max-width:1480px;margin:0 auto}h1,h2,h3,h4{margin:0}h1{font-size:clamp(25px,3vw,38px)}h2{font-size:22px;margin-bottom:12px}h3{font-size:17px;margin-bottom:8px}h4{font-size:14px;margin-bottom:7px}.subtle,.muted{color:#627782}p{line-height:1.65}.header{display:flex;justify-content:space-between;gap:20px;align-items:flex-end;margin-bottom:16px}.header-meta{text-align:right;max-width:62%;overflow-wrap:anywhere}.eyebrow{color:#0f766e;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}.summary-grid.compact{margin-bottom:12px}.card,.panel,.feature-card,.log-card,.resource-card,.evidence-card{background:#fff;border:1px solid #d7e2e7;border-radius:12px;box-shadow:0 3px 12px #17304212}.card{padding:14px;min-width:0}.card strong,.resource-card strong{display:block;font-size:24px;margin-top:6px;overflow-wrap:anywhere}.panel{padding:16px;margin-bottom:16px;min-width:0}.page-nav{position:sticky;top:0;z-index:5;display:flex;flex-wrap:wrap;gap:7px;padding:8px;margin-bottom:16px;border:1px solid #d7e2e7;border-radius:10px;background:#eef5f6ee;backdrop-filter:blur(8px)}.page-button{border:1px solid transparent;border-radius:8px;padding:9px 13px;background:transparent;color:#42626b;cursor:pointer;font:inherit;font-weight:700}.page-button:hover,.page-button.is-active{color:#0b5f67;background:#fff;border-color:#9bc9c5;box-shadow:0 2px 5px #17304212}.view-panel:not(.is-active){display:none}.section-title,.feature-heading,.evidence-heading{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.project-intro{border-left:5px solid #2aa198}.progress{height:10px;background:#e1eaee;border-radius:6px;overflow:hidden;margin-top:10px}.progress span{display:block;height:100%;background:linear-gradient(90deg,#0f766e,#2aa198)}.progress.large{height:14px}.feature-grid,.log-grid,.resource-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}.feature-card,.log-card,.resource-card{padding:14px}.feature-card h3{margin-top:9px}.feature-panel{border-left:5px solid #79bdb6}.feature-group{background:#fbfdfd}.tag{display:inline-block;padding:3px 8px;border-radius:999px;background:#e5f4f1;color:#17656a;font-size:12px;font-weight:700}.status{display:inline-block;border-radius:999px;padding:3px 9px;font-size:12px;font-weight:700;background:#edf1f2;color:#50636b;white-space:nowrap}.status-completed{background:#dcfce7;color:#166534}.status-inProgress{background:#dbeafe;color:#1d4ed8}.status-pending{background:#fef3c7;color:#92400e}.warning{border-color:#f1c6a7;background:#fffaf6}.ok{border-color:#b8dec9;background:#f6fff8}.two-column,.git-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.git-columns{grid-template-columns:repeat(3,minmax(0,1fr))}.table-scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;min-width:560px}th,td{text-align:left;border-bottom:1px solid #e4ecef;padding:9px 10px;vertical-align:top}th{background:#f7fafb;color:#4e6670;font-size:13px}ul{margin:8px 0 0;padding-left:22px}li{margin:5px 0;line-height:1.5;overflow-wrap:anywhere}code,pre{font:13px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;word-break:break-word}.git-stat,.log-content,.diagram-source{padding:12px;background:#f7fafb;border-radius:8px;overflow:auto}.evidence-card{overflow:hidden;margin-bottom:14px}.evidence-heading{padding:13px 15px;background:#f8fbfc;border-bottom:1px solid #e4ecef}.markdown-body{padding:15px;line-height:1.7;overflow-wrap:anywhere;max-height:500px;overflow:auto}.markdown-body h1,.markdown-body h2,.markdown-body h3,.markdown-body h4{margin:1em 0 .45em}.markdown-body p{margin:.6em 0}.markdown-body blockquote{margin:10px 0;padding:4px 14px;border-left:4px solid #79bdb6;background:#f2faf9}.markdown-body .code-block{padding:12px;border-radius:8px;background:#172a35;color:#e5f3f1}.markdown-table{min-width:0}.markdown-table th,.markdown-table td{white-space:normal}.source-view{margin:0 15px 15px;border-top:1px dashed #d6e1e6}.source-view summary,details summary{cursor:pointer;padding:10px 2px 0;color:#52707a;font-size:13px}.diagram-card{margin:0 15px 15px;padding:13px;border:1px solid #d6e1e6;border-radius:9px;background:#fbfefe}.flow-list{display:grid;gap:7px}.flow-step{display:flex;align-items:center;gap:9px;flex-wrap:wrap}.flow-step span{padding:7px 12px;border-radius:7px;background:#e4f4f1;color:#155e63;font-weight:700}.flow-step b{color:#0f766e}.event-timeline{list-style:none;margin:0;padding:0}.event-timeline li{display:grid;grid-template-columns:155px minmax(0,1fr);gap:12px;padding:9px 0;border-bottom:1px solid #e4ecef}.event-timeline li:last-child{border-bottom:0}.event-time{color:#71838b;font:12px/1.5 ui-monospace,monospace}.event-body p{margin:3px 0 0;color:#536b74}.resource-card .status{margin-top:10px}.log-card p{margin:4px 0}.log-content{max-height:360px}.feature-card p{margin:7px 0}@media(max-width:960px){body{padding:13px}.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.two-column,.git-columns{grid-template-columns:1fr}}@media(max-width:560px){.header{display:block}.header-meta{max-width:none;text-align:left;margin-top:8px}.summary-grid{grid-template-columns:1fr}.event-timeline li{grid-template-columns:1fr;gap:3px}}
</style></head><body><main><header class="header"><div><div class="eyebrow">Embedded Framework</div><h1>项目工程工作台</h1></div><div class="header-meta subtle">项目：${escapeHtml(project.project || 'embedded-framework')}<br>生成时间：${escapeHtml(snapshot.generatedAt || '')}<br>仅在输入内容变化时更新</div></header><section class="summary-grid" aria-label="项目概览"><div class="card"><span class="subtle">Task 完成度</span><strong>${escapeHtml(percent)}%</strong><div class="progress"><span style="width:${percent}%"></span></div></div><div class="card"><span class="subtle">功能正在开发</span><strong>${escapeHtml(featureCounts.inProgress)}</strong></div><div class="card"><span class="subtle">功能已完成</span><strong>${escapeHtml(featureCounts.completed)}</strong></div><div class="card"><span class="subtle">需要关注</span><strong>${escapeHtml((snapshot.issues || []).length + pendingFeatures.length)}</strong></div></section><nav class="page-nav" role="tablist" aria-label="项目工作台页面导航">${pageButtons}</nav><div class="page-content">${overview}${progress}${architecture}${git}${ai}${debug}${build}${resources}</div></main><script>(()=>{const buttons=Array.from(document.querySelectorAll('[data-page-button]'));const panels=Array.from(document.querySelectorAll('[data-page-panel]'));const select=(name,updateHash=true)=>{const selected=buttons.some(button=>button.dataset.pageButton===name)?name:'overview';buttons.forEach(button=>{const active=button.dataset.pageButton===selected;button.classList.toggle('is-active',active);button.setAttribute('aria-selected',String(active));});panels.forEach(panel=>{const active=panel.dataset.pagePanel===selected;panel.classList.toggle('is-active',active);});if(updateHash&&window.history&&window.history.replaceState)window.history.replaceState(null,'','#'+selected);};buttons.forEach(button=>button.addEventListener('click',()=>select(button.dataset.pageButton)));select(window.location.hash.slice(1),false);})();</script></body></html>`;
}

function renderDashboardHtml(snapshot) {
  const pageGroups = [
    { label: '项目状态', pages: [['overview', '项目总览'], ['progress', '功能进度']] },
    { label: '工程信息', pages: [['architecture', '架构与启动'], ['git', 'Git 与调整'], ['build', '构建与验证'], ['resources', '资源与硬件']] },
    { label: '协作与调试', pages: [['ai', 'AI 工作流与问题'], ['debug', '调试日志']] },
  ];
  const pageNav = pageGroups.map((group) => `<section class="nav-group"><h2 class="nav-group-title">${group.label}</h2><div class="nav-group-items">${group.pages.map(([name, label], index) => `<button type="button" class="page-button${name === 'overview' ? ' is-active' : ''}" data-page-button="${name}" aria-selected="${name === 'overview' ? 'true' : 'false'}">${label}</button>`).join('')}</div></section>`).join('');
  const layoutCss = String.raw`main{max-width:1600px}.dashboard-shell{display:grid;grid-template-columns:minmax(220px,248px) minmax(0,1fr);gap:24px;align-items:start}.dashboard-sidebar{position:sticky;top:18px;display:flex;flex-direction:column;gap:20px;padding:18px 14px;border:1px solid #d7e2e7;border-radius:14px;background:#ffffff;box-shadow:0 4px 16px #17304212}.sidebar-brand{padding:2px 8px 4px;color:#0f766e;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.sidebar-brand span{display:block;margin-top:6px;color:#173042;font-size:18px;letter-spacing:0;text-transform:none}.page-nav{position:static;display:grid;gap:18px;padding:0;margin:0;border:0;background:transparent;backdrop-filter:none}.nav-group{display:grid;gap:6px}.nav-group-title{margin:0;padding:0 10px;color:#71838b;font-size:12px;line-height:1.4;letter-spacing:.08em}.nav-group-items{display:grid;gap:4px}.page-button{width:100%;min-height:44px;padding:10px;text-align:left}.page-button:focus-visible,.mobile-nav-toggle:focus-visible,.nav-backdrop:focus-visible,.graph-node:focus-visible,.startup-step-button:focus-visible,.resource-row-button:focus-visible,.resource-page-button:focus-visible{outline:3px solid #f59e0b;outline-offset:3px}.sidebar-note{margin-top:auto;padding:12px 10px;border-top:1px solid #e4ecef;color:#71838b;font-size:12px;line-height:1.7}.dashboard-main{min-width:0}.page-content{min-width:0}.mobile-nav-toggle,.nav-backdrop{display:none}.view-panel[hidden]{display:none}.architecture-graph-wrap{overflow-x:auto}.architecture-tree-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.architecture-tree-layer{border:1px solid #d7e2e7;border-radius:10px;background:#fbfefe;overflow:hidden}.architecture-tree-layer>summary{padding:12px 14px;background:#f3faf9;border-bottom:1px solid #e1ecee}.tree-folder>summary{list-style:none}.tree-folder>summary::-webkit-details-marker{display:none}.tree-summary{display:inline-flex;align-items:center;gap:7px;min-height:30px;padding:4px 8px;border-radius:7px;color:#174e53;cursor:pointer;line-height:1.45;overflow-wrap:anywhere}.tree-summary::before{content:"📁";font-size:14px}.tree-kind-layer::before{content:"▣"}.tree-summary:hover,.tree-summary.is-selected{background:#e5f4f1;color:#0f766e}.tree-level-1{font-weight:800}.tree-level-2{font-weight:700}.tree-level-3{font-size:13px}.tree-children{display:grid;gap:3px;padding:7px 12px 9px 22px}.tree-folder{margin-top:3px}.tree-leaf{padding:1px 0}.tree-detail{margin-top:12px;padding:14px;border:1px solid #d7e2e7;border-radius:9px;background:#f8fbfc;min-height:52px;line-height:1.7}.architecture-graph{display:block;width:100%;min-width:700px;min-height:260px;border:1px solid #d7e2e7;border-radius:12px;background:#fbfefe}.graph-edge{stroke:#6c9e9c;stroke-width:2;marker-end:url(#graph-arrow)}.graph-node{cursor:pointer}.graph-node rect{fill:#e5f4f1;stroke:#5caaa2;stroke-width:2}.graph-node:hover rect,.graph-node.is-selected rect{fill:#ccebe6;stroke:#0f766e}.graph-node text{fill:#174e53;font-size:14px;font-weight:700;text-anchor:middle;dominant-baseline:middle;pointer-events:none}.graph-detail,.startup-detail{margin-top:12px;padding:14px;border:1px solid #d7e2e7;border-radius:9px;background:#f8fbfc;min-height:56px;line-height:1.7}.interactive-flow{display:grid;gap:0}.startup-step-wrap{display:grid;justify-items:start}.startup-step-button{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:48px;padding:10px 14px;text-align:left;border:1px solid #b8d4d2;border-radius:9px;background:#f8fbfc;color:#174e53;cursor:pointer;font:inherit;font-weight:700}.startup-step-button small{flex:none;color:#71838b;font-size:12px;font-weight:600}.startup-step-button:hover,.startup-step-button.is-selected{background:#e5f4f1;border-color:#0f766e}.startup-step-button.status-unverified{border-style:dashed;border-color:#e8b27b;background:#fffaf6}.startup-arrow{padding:5px 20px;color:#0f766e;font-weight:800}.architecture-map-title{margin-top:14px;padding:10px 0 5px;color:#52707a;font-size:13px;font-weight:800}.architecture-map{display:flex;align-items:flex-start;gap:8px;min-width:max-content;overflow-x:auto;padding:6px 0 14px}.architecture-map-column{flex:0 0 190px;min-height:130px;padding:10px;border:1px solid #d7e2e7;border-radius:10px;background:#fbfefe}.graph-layer-node{display:block;padding:10px 8px;border:2px solid #5caaa2;border-radius:9px;background:#e5f4f1;color:#174e53;text-align:center;font-weight:800}.graph-layer-node:hover,.graph-layer-node.is-selected{border-color:#0f766e;background:#ccebe6}.architecture-map-role{margin:8px 2px 10px;color:#627782;font-size:12px;line-height:1.5}.graph-folder-list{display:grid;gap:5px}.graph-folder-node{display:flex;align-items:flex-start;gap:5px;padding:6px 7px;border:1px solid #b8d4d2;border-radius:7px;background:#fff;color:#174e53;cursor:pointer;font-size:13px;line-height:1.35;overflow-wrap:anywhere}.graph-folder-node:hover,.graph-folder-node.is-selected{border-color:#0f766e;background:#e5f4f1}.folder-icon{flex:none}.graph-folder-children{display:grid;gap:4px;margin:2px 0 2px 12px;padding-left:10px;border-left:1px dashed #9bc9c5}.architecture-map-arrow{flex:0 0 24px;padding-top:30px;color:#0f766e;font-size:22px;font-weight:800;text-align:center}.resource-page-nav{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px;padding:6px;border:1px solid #d7e2e7;border-radius:10px;background:#f3f8f8}.resource-page-button{min-height:40px;padding:8px 12px;border:1px solid transparent;border-radius:8px;background:transparent;color:#52707a;cursor:pointer;font:inherit;font-weight:700}.resource-page-button:hover,.resource-page-button.is-active{color:#0b5f67;background:#fff;border-color:#9bc9c5;box-shadow:0 2px 5px #17304212}.resource-page-panel[hidden]{display:none}.resource-table{min-width:720px}.resource-row-button{padding:0;border:0;background:transparent;color:#0b6870;cursor:pointer;font:inherit;font-weight:800;text-align:left;text-decoration:underline;text-decoration-color:#b8d4d2;text-underline-offset:3px}.resource-row-button:hover{color:#0f766e}.resource-detail{margin-top:12px;padding:12px 14px;border:1px solid #b8d4d2;border-radius:9px;background:#f2faf9;color:#315c63;line-height:1.7;min-height:48px}.memory-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:12px 0 14px}.memory-card{padding:14px;border:1px solid #d7e2e7;border-radius:10px;background:#fbfefe}.memory-card strong{display:block;margin-top:6px;font-size:21px;overflow-wrap:anywhere}.memory-detail{min-height:42px;margin:8px 0;color:#536b74;font-size:13px;line-height:1.6}.memory-note{margin:14px 0 0;padding:10px 12px;border-left:4px solid #e8b27b;background:#fffaf6;color:#76543f;line-height:1.7}@media(max-width:960px){body{padding:13px}.dashboard-shell{display:block}.memory-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.mobile-nav-toggle{display:inline-flex;align-items:center;justify-content:center;min-height:44px;margin-bottom:12px;padding:10px 14px;border:1px solid #b8d4d2;border-radius:9px;background:#fff;color:#0b5f67;cursor:pointer;font:inherit;font-weight:800}.dashboard-sidebar{position:fixed;inset:0 auto 0 0;z-index:21;width:min(86vw,300px);overflow:auto;border-radius:0 14px 14px 0;transform:translateX(-105%);transition:transform .2s ease}.nav-open .dashboard-sidebar{transform:translateX(0)}.nav-backdrop{position:fixed;inset:0;z-index:20;border:0;background:#17304266;cursor:pointer}.nav-open .nav-backdrop{display:block}.nav-open{overflow:hidden}}@media(max-width:640px){body{padding:12px}.header{display:block}.header-meta{max-width:none;text-align:left;margin-top:8px}.summary-grid{grid-template-columns:1fr}.memory-grid{grid-template-columns:1fr}.card strong{font-size:21px}.architecture-graph{min-height:340px}.architecture-tree-grid{grid-template-columns:1fr}.graph-node text{font-size:12px}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}@media print{body{padding:0;background:#fff}.dashboard-sidebar,.mobile-nav-toggle,.nav-backdrop{display:none!important}.dashboard-shell{display:block}.view-panel{display:block!important}.page-content{page-break-before:always}}`;
  let html = renderCurrentDashboardHtml(snapshot);
  const workflow = snapshot.workflow || {};
  const currentRequest = (snapshot.requests || []).find((request) => request.requestId === snapshot.currentRequestId) || snapshot.requests?.[0];
  const attentionItems = [...(snapshot.issues || []), ...(workflow.blockers || []), ...(workflow.open_questions || [])];
  const attentionClass = attentionItems.length ? 'warning' : 'ok';
  const taskSummary = snapshot.taskSummary || {};
  const project = snapshot.project || {};
  const projectName = project.project || path.basename(snapshot.paths?.projectRoot || '项目');
  const percent = Math.max(0, Math.min(100, Number(taskSummary.percent) || 0));
  const architectureCss = String.raw`.architecture-page-nav{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px;padding:6px;border:1px solid #d7e2e7;border-radius:10px;background:#f3f8f8}.architecture-page-button{min-height:40px;padding:8px 13px;border:1px solid transparent;border-radius:8px;background:transparent;color:#52707a;cursor:pointer;font:inherit;font-weight:700}.architecture-page-button:hover,.architecture-page-button.is-active{color:#0b5f67;background:#fff;border-color:#9bc9c5;box-shadow:0 2px 5px #17304212}.architecture-page-panel[hidden]{display:none}.architecture-layer-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.architecture-layer-card{padding:14px;border:1px solid #d7e2e7;border-radius:10px;background:#fbfefe}.architecture-layer-card .architecture-map-role{margin:4px 0 0}.architecture-dependency-list{display:grid;gap:8px}.architecture-dependency-row{display:grid;grid-template-columns:minmax(120px,1fr) auto minmax(120px,1fr) auto;align-items:center;gap:10px;width:100%;padding:12px;border:1px solid #b8d4d2;border-radius:9px;background:#f8fbfc;color:#174e53;text-align:left;cursor:pointer;font:inherit}.architecture-dependency-row:hover,.architecture-dependency-row.is-selected{border-color:#0f766e;background:#e5f4f1}.architecture-dependency-row b{color:#0f766e}.architecture-dependency-row small{color:#71838b;font-size:12px}.architecture-dependency-detail{margin-top:12px;padding:12px 14px;border:1px solid #b8d4d2;border-radius:9px;background:#f2faf9;color:#315c63;line-height:1.7;min-height:46px}@media(max-width:960px){.architecture-layer-grid{grid-template-columns:1fr}}@media(max-width:640px){.architecture-dependency-row{grid-template-columns:1fr auto 1fr}.architecture-dependency-row small{grid-column:1 / -1}}`;
  const overviewStart = '<section class="view-panel is-active" data-page-panel="overview" id="page-overview">';
  const overviewEnd = '<section class="view-panel" data-page-panel="progress"';
  const overviewStartIndex = html.indexOf(overviewStart);
  const overviewEndIndex = html.indexOf(overviewEnd, overviewStartIndex);
  if (overviewStartIndex >= 0 && overviewEndIndex > overviewStartIndex) {
    const overviewPanel = `${overviewStart}<div class="section-title"><h2>项目总览</h2><span class="subtle">快速了解项目当前状态</span></div><section class="panel project-intro"><h3>${escapeHtml(projectName)}</h3><p>项目工作台集中展示当前进度、风险和最近调整。</p><p class="muted">项目路径：${escapeHtml(snapshot.paths?.projectRoot || '')} · 看板只在输入内容摘要变化时更新。</p></section><section class="panel"><div class="section-title"><h3>当前工作</h3><span class="status status-inProgress">${escapeHtml(statusLabel(currentRequest?.workflow?.current_status || workflow.current_status || 'unknown'))}</span></div><p class="summary-line">当前功能：${escapeHtml(currentRequest?.featureTitle || snapshot.currentRequestId || '暂无当前功能')} · 当前阶段：${escapeHtml(statusLabel(currentRequest?.workflow?.current_stage || workflow.current_stage || 'unknown'))}</p><p class="summary-line">Task ${escapeHtml(taskSummary.completed || 0)}/${escapeHtml(taskSummary.total || 0)} 完成 · 执行中 ${escapeHtml(taskSummary.inProgress || 0)} · 阻塞 ${escapeHtml(taskSummary.blocked || 0)} · 待处理 ${escapeHtml(taskSummary.pending || 0)}</p><div class="progress large"><span style="width:${percent}%"></span></div></section><div class="two-column"><section class="panel ${attentionClass}"><h3>风险与问题</h3>${renderReadableValues(attentionItems, '当前没有待处理问题')}</section><section class="panel"><h3>最近调整</h3>${renderAdjustments((snapshot.adjustments || []).slice(0, 5))}</section></div><details class="panel overview-details"><summary>查看详细事件</summary>${renderEventTimeline((snapshot.events || []).slice(-12))}</details></section>`;
    html = html.slice(0, overviewStartIndex) + overviewPanel + html.slice(overviewEndIndex);
  }
  const overviewEvidenceCard = (title, evidence, emptyText) => {
    const sources = evidence?.sources || [];
    if (!sources.length) return `<section class="panel warning"><h4>${title}</h4><p>${emptyText}</p></section>`;
    return `<section class="panel ok"><h4>${title}</h4><p class="summary-line">已找到 ${sources.length} 份来源资料。</p><ul>${sources.slice(0, 3).map((source) => `<li><code>${escapeHtml(source.path)}</code> · ${escapeHtml(source.confidence === 'confirmed' ? '已确认来源' : '推断匹配')}</li>`).join('')}</ul></section>`;
  };
  const improvedOverviewStart = html.indexOf(overviewStart);
  const improvedOverviewEnd = html.indexOf(overviewEnd, improvedOverviewStart);
  if (improvedOverviewStart >= 0 && improvedOverviewEnd > improvedOverviewStart) {
    const improvedOverview = `${overviewStart}<div class="section-title"><h2>项目总览</h2><span class="subtle">回答：项目是什么、怎么实现、有哪些问题</span></div><section class="panel project-intro"><h3>项目是什么</h3><p><strong>${escapeHtml(projectName)}</strong> 是当前工程工作台对应的嵌入式项目。</p><p class="summary-line">MCU：${escapeHtml(project.mcu || '未登记')} · 工具链：${escapeHtml(project.toolchain || '未登记')}</p><p class="muted">项目路径：${escapeHtml(snapshot.paths?.projectRoot || '')}</p></section><section class="panel"><div class="section-title"><h3>怎么实现的</h3><span class="subtle">架构与启动流程摘要</span></div><div class="two-column">${overviewEvidenceCard('软件架构', snapshot.architecture, '尚未找到明确的软件架构资料。')}${overviewEvidenceCard('启动流程', snapshot.startup, '尚未找到明确的启动流程资料。')}</div><p class="muted">详细架构证据请查看左侧“架构与启动”页面。</p></section><section class="panel ${attentionClass}"><h3>有哪些问题</h3>${renderReadableValues(attentionItems, '当前没有待处理问题')}</section><details class="panel overview-details"><summary>查看进度与最近调整</summary><div class="two-column"><section class="panel"><div class="section-title"><h4>当前工作</h4><span class="status status-inProgress">${escapeHtml(statusLabel(currentRequest?.workflow?.current_status || workflow.current_status || 'unknown'))}</span></div><p class="summary-line">当前功能：${escapeHtml(currentRequest?.featureTitle || snapshot.currentRequestId || '暂无当前功能')} · 当前阶段：${escapeHtml(statusLabel(currentRequest?.workflow?.current_stage || workflow.current_stage || 'unknown'))}</p><p class="summary-line">Task ${escapeHtml(taskSummary.completed || 0)}/${escapeHtml(taskSummary.total || 0)} 完成 · 执行中 ${escapeHtml(taskSummary.inProgress || 0)} · 阻塞 ${escapeHtml(taskSummary.blocked || 0)} · 待处理 ${escapeHtml(taskSummary.pending || 0)}</p><div class="progress"><span style="width:${percent}%"></span></div></section><section class="panel"><h4>最近调整</h4>${renderAdjustments((snapshot.adjustments || []).slice(0, 5))}</section></div></details><details class="panel overview-details"><summary>查看详细事件</summary>${renderEventTimeline((snapshot.events || []).slice(-12))}</details></section>`;
    html = html.slice(0, improvedOverviewStart) + improvedOverview + html.slice(improvedOverviewEnd);
  }
  const parseArchitectureGraph = (evidence) => {
    const candidates = (evidence?.sources || []).flatMap((source) => (source.mermaid || []).map((block) => ({ source, block })));
    const candidate = candidates.find(({ block }) => /(?:flowchart|graph)\b/i.test(block) && /APP|SERVICE|PLATFORM|IMPL|VENDOR/i.test(block)) || candidates.find(({ block }) => /(?:flowchart|graph)\b/i.test(block));
    if (!candidate) return { nodes: [], edges: [], sourcePath: '' };
    const nodes = new Map(); const edges = [];
    const register = (id, label) => { if (!id) return; const normalized = String(label || id).trim(); if (!nodes.has(id)) nodes.set(id, { id, label: normalized }); };
    const endpoint = (value) => { const match = String(value || '').trim().match(/^([A-Za-z0-9_-]+)(?:\s*(?:\[([^\]]*)\]|\(([^)]*)\)|\{([^}]*)\}))?/); if (!match) return null; return { id: match[1], label: match[2] || match[3] || match[4] || match[1] }; };
    String(candidate.block).split(/\r?\n/).forEach((line) => {
      const arrow = line.match(/-->|==>|-\.[\s\S]*?\.-?>|-[^-]*->/);
      if (!arrow) return;
      const from = endpoint(line.slice(0, arrow.index)); const to = endpoint(line.slice(arrow.index + arrow[0].length));
      if (!from || !to) return;
      register(from.id, from.label); register(to.id, to.label); edges.push({ from: from.id, to: to.id });
    });
    return { nodes: Array.from(nodes.values()), edges, sourcePath: candidate.source.path };
  };
  const architectureGraph = parseArchitectureGraph(snapshot.architecture);
  const architectureNodeDetails = { APP: '01_App：启动编排、任务入口和用户场景。', SERVICE: '02_Service：业务服务、日志和系统生命周期门面。', PLATFORM: '03_Platform：稳定的能力接口、类型、对象和生命周期契约。', IMPL: '04_Impl：MCU/HAL、板级组合、设备 Driver、OS 和中间件 Port。', VENDOR: '05_Vendor：STM32 HAL/CMSIS、FreeRTOS 和第三方底座。', TOOL: '06_Toolchain：启动、构建和目标工程组合边界。' };
  const graphOrder = ['APP', 'SERVICE', 'PLATFORM', 'IMPL', 'VENDOR', 'TOOL'];
  const graphLabels = { APP: '01_App', SERVICE: '02_Service', PLATFORM: '03_Platform', IMPL: '04_Impl', VENDOR: '05_Vendor', TOOL: '06_Toolchain' };
  const graphPositions = Object.fromEntries(graphOrder.map((id, index) => [id, [92 + index * 155, 110]]));
  const parsedArchitectureNodes = new Map(architectureGraph.nodes.map((node) => [node.id.toUpperCase(), node]));
  const graphNodes = graphOrder.map((id) => ({ id, label: graphLabels[id], parsedLabel: parsedArchitectureNodes.get(id)?.label || '' }));
  const graphNodeDetail = (node) => architectureNodeDetails[node.id.toUpperCase()] || `${node.label}：架构图节点，具体职责请结合来源文档确认。`;
  const architectureTreeData = snapshot.architectureTree || [];
  const renderArchitectureFolderGraph = (node, layer) => {
    const detail = '路径：' + node.path + '；' + layer.label + ' 的第 ' + node.level + ' 级目录；' + (node.children.length ? '包含 ' + node.children.length + ' 个下级目录。' : '当前已扫描到目录末端。') + ' 来源：工程实际目录。';
    const children = node.children.length ? '<div class="graph-folder-children">' + node.children.map((child) => renderArchitectureFolderGraph(child, layer)).join('') + '</div>' : '';
    return '<div class="graph-folder-node graph-node" data-graph-node="' + escapeHtml(layer.id + ':' + node.path) + '" data-graph-detail="' + escapeHtml(detail) + '" tabindex="0" role="button" aria-label="查看目录 ' + escapeHtml(node.path) + '"><span class="folder-icon">📁</span><span>' + escapeHtml(node.name) + '</span></div>' + children;
  };
  const renderArchitectureLayerGraph = (layer) => {
    const detail = '路径：' + layer.path + '；第 1 级架构层：' + layer.role + ' 来源：工程实际目录和五层职责说明.md。';
    const folders = layer.exists ? layer.children.map((node) => renderArchitectureFolderGraph(node, layer)).join('') : '<p class="muted">目录不存在，尚未确认。</p>';
    return '<section class="architecture-map-column"><div class="graph-layer-node graph-node" data-graph-node="' + escapeHtml(layer.id) + '" data-graph-detail="' + escapeHtml(detail) + '" tabindex="0" role="button" aria-label="查看架构层 ' + escapeHtml(layer.label) + '">' + escapeHtml(layer.label) + '</div><p class="architecture-map-role">' + escapeHtml(layer.role) + '</p><div class="graph-folder-list">' + folders + '</div></section>';
  };
  const architectureEdges = architectureGraph.edges.map((edge) => ({ from: String(edge.from).toUpperCase(), to: String(edge.to).toUpperCase() })).filter((edge) => graphOrder.includes(edge.from) && graphOrder.includes(edge.to));
  const architectureLayerCards = architectureTreeData.map((layer) => `<article class="architecture-layer-card"><div class="section-title"><div><h3>${escapeHtml(layer.label)}</h3><p class="architecture-map-role">${escapeHtml(layer.role)}</p></div><span class="status ${layer.exists ? 'status-completed' : 'status-pending'}">${layer.exists ? '目录已确认' : '目录未确认'}</span></div>${layer.exists ? `<div class="graph-folder-list">${layer.children.length ? layer.children.map((node) => renderArchitectureFolderGraph(node, layer)).join('') : '<p class="muted">当前层没有扫描到二级目录。</p>'}</div>` : '<p class="muted">工程目录不存在，内部结构未确认。</p>'}</article>`).join('');
  const graphMarkup = `<div class="architecture-graph-wrap"><svg class="architecture-graph" viewBox="0 0 1040 220" role="img" aria-label="六个大层级软件架构关系图"><defs><marker id="graph-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#6c9e9c"></path></marker></defs>${architectureEdges.map((edge) => { const from = graphPositions[edge.from]; const to = graphPositions[edge.to]; if (!from || !to) return ''; return `<line class="graph-edge" x1="${from[0] + 58}" y1="${from[1]}" x2="${to[0] - 58}" y2="${to[1]}" aria-hidden="true"></line>`; }).join('')}${graphNodes.map((node) => { const position = graphPositions[node.id]; const detail = `${graphNodeDetail(node)}${node.parsedLabel ? ` 文档节点：${node.parsedLabel}。` : ''} 来源：五层职责说明.md / 依赖方向说明.md。`; return `<g class="graph-node" data-graph-node="${escapeHtml(node.id)}" data-graph-detail="${escapeHtml(detail)}" tabindex="0" role="button" aria-label="查看 ${escapeHtml(node.label)} 职责"><rect x="${position[0] - 58}" y="${position[1] - 26}" width="116" height="52" rx="10"></rect><text x="${position[0]}" y="${position[1]}">${escapeHtml(node.label)}</text></g>`; }).join('')}</svg><div class="graph-detail" data-graph-detail>点击六个大层级查看职责与证据。</div><p class="muted">关系线 ${architectureEdges.length ? `来自 ${escapeHtml(architectureGraph.sourcePath)}` : '尚未从架构文档中识别'}；没有证据的依赖关系不自动补画。</p></div>`;
  const dependencyRows = architectureEdges.length ? architectureEdges.map((edge) => `<button type="button" class="architecture-dependency-row" data-architecture-dependency="${escapeHtml(edge.from)} → ${escapeHtml(edge.to)}" data-architecture-dependency-detail="${escapeHtml(`${graphLabels[edge.from]} → ${graphLabels[edge.to]}；${edge.from === 'PLATFORM' && edge.to === 'IMPL' ? 'Platform 定义接口契约，Impl 提供具体实现。' : '该关系来自工程架构文档，具体调用细节请结合来源文件确认。'}`)}"><span>${escapeHtml(graphLabels[edge.from])}</span><b>→</b><span>${escapeHtml(graphLabels[edge.to])}</span><small>${edge.from === 'PLATFORM' && edge.to === 'IMPL' ? '接口契约 / 实现注入' : '文档依赖关系'}</small></button>`).join('') : '<p class="muted">未从架构文档识别到六层之间的关系。</p>';
  const startupSteps = snapshot.startupCode?.steps || [];
  const startupMarkup = startupSteps.length ? `<div class="interactive-flow" data-startup-flow>${startupSteps.map((step, index) => `<div class="startup-step-wrap"><button type="button" class="startup-step-button status-${escapeHtml(step.status)}${index === 0 ? ' is-selected' : ''}" data-startup-step="${index}" data-startup-detail="${escapeHtml(step.detail)}" data-startup-source="${escapeHtml(step.source)}" data-startup-status="${escapeHtml(step.status)}"><span>${index + 1}. ${escapeHtml(step.title)}</span><small>${escapeHtml(step.status === 'confirmed' ? '源码已确认' : '未确认')}</small></button>${index < startupSteps.length - 1 ? '<span class="startup-arrow" aria-hidden="true">↓</span>' : ''}</div>`).join('')}</div><div class="startup-detail" data-startup-detail>点击启动步骤查看说明与证据。</div>` : '<section class="panel warning"><strong>未确认</strong><p>未找到可识别的启动源码证据。</p></section>';
  const renderCollapsedEvidence = (evidence) => {
    const sources = (evidence?.sources || []).filter((source) => source.content).slice(0, 12);
    if (!sources.length) return '<p class="muted">暂无可展开的架构或启动原文。</p>';
    return sources.map((source) => `<details class="source-view"><summary><code>${escapeHtml(source.path)}</code> · ${escapeHtml(source.confidence === 'confirmed' ? '已确认来源' : '推断匹配')}</summary><div class="markdown-body">${renderMarkdown(source.content)}</div></details>`).join('');
  };
  const architectureStart = '<section class="view-panel" data-page-panel="architecture" id="page-architecture">';
  const architectureEnd = '<section class="view-panel" data-page-panel="git"';
  const architectureStartIndex = html.indexOf(architectureStart);
  const architectureEndIndex = html.indexOf(architectureEnd, architectureStartIndex);
  if (architectureStartIndex >= 0 && architectureEndIndex > architectureStartIndex) {
     const architectureTabs = '<nav class="architecture-page-nav" role="tablist" aria-label="软件架构视图导航"><button type="button" class="architecture-page-button is-active" role="tab" aria-selected="true" data-architecture-page-button="architecture-overview">六层总览</button><button type="button" class="architecture-page-button" role="tab" aria-selected="false" data-architecture-page-button="architecture-internal">层内结构</button><button type="button" class="architecture-page-button" role="tab" aria-selected="false" data-architecture-page-button="architecture-dependencies">层间关系</button></nav>';
     const architecturePanel = `${architectureStart}<div class="section-title"><h2>架构与启动</h2><span class="subtle">软件架构分三层查看 · 启动流程独立展示</span></div>${architectureTabs}<div class="architecture-page-content"><section class="architecture-page-panel is-active" data-architecture-page-panel="architecture-overview" role="tabpanel"><div class="panel"><h3>软件架构图</h3><h3>六个大层级总览</h3><p class="muted">六个大层级来自工程架构约定；关系线只显示架构文档中已经记录的依赖。</p>${graphMarkup}</div></section><section class="architecture-page-panel" data-architecture-page-panel="architecture-internal" role="tabpanel" hidden><div class="panel"><h3>各层级内部结构</h3><p class="muted">工程目录已嵌入架构图：按工程实际目录展示每个层级的二级、三级目录；点击目录查看路径和扫描范围。</p><div class="architecture-layer-grid">${architectureLayerCards || '<p class="muted">未找到可扫描的架构层目录。</p>'}</div><div class="graph-detail" data-graph-detail>点击目录查看路径和层级信息。</div></div></section><section class="architecture-page-panel" data-architecture-page-panel="architecture-dependencies" role="tabpanel" hidden><div class="panel"><h3>大层级之间的架构关系</h3><p class="muted">这里展示六个大层级之间的文档化依赖和接口契约。点击关系查看解释。</p><div class="architecture-dependency-list">${dependencyRows}</div><div class="architecture-dependency-detail" data-architecture-dependency-detail-view>选择一条层间关系查看说明。</div><p class="muted">关系来源：${escapeHtml(architectureGraph.sourcePath || '未确认')}。</p></div></section></div><section class="panel"><h3>启动流程图</h3><p class="muted">从上电/复位到程序运行；启动文件未纳入证据时会明确显示“未确认”。</p>${startupMarkup}</section><details class="panel"><summary>查看架构与启动原文证据</summary>${renderCollapsedEvidence(snapshot.architecture)}${renderCollapsedEvidence(snapshot.startup)}</details></section>`;
     const architectureCompatibility = snapshot.architecture?.sources?.length ? '' : '<p class="muted">未找到明确的软件架构设计资料（00_Docs/06_嵌入式插件输出/architecture 或兼容的 docs/architecture）；当前不会根据 C/C++ 源码自动猜测。</p>';
     const architecturePanelWithCompatibility = architecturePanel.replace('<p class="muted">六个大层级来自工程架构约定；关系线只显示架构文档中已经记录的依赖。</p>', `<p class="muted">六个大层级来自工程架构约定；关系线只显示架构文档中已经记录的依赖。</p>${architectureCompatibility}`);
     html = html.slice(0, architectureStartIndex) + architecturePanelWithCompatibility + html.slice(architectureEndIndex);
  }
  const overviewSummaryPattern = /<section class="summary-grid" aria-label="项目概览">[\s\S]*?<\/section>/;
  const overviewSummary = html.match(overviewSummaryPattern)?.[0] || '';
  const shellStart = `<body><main><button class="mobile-nav-toggle" type="button" aria-controls="dashboard-sidebar" aria-expanded="false">☰ 页面导航</button><button class="nav-backdrop" type="button" aria-label="关闭页面导航"></button><div class="dashboard-shell"><aside class="dashboard-sidebar" id="dashboard-sidebar"><div class="sidebar-brand">Embedded Framework<span>项目工作台</span></div><nav class="page-nav" role="tablist" aria-label="项目工作台页面导航">${pageNav}</nav><div class="sidebar-note">8 个页面集中展示<br>输入内容变化时更新</div></aside><section class="dashboard-main"><header class="header">`;
  const interactiveScript = `<script>(()=>{const buttons=Array.from(document.querySelectorAll('[data-page-button]'));const panels=Array.from(document.querySelectorAll('[data-page-panel]'));const mobileToggle=document.querySelector('.mobile-nav-toggle');const navBackdrop=document.querySelector('.nav-backdrop');const closeNav=()=>{document.body.classList.remove('nav-open');if(mobileToggle)mobileToggle.setAttribute('aria-expanded','false');};const select=(name,updateHash=true)=>{const selected=buttons.some(button=>button.dataset.pageButton===name)?name:'overview';buttons.forEach(button=>{const active=button.dataset.pageButton===selected;button.classList.toggle('is-active',active);button.setAttribute('aria-selected',String(active));});panels.forEach(panel=>{const active=panel.dataset.pagePanel===selected;panel.hidden=!active;panel.classList.toggle('is-active',active);});if(updateHash&&window.history&&window.history.replaceState)window.history.replaceState(null,'','#'+selected);closeNav();};buttons.forEach(button=>button.addEventListener('click',()=>select(button.dataset.pageButton)));if(mobileToggle)mobileToggle.addEventListener('click',()=>{const open=!document.body.classList.contains('nav-open');document.body.classList.toggle('nav-open',open);mobileToggle.setAttribute('aria-expanded',String(open));});if(navBackdrop)navBackdrop.addEventListener('click',closeNav);document.addEventListener('keydown',(event)=>{if(event.key==='Escape')closeNav();});const resourceButtons=Array.from(document.querySelectorAll('[data-resource-page-button]'));const resourcePanels=Array.from(document.querySelectorAll('[data-resource-page-panel]'));const selectResourcePage=(name)=>{const selected=resourceButtons.some(button=>button.dataset.resourcePageButton===name)?name:'resource-summary';resourceButtons.forEach(button=>{const active=button.dataset.resourcePageButton===selected;button.classList.toggle('is-active',active);button.setAttribute('aria-selected',String(active));});resourcePanels.forEach(panel=>{const active=panel.dataset.resourcePagePanel===selected;panel.hidden=!active;panel.classList.toggle('is-active',active);});};resourceButtons.forEach(button=>{button.addEventListener('click',()=>selectResourcePage(button.dataset.resourcePageButton));button.addEventListener('keydown',(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectResourcePage(button.dataset.resourcePageButton);}});});const graphNodes=Array.from(document.querySelectorAll('[data-graph-node]'));const graphDetail=document.querySelector('[data-graph-detail]');const selectGraphNode=(node)=>{graphNodes.forEach(item=>item.classList.toggle('is-selected',item===node));if(graphDetail)graphDetail.textContent=node.dataset.graphDetail||'该节点暂无补充说明。';};graphNodes.forEach(node=>{node.addEventListener('click',()=>selectGraphNode(node));node.addEventListener('keydown',(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectGraphNode(node);}});});const treeNodes=Array.from(document.querySelectorAll('[data-tree-node]'));const treeDetail=document.querySelector('[data-tree-detail]');const selectTreeNode=(node)=>{treeNodes.forEach(item=>item.classList.toggle('is-selected',item===node));if(treeDetail)treeDetail.textContent=node.dataset.treeDetail||'该目录暂无补充说明。';};treeNodes.forEach(node=>{node.addEventListener('click',()=>selectTreeNode(node));node.addEventListener('keydown',(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectTreeNode(node);}});});const startupSteps=Array.from(document.querySelectorAll('[data-startup-step]'));const startupDetail=document.querySelector('[data-startup-detail]');const escapeValue=(value)=>String(value??'').replace(/[&<>\"]/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[char]));const selectStartupStep=(step)=>{startupSteps.forEach(item=>item.classList.toggle('is-selected',item===step));if(startupDetail)startupDetail.innerHTML='<strong>'+escapeValue(step.textContent.replace('源码已确认','').replace('未确认','').trim())+'</strong><br>'+escapeValue(step.dataset.startupDetail)+'<br><span class="muted">证据：'+escapeValue(step.dataset.startupSource)+' · '+(step.dataset.startupStatus==='confirmed'?'源码已确认':'未确认')+'</span>';};startupSteps.forEach(step=>{step.addEventListener('click',()=>selectStartupStep(step));step.addEventListener('keydown',(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectStartupStep(step);}});});const hardwareItems=Array.from(document.querySelectorAll('[data-hardware-item]'));const hardwareDetail=document.querySelector('[data-hardware-detail]');const selectHardwareItem=(item)=>{hardwareItems.forEach(entry=>entry.classList.toggle('is-selected',entry===item));if(hardwareDetail)hardwareDetail.textContent=item.dataset.hardwareDetail||'该资源暂无补充说明。';};hardwareItems.forEach(item=>{item.addEventListener('click',()=>selectHardwareItem(item));item.addEventListener('keydown',(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectHardwareItem(item);}});});if(resourceButtons[0])selectResourcePage(resourceButtons[0].dataset.resourcePageButton);if(graphNodes[0])selectGraphNode(graphNodes[0]);if(treeNodes[0])selectTreeNode(treeNodes[0]);if(startupSteps[0])selectStartupStep(startupSteps[0]);if(hardwareItems[0])selectHardwareItem(hardwareItems[0]);select(window.location.hash.slice(1),false);})();</script>`;
  const architectureInteractiveScript = `<script>(()=>{const buttons=Array.from(document.querySelectorAll('[data-architecture-page-button]'));const panels=Array.from(document.querySelectorAll('[data-architecture-page-panel]'));const select=(name)=>{const selected=buttons.some(button=>button.dataset.architecturePageButton===name)?name:'architecture-overview';buttons.forEach(button=>{const active=button.dataset.architecturePageButton===selected;button.classList.toggle('is-active',active);button.setAttribute('aria-selected',String(active));});panels.forEach(panel=>{const active=panel.dataset.architecturePagePanel===selected;panel.hidden=!active;panel.classList.toggle('is-active',active);});};buttons.forEach(button=>{button.addEventListener('click',()=>select(button.dataset.architecturePageButton));button.addEventListener('keydown',(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select(button.dataset.architecturePageButton);}});});const graphNodes=Array.from(document.querySelectorAll('[data-graph-node]'));graphNodes.forEach(node=>node.addEventListener('click',()=>{const surface=node.closest('[data-architecture-page-panel]');const detail=surface?.querySelector('[data-graph-detail]');if(detail)detail.textContent=node.dataset.graphDetail||'该节点暂无补充说明。';}));const dependencyRows=Array.from(document.querySelectorAll('[data-architecture-dependency]'));const dependencyDetail=document.querySelector('[data-architecture-dependency-detail-view]');dependencyRows.forEach(row=>{const selectDependency=()=>{dependencyRows.forEach(item=>item.classList.toggle('is-selected',item===row));if(dependencyDetail)dependencyDetail.textContent=row.dataset.architectureDependencyDetail||row.dataset.architectureDependency||'该关系暂无补充说明。';};row.addEventListener('click',selectDependency);row.addEventListener('keydown',(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectDependency();}});});if(buttons[0])select(buttons[0].dataset.architecturePageButton);if(dependencyRows[0])dependencyRows[0].click();})();</script>`;
  const overviewTitle = '<section class="view-panel is-active" data-page-panel="overview" id="page-overview"><div class="section-title"><h2>项目总览</h2><span class="subtle">回答：项目是什么、怎么实现、有哪些问题</span></div>';
  return html.replace(overviewSummaryPattern, '').replace(overviewTitle, `${overviewTitle}${overviewSummary}`).replace(/<nav class="page-nav" role="tablist" aria-label="项目工作台页面导航">[\s\S]*?<\/nav>/, '').replace('<body><main><header class="header">', shellStart).replace('</div></main><script>', '</div></section></div></main><script>').replace('</style>', `${layoutCss}${architectureCss}</style>`).replace(/<script>[\s\S]*?<\/script>/, `${interactiveScript}${architectureInteractiveScript}`);
}

function writeDashboard(options = {}) {
  const snapshot = options.snapshot || readDashboardSnapshot(options); const outputPath = snapshot.paths.outputPath;
  if (options.skipIfUnchanged && options.previousDigest === snapshot.contentDigest) return { outputPath, snapshot, changed: false };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true }); const temporaryPath = `${outputPath}.${process.pid}.${Date.now()}.tmp`; const backupPath = `${outputPath}.previous`;
  fs.writeFileSync(temporaryPath, renderDashboardHtml(snapshot, options), 'utf8');
  try { if (fs.existsSync(outputPath)) { fs.rmSync(backupPath, { force: true }); fs.renameSync(outputPath, backupPath); } fs.renameSync(temporaryPath, outputPath); fs.rmSync(backupPath, { force: true }); }
  catch (error) { if (!fs.existsSync(outputPath) && fs.existsSync(backupPath)) fs.renameSync(backupPath, outputPath); throw error; }
  finally { fs.rmSync(temporaryPath, { force: true }); }
  return { outputPath, snapshot, changed: true };
}

function collectDirectoryTree(root, directories, seen, limit = 400) {
  if (!fs.existsSync(root) || directories.length >= limit) return;
  const resolved = path.resolve(root);
  if (seen.has(resolved)) return;
  seen.add(resolved);
  directories.push(resolved);
  let entries;
  try { entries = fs.readdirSync(resolved, { withFileTypes: true }); } catch { return; }
  entries.forEach((entry) => {
    if (directories.length >= limit || !entry.isDirectory() || SKIPPED_DIRECTORIES.has(entry.name.toLowerCase())) return;
    collectDirectoryTree(path.join(resolved, entry.name), directories, seen, limit);
  });
}

function collectWatchDirectories(snapshot) {
  const root = snapshot.paths.projectRoot;
  const directories = [];
  const seen = new Set();
  [root, snapshot.paths.workflowRoot, path.join(root, '.git'), path.join(root, 'docs'), path.join(root, '00_Docs'), path.join(root, 'build'), path.join(root, '06_Toolchain')]
    .forEach((candidate) => collectDirectoryTree(candidate, directories, seen));
  return directories;
}

function watchDashboard(options = {}) {
  const initialSnapshot = readDashboardSnapshot(options); const debounceMs = Number.isFinite(Number(options.debounceMs)) ? Math.max(0, Number(options.debounceMs)) : 250; const onError = typeof options.onError === 'function' ? options.onError : () => {}; const watchers = []; let timer = null; let stopped = false; let lastDigest = null;
  const regenerate = () => { timer = null; if (stopped) return; try { const snapshot = readDashboardSnapshot(options); const result = writeDashboard({ ...options, snapshot, previousDigest: lastDigest, skipIfUnchanged: true }); if (result.changed) lastDigest = snapshot.contentDigest; } catch (error) { onError(error); } };
  const schedule = () => { if (timer !== null) clearTimeout(timer); timer = setTimeout(regenerate, debounceMs); };
  const initialResult = writeDashboard({ ...options, snapshot: initialSnapshot }); lastDigest = initialResult.snapshot.contentDigest;
  collectWatchDirectories(initialSnapshot).forEach((directory) => { try { const watcher = fs.watch(directory, { persistent: true }, schedule); watcher.on('error', onError); watchers.push(watcher); } catch (error) { onError(error); } });
  return { stop() { if (stopped) return false; stopped = true; if (timer !== null) clearTimeout(timer); timer = null; watchers.splice(0).forEach((watcher) => watcher.close()); return true; } };
}

module.exports = { DOCUMENT_NAMES, TASK_STATUS_NAMES, computeSnapshotDigest, normalizeTaskStatus, parseTaskTable, renderMarkdown, renderDashboardHtml, readDashboardSnapshot, resolveDashboardPaths, watchDashboard, writeDashboard };
