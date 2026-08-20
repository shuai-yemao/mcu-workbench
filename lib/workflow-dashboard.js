'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { getWorkflowStatePaths, readWorkflowState } = require('./workflow-state');

const DOCUMENT_NAMES = ['spec', 'plan', 'task'];
const TASK_STATUS_NAMES = ['completed', 'inProgress', 'blocked', 'pending', 'superseded', 'unknown'];
const EVIDENCE_EXTENSIONS = new Set(['.md', '.markdown', '.mmd', '.mermaid', '.puml', '.txt']);
const SKIPPED_DIRECTORIES = new Set(['.git', '.mcu-workbench', 'node_modules', 'build', 'dist', 'out', '05_vendor']);
const MAX_EVIDENCE_FILES = 120;
const MAX_EVIDENCE_BYTES = 240 * 1024;

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
  const resolvedOutput = outputPath ? assertAbsolutePath(outputPath, 'outputPath') : path.join(projectPath, 'workflow-dashboard.html');
  if (!isPathInside(projectPath, resolvedOutput)) throw new Error('outputPath must be inside projectRoot');
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
  ['docs', '00_Docs', 'README.md', 'CONTEXT.md'].forEach((relative) => {
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
    const matched = kind === 'architecture' ? isArchitectureSource(relativePath, content) : isStartupSource(relativePath, content);
    if (!matched) return;
    const explicit = kind === 'architecture' ? /architecture|架构|系统设计/i.test(relativePath) : /boot|startup|start-up|init|启动|初始化|流程/i.test(relativePath);
    sources.push({ path: relativePath, content, confidence: explicit ? 'confirmed' : 'inferred', mermaid: extractMermaidBlocks(content) });
  });
  return { kind, sources, confirmed: sources.some((source) => source.confidence === 'confirmed') };
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
  const startup = collectEvidence(paths.projectRoot, 'startup', issues);
  const git = readGitSnapshot(paths.projectRoot, issues);
  const taskSummary = summarizeTasks(requests);
  const adjustments = collectAdjustments(requests, git);
  const snapshot = {
    generatedAt: new Date().toISOString(), paths, project, currentRequestId: current.requestId, documents: current.documents,
    taskSummary, workflow: current.workflow, events: current.events, issues, requests, architecture, startup,
    progress: { requests: requests.map((request) => ({ requestId: request.requestId, featureTitle: request.featureTitle, taskSummary: request.taskSummary, workflow: request.workflow })) },
    adjustments, git,
  };
  snapshot.contentDigest = computeSnapshotDigest(snapshot);
  return snapshot;
}

function computeSnapshotDigest(snapshot) {
  return crypto.createHash('sha256').update(JSON.stringify({ project: snapshot.project, documents: snapshot.documents, taskSummary: snapshot.taskSummary, workflow: snapshot.workflow, events: snapshot.events, issues: snapshot.issues, requests: snapshot.requests, architecture: snapshot.architecture, startup: snapshot.startup, adjustments: snapshot.adjustments, git: snapshot.git })).digest('hex');
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

function renderDashboardHtml(snapshot) {
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
</style></head><body><main><header class="header"><div><div class="eyebrow">Project Engineering Cockpit</div><h1>项目工程驾驶舱</h1></div><div class="header-meta subtle">项目：${escapeHtml(project.project || '')}<br>当前功能：${escapeHtml(snapshot.currentRequestId || '暂无')}<br>生成时间：${escapeHtml(snapshot.generatedAt || '')}<br>仅在观测内容变化时更新</div></header><section class="summary-grid" aria-label="项目总览"><div class="card"><span class="subtle">当前阶段</span><strong>${escapeHtml(statusLabel(workflow.current_stage))}</strong></div><div class="card"><span class="subtle">工作流状态</span><strong>${escapeHtml(statusLabel(workflow.current_status))}</strong></div><div class="card"><span class="subtle">总体完成度</span><strong>${escapeHtml(`${taskSummary.completed || 0}/${taskSummary.total || 0}`)}</strong><div class="progress"><span style="width:${percent}%"></span></div></div><div class="card"><span class="subtle">需要关注</span><strong>${escapeHtml(String((snapshot.issues || []).length + (taskSummary.blocked || 0)))} 项</strong></div></section><nav class="page-nav" role="tablist" aria-label="项目驾驶舱页面导航">${pageButtons}</nav><div class="page-content">${overview}${renderEvidencePage('软件架构', snapshot.architecture || { kind: 'architecture', sources: [] }, '未找到 docs/architecture 或明确的架构设计资料。')}${renderEvidencePage('启动流程', snapshot.startup || { kind: 'startup', sources: [] }, '未找到 docs/boot、docs/startup 或明确的启动流程资料。')}${progress}${adjustments}${renderGitPage(snapshot.git || { available: false })}${ai}${documentPages}${status}</div></main><script>(()=>{const buttons=Array.from(document.querySelectorAll('[data-page-button]'));const panels=Array.from(document.querySelectorAll('[data-page-panel]'));buttons.forEach(button=>button.addEventListener('click',()=>{const selected=button.dataset.pageButton;buttons.forEach(item=>{const active=item===button;item.classList.toggle('is-active',active);item.setAttribute('aria-selected',String(active));});panels.forEach(panel=>{const active=panel.dataset.pagePanel===selected;panel.hidden=!active;panel.classList.toggle('is-active',active);});}));})();</script></body></html>`;
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
  [root, snapshot.paths.workflowRoot, path.join(root, '.git'), path.join(root, 'docs'), path.join(root, '00_Docs')]
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
