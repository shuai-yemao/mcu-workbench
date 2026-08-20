'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  createWorkflowState,
  getWorkflowStatePaths,
  writeWorkflowState,
} = require('../lib/workflow-state');
const {
  renderDashboardHtml,
  renderMarkdown,
  readDashboardSnapshot,
  resolveDashboardPaths,
  watchDashboard,
  writeDashboard,
} = require('../lib/workflow-dashboard');

describe('workflow-dashboard snapshot core', () => {
  let root;
  let docsDir;
  const requestId = 'REQ-DASHBOARD-TEST';

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcu-workbench-dashboard-'));
    docsDir = path.join(root, '00_Docs', '04_需求文档');
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(path.join(docsDir, 'spec.md'), '# Spec\nrequest content\n', 'utf8');
    fs.writeFileSync(path.join(docsDir, 'plan.md'), '# Plan\nplan content\n', 'utf8');
    fs.writeFileSync(path.join(docsDir, 'task.md'), [
      '# Task',
      '',
      '| ID | 任务名称 | 状态 |',
      '|---|---|---|',
      '| T-001 | 读取 | completed |',
      '| T-002 | 渲染 | in_progress |',
      '| T-003 | 监听 | blocked |',
      '| T-004 | 文档 | pending |',
      '| T-005 | 未知 | mystery |',
      '',
    ].join('\n'), 'utf8');

    const state = createWorkflowState({
      requestId,
      projectRoot: root,
    });
    state.current_stage = 'task_execution';
    state.current_status = 'in_progress';
    state.task_summary = { total: 5, completed: 1, current_task: 'T-002' };
    state.blockers = ['T-003 blocked'];
    state.open_questions = ['browser refresh'];
    state.verify_summary = { status: 'pending', deviations: [] };
    state.final_review_summary = { status: 'pending', findings: [] };
    const statePaths = getWorkflowStatePaths(root, requestId);
    writeWorkflowState(statePaths.statePath, state);
    fs.writeFileSync(statePaths.eventsPath, [
      JSON.stringify({ event: 'task_started', task_id: 'T-002' }),
      JSON.stringify({ event: 'task_blocked', task_id: 'T-003' }),
      '',
    ].join('\n'), 'utf8');
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('resolves the default document and workflow paths', () => {
    const paths = resolveDashboardPaths({ root, requestId });

    expect(paths.docsDir).toBe(docsDir);
    expect(paths.documents.spec).toBe(path.join(docsDir, 'spec.md'));
    expect(paths.documents.plan).toBe(path.join(docsDir, 'plan.md'));
    expect(paths.documents.task).toBe(path.join(docsDir, 'task.md'));
    expect(paths.outputPath).toBe(path.join(root, 'workflow-dashboard.html'));
  });

  test('rejects a relative project root', () => {
    expect(() => resolveDashboardPaths({ root: '.', requestId })).toThrow(/absolute/);
  });

  test('reads documents, workflow state, events, and task statistics', () => {
    const snapshot = readDashboardSnapshot({ root, requestId });

    expect(snapshot.documents.spec).toContain('request content');
    expect(snapshot.documents.plan).toContain('plan content');
    expect(snapshot.documents.task).toContain('T-005');
    expect(snapshot.taskSummary).toMatchObject({
      total: 5,
      completed: 1,
      inProgress: 1,
      blocked: 1,
      pending: 1,
      unknown: 1,
    });
    expect(snapshot.workflow.current_stage).toBe('task_execution');
    expect(snapshot.issues).toEqual(expect.arrayContaining([
      expect.stringContaining('unknown'),
    ]));
    expect(snapshot.events).toHaveLength(2);
  });

  test('keeps the snapshot usable when an input document and an event line are damaged', () => {
    fs.rmSync(path.join(docsDir, 'plan.md'));
    const eventsPath = getWorkflowStatePaths(root, requestId).eventsPath;
    fs.appendFileSync(eventsPath, '{broken-json\n', 'utf8');

    const snapshot = readDashboardSnapshot({ root, requestId });

    expect(snapshot.documents.spec).toContain('request content');
    expect(snapshot.documents.plan).toBe('');
    expect(snapshot.events).toHaveLength(2);
    expect(snapshot.issues).toEqual(expect.arrayContaining([
      expect.stringContaining('plan.md'),
      expect.stringContaining('events.jsonl'),
    ]));
  });

  test('renders a self-contained dashboard without injecting document markup', () => {
    fs.writeFileSync(
      path.join(docsDir, 'spec.md'),
      '# Spec\n<script>alert("unsafe")</script>&\n',
      'utf8',
    );
    const snapshot = readDashboardSnapshot({ root, requestId });
    const html = renderDashboardHtml(snapshot);

    expect(html).toContain('项目工程驾驶舱');
    expect(html).toContain('Spec');
    expect(html).toContain('T-005');
    expect(html).toContain('&lt;script&gt;alert(&quot;unsafe&quot;)&lt;/script&gt;&amp;');
    expect(html).not.toContain('<script>alert("unsafe")</script>');
    expect(html).not.toContain('<meta http-equiv="refresh"');
    expect(html).toContain('仅在观测内容变化时更新');
  });

  test('renders the confirmed Markdown subset and blocks unsafe markup', () => {
    const html = renderMarkdown([
      '# 标题',
      '',
      '**粗体** *斜体* ~~删除~~ `代码` [安全链接](https://example.com)',
      '',
      '- [x] 已完成',
      '- 普通项',
      '',
      '> 引用内容',
      '',
      '```c',
      'int value = 1;',
      '```',
      '',
      '| 名称 | 状态 |',
      '|---|---|',
      '| A | ready |',
      '',
      '<script>alert("unsafe")</script>',
      '[危险链接](javascript:alert(1))',
    ].join('\n'));

    expect(html).toContain('<h1>标题</h1>');
    expect(html).toContain('<strong>粗体</strong>');
    expect(html).toContain('<input type="checkbox" disabled checked>');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('class="language-c"');
    expect(html).toContain('<table class="markdown-table">');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('&lt;script&gt;alert(&quot;unsafe&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert("unsafe")</script>');
    expect(html).not.toContain('href="javascript:');
  });

  test('renders a Chinese-first responsive dashboard layout', () => {
    const snapshot = readDashboardSnapshot({ root, requestId });
    const html = renderDashboardHtml(snapshot);

    expect(html).toContain('<html lang="zh-CN">');
    expect(html).toContain('项目工程驾驶舱');
    expect(html).toContain('项目总览');
    expect(html).toContain('class="page-nav"');
    expect(html).toContain('@media(max-width:960px)');
    expect(html).toContain('id="document-spec"');
    expect(html).toContain('id="document-plan"');
    expect(html).toContain('id="document-task"');
  });

  test('provides document selectors and readable status summaries instead of raw JSON', () => {
    const snapshot = readDashboardSnapshot({ root, requestId });
    const html = renderDashboardHtml(snapshot);

    expect(html).toContain('问题与事件');
    expect(html).toContain('data-page-button="spec"');
    expect(html).toContain('data-page-button="plan"');
    expect(html).toContain('data-page-button="task"');
    expect(html).toContain('data-page-panel="spec"');
    expect(html).toMatch(/data-page-panel="plan"[^>]*hidden/);
    expect(html).toMatch(/data-page-panel="task"[^>]*hidden/);
    expect(html).toContain('data-page-button="overview"');
    expect(html).toContain('data-page-button="status"');
    expect(html).toContain('data-page-button="architecture"');
    expect(html).toContain('data-page-button="startup"');
    expect(html).toContain('data-page-button="progress"');
    expect(html).toContain('data-page-button="adjustments"');
    expect(html).toContain('data-page-button="git"');
    expect(html).toContain('data-page-button="ai"');
    expect(html).toContain('data-page-panel="overview"');
    expect(html).toContain('data-page-panel="status"');
    expect(html).toContain('event-timeline');
    expect(html).toContain('验证与审查');
    expect(html).not.toContain('"deviations":');
    expect(html).not.toContain('"findings":');
    expect(html).not.toContain('"task_id":"T-002"');
  });

  test('writes the dashboard atomically to the document directory', () => {
    const result = writeDashboard({ root, requestId });

    expect(result.outputPath).toBe(path.join(root, 'workflow-dashboard.html'));
    expect(fs.readFileSync(result.outputPath, 'utf8')).toContain('项目工程驾驶舱');
    expect(fs.readdirSync(root).some((name) => name.endsWith('.tmp'))).toBe(false);
  });

  test('skips dashboard writes when the source content digest is unchanged', () => {
    const first = writeDashboard({ root, requestId });
    const unchanged = writeDashboard({
      root,
      requestId,
      previousDigest: first.snapshot.contentDigest,
      skipIfUnchanged: true,
    });

    expect(unchanged.changed).toBe(false);
    expect(unchanged.snapshot.contentDigest).toBe(first.snapshot.contentDigest);

    fs.writeFileSync(path.join(docsDir, 'spec.md'), '# Spec\nchanged\n', 'utf8');
    const changed = writeDashboard({
      root,
      requestId,
      previousDigest: first.snapshot.contentDigest,
      skipIfUnchanged: true,
    });

    expect(changed.changed).toBe(true);
    expect(changed.snapshot.contentDigest).not.toBe(first.snapshot.contentDigest);
  });

  test('regenerates after an input change and releases the watcher', async () => {
    const watcher = watchDashboard({ root, requestId, debounceMs: 20 });
    fs.writeFileSync(path.join(docsDir, 'spec.md'), '# Spec\nchanged content\n', 'utf8');
    await new Promise((resolve) => setTimeout(resolve, 120));

    expect(fs.readFileSync(path.join(root, 'workflow-dashboard.html'), 'utf8'))
      .toContain('changed content');
    expect(watcher.stop()).toBe(true);
    expect(watcher.stop()).toBe(false);
  });

  test('regenerates after a nested architecture document changes', async () => {
    const architectureDir = path.join(root, 'docs', 'architecture');
    fs.mkdirSync(architectureDir, { recursive: true });
    fs.writeFileSync(path.join(architectureDir, 'overview.md'), '# 架构\n初始\n', 'utf8');
    const watcher = watchDashboard({ root, requestId, debounceMs: 20 });
    fs.writeFileSync(path.join(architectureDir, 'overview.md'), '# 架构\n更新后的架构\n', 'utf8');
    await new Promise((resolve) => setTimeout(resolve, 120));

    expect(fs.readFileSync(path.join(root, 'workflow-dashboard.html'), 'utf8')).toContain('更新后的架构');
    expect(watcher.stop()).toBe(true);
  });

  test('provides a render CLI entry point', () => {
    const scriptPath = path.join(__dirname, '..', 'scripts', 'workflow-dashboard.js');
    const result = spawnSync(process.execPath, [
      scriptPath,
      'render',
      '--root', root,
      '--request-id', requestId,
    ], { encoding: 'utf8', windowsHide: true });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('workflow-dashboard.html');
  });

  test('aggregates project evidence and exposes architecture, startup, Git, and AI pages', () => {
    fs.mkdirSync(path.join(root, 'docs', 'architecture'), { recursive: true });
    fs.mkdirSync(path.join(root, 'docs', 'startup'), { recursive: true });
    fs.writeFileSync(path.join(root, 'docs', 'architecture', 'overview.md'), [
      '# 软件架构', '', '```mermaid', 'flowchart LR', 'App[应用] --> Service[服务]', 'Service --> Platform[平台]', '```',
    ].join('\n'), 'utf8');
    fs.writeFileSync(path.join(root, 'docs', 'startup', 'boot.md'), [
      '# 启动流程', '', '```mermaid', 'flowchart TD', 'Reset[复位] --> Main[main]', 'Main --> Scheduler[启动调度器]', '```',
    ].join('\n'), 'utf8');

    const snapshot = readDashboardSnapshot({ root, requestId });
    const html = renderDashboardHtml(snapshot);

    expect(snapshot.architecture.sources.map((source) => source.path)).toContain('docs/architecture/overview.md');
    expect(snapshot.startup.sources.map((source) => source.path)).toContain('docs/startup/boot.md');
    expect(snapshot.git).toHaveProperty('available');
    expect(html).toContain('软件架构');
    expect(html).toContain('启动流程');
    expect(html).toContain('Git 管理');
    expect(html).toContain('AI 功能任务');
    expect(html).toContain('应用');
    expect(html).toContain('复位');
  });

  test('discovers flat target-project requests and derives readable titles and status', () => {
    const flatRequestId = 'REQ-FEATURE-FLAT-20260820';
    fs.writeFileSync(path.join(docsDir, `${flatRequestId}-Spec.md`), '# 平铺需求标题\n需求说明\n', 'utf8');
    fs.writeFileSync(path.join(docsDir, `${flatRequestId}-Integration-Plan.md`), '# 集成计划\n', 'utf8');
    fs.writeFileSync(path.join(docsDir, `${flatRequestId}-task.md`), [
      '# Task', '',
      '| ID | 任务 | 状态 |',
      '|---|---|---|',
      '| T-001 | 实现 | completed |',
      '| T-002 | 验证 | blocked |', '',
    ].join('\n'), 'utf8');

    const snapshot = readDashboardSnapshot({ root });
    const request = snapshot.requests.find((item) => item.requestId === flatRequestId);

    expect(request).toBeDefined();
    expect(request.featureTitle).toBe('平铺需求标题');
    expect(request.taskSummary).toMatchObject({ total: 2, completed: 1, blocked: 1, percent: 50 });
    expect(request.workflow.current_status).toBe('blocked');
  });

  test('shows an unconfirmed architecture/startup state when project evidence is absent', () => {
    const snapshot = readDashboardSnapshot({ root, requestId });
    const html = renderDashboardHtml(snapshot);

    expect(snapshot.architecture.sources).toHaveLength(0);
    expect(snapshot.startup.sources).toHaveLength(0);
    expect(html).toContain('当前不会根据 C/C++ 源码自动猜测');
    expect(html).toContain('未找到 docs/architecture 或明确的架构设计资料');
  });
});
