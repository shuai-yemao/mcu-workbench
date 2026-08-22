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
    expect(paths.outputPath).toBe(path.join(root, '00_Docs', '06_嵌入式插件输出', 'workflow-dashboard.html'));
  });

  test('rejects a relative project root', () => {
    expect(() => resolveDashboardPaths({ root: '.', requestId })).toThrow(/absolute/);
  });

  test('keeps explicit dashboard output inside the plugin output root', () => {
    expect(() => resolveDashboardPaths({
      root,
      requestId,
      outputPath: path.join(root, 'workflow-dashboard.html'),
    })).toThrow(/06_嵌入式插件输出/);
  });

  test('reads architecture evidence from the canonical plugin output directory', () => {
    const architectureDir = path.join(root, '00_Docs', '06_嵌入式插件输出', 'architecture');
    fs.mkdirSync(architectureDir, { recursive: true });
    fs.writeFileSync(path.join(architectureDir, 'overview.md'), '# 软件架构\\nCanonical output\\n', 'utf8');

    const snapshot = readDashboardSnapshot({ root, requestId });

    expect(snapshot.architecture.sources.map((source) => source.path)).toContain('00_Docs/06_嵌入式插件输出/architecture/overview.md');
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

    expect(html).toContain('项目工程工作台');
    expect(html).not.toContain('<script>alert("unsafe")</script>');
    expect(html).not.toContain('<meta http-equiv="refresh"');
    expect(html).toContain('仅在输入内容变化时更新');
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
    expect(html).toContain('项目工程工作台');
    expect(html).toContain('项目总览');
    expect(html).toContain('class="page-nav"');
    expect(html).toContain('class="dashboard-shell"');
    expect(html).toContain('id="dashboard-sidebar"');
    expect(html).toContain('class="dashboard-main"');
    expect(html).toContain('class="nav-group"');
    expect(html).toContain('class="mobile-nav-toggle"');
    expect(html).toContain('prefers-reduced-motion:reduce');
    expect(html).toContain('@media(max-width:960px)');
    expect((html.match(/data-page-button=/g) || []).length).toBe(8);
    expect((html.match(/data-page-panel=/g) || []).length).toBe(8);
    expect(html).toContain('data-page-button="debug"');
    expect(html).toContain('data-page-button="resources"');
    expect((html.match(/aria-label="项目概览"/g) || []).length).toBe(1);
    expect(html.indexOf('aria-label="项目概览"')).toBeGreaterThan(html.indexOf('data-page-panel="overview"'));
    expect(html).toContain('当前工作');
    expect(html).toContain('查看详细事件');
    expect(html).toContain('项目是什么');
    expect(html).toContain('怎么实现的');
    expect(html).toContain('有哪些问题');
    expect(html).not.toContain('功能总数');
  });

  test('provides document selectors and readable status summaries instead of raw JSON', () => {
    const snapshot = readDashboardSnapshot({ root, requestId });
    const html = renderDashboardHtml(snapshot);

    expect(html).toContain('AI 工作流与问题');
    expect(html).not.toContain('data-page-button="spec"');
    expect(html).not.toContain('data-page-button="plan"');
    expect(html).not.toContain('data-page-button="task"');
    expect(html).toContain('data-page-button="overview"');
    expect(html).toContain('data-page-button="architecture"');
    expect(html).toContain('data-page-button="build"');
    expect(html).toContain('data-page-button="progress"');
    expect(html).toContain('data-page-button="git"');
    expect(html).toContain('data-page-button="ai"');
    expect(html).toContain('data-page-panel="overview"');
    expect(html).toContain('data-page-panel="ai"');
    expect(html).toContain('event-timeline');
    expect(html).toContain('调试日志');
    expect(html).not.toContain('"deviations":');
    expect(html).not.toContain('"findings":');
    expect(html).not.toContain('"task_id":"T-002"');
  });

  test('writes the dashboard atomically to the document directory', () => {
    const result = writeDashboard({ root, requestId });

    expect(result.outputPath).toBe(path.join(root, '00_Docs', '06_嵌入式插件输出', 'workflow-dashboard.html'));
    expect(fs.readFileSync(result.outputPath, 'utf8')).toContain('项目工程工作台');
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
    const logDir = path.join(root, '00_Docs', '05_日志');
    fs.mkdirSync(logDir, { recursive: true });
    fs.writeFileSync(path.join(logDir, 'build.log'), 'initial content\n', 'utf8');
    const watcher = watchDashboard({ root, requestId, debounceMs: 20 });
    fs.writeFileSync(path.join(logDir, 'build.log'), 'changed content\n', 'utf8');
    await new Promise((resolve) => setTimeout(resolve, 120));

    expect(fs.readFileSync(path.join(root, '00_Docs', '06_嵌入式插件输出', 'workflow-dashboard.html'), 'utf8'))
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

    expect(fs.readFileSync(path.join(root, '00_Docs', '06_嵌入式插件输出', 'workflow-dashboard.html'), 'utf8')).toContain('更新后的架构');
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
    expect(result.stdout).toContain('00_Docs');
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
    fs.mkdirSync(path.join(root, '06_Toolchain'), { recursive: true });
    fs.writeFileSync(path.join(root, '06_Toolchain', 'main.c'), 'void main(void) { HAL_Init(); osKernelInitialize(); osKernelStart(); }\n', 'utf8');
    fs.mkdirSync(path.join(root, '01_App', 'app_boot', 'inc'), { recursive: true });
    fs.mkdirSync(path.join(root, '02_Service', 'service_log', 'src'), { recursive: true });

    const snapshot = readDashboardSnapshot({ root, requestId });
    const html = renderDashboardHtml(snapshot);

    expect(snapshot.architecture.sources.map((source) => source.path)).toContain('docs/architecture/overview.md');
    expect(snapshot.startup.sources.map((source) => source.path)).toContain('docs/startup/boot.md');
    expect(snapshot.git).toHaveProperty('available');
    expect(html).toContain('软件架构');
    expect(html).toContain('启动流程');
    expect(html).toContain('Git 管理');
    expect(html).toContain('AI 工作流与问题');
    expect(html).toContain('应用');
    expect(html).toContain('复位');
    expect(html).toContain('软件架构图');
    expect(html).toContain('启动流程图');
    expect(html).toContain('data-graph-node');
    expect(html).toContain('data-graph-detail');
    expect(html).toContain('data-startup-step');
    expect(html).toContain('data-startup-detail');
    expect(html).toContain('上电 / 复位');
    expect(html).toContain('osKernelStart()');
    expect(snapshot.startupCode.steps.map((step) => step.title)).toEqual(expect.arrayContaining(['HAL_Init()', 'osKernelInitialize()', 'osKernelStart()']));
    expect(html).toContain('工程目录已嵌入架构图');
    expect(html).toContain('data-graph-node="APP:01_App/app_boot"');
    expect(html).toContain('app_boot');
    expect(html).toContain('六层总览');
    expect(html).toContain('层内结构');
    expect(html).toContain('层间关系');
    expect(html).toContain('data-architecture-page-button');
    expect(html).toContain('data-architecture-page-panel="architecture-overview"');
    expect(html).toContain('data-architecture-page-panel="architecture-internal"');
    expect(html).toContain('data-architecture-page-panel="architecture-dependencies"');
    expect(html).toContain('六个大层级总览');
    expect(html).toContain('各层级内部结构');
    expect(html).toContain('大层级之间的架构关系');
    expect(snapshot.architectureTree.find((layer) => layer.id === 'APP').children[0].children[0].path).toBe('01_App/app_boot/inc');
  });

  test('renders Git as a project-change timeline with collapsed worktree details', () => {
    const snapshot = readDashboardSnapshot({ root, requestId });
    snapshot.git = {
      available: true,
      branch: 'codex/dashboard',
      head: 'abc1234',
      status: { staged: ['src/a.c'], unstaged: ['src/b.c'], untracked: ['docs/note.md'] },
      commits: [{ shortHash: 'abc1234', subject: '调整日志展示', author: 'TNSH', date: '2026-08-20T10:00:00+08:00' }],
      diffStat: 'src/b.c | 4 ++--',
      stagedDiffStat: 'src/a.c | 2 ++',
    };
    snapshot.adjustments = [
      { time: '2026-08-20T10:00:00+08:00', kind: 'git', label: 'Git 提交', detail: 'abc1234 · 调整日志展示' },
      { time: '2026-08-20T09:00:00+08:00', kind: 'workflow', label: '任务完成', detail: 'REQ-DASHBOARD-TEST · T-001' },
    ];
    const html = renderDashboardHtml(snapshot);

    expect(html).toContain('项目变化时间线');
    expect(html).toContain('codex/dashboard');
    expect(html).toContain('abc1234');
    expect(html).toContain('工作区变更（3 个文件）');
    expect(html).toContain('<details class="panel"><summary>查看 Diff 摘要</summary>');
    expect(html).not.toContain('<h3>最近提交</h3>');
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
    expect(html).toContain('未找到明确的软件架构设计资料');
  });

  test('reads the project feature catalog and read-only debug logs', () => {
    fs.writeFileSync(path.join(docsDir, '项目功能清单.md'), [
      '# 功能清单', '',
      '| 功能ID | 功能名称 | 功能描述 | 所属层 | 关联REQ |',
      '|---|---|---|---|---|',
      '| F-001 | 温湿度采集 | 采集传感器数据 | Service | REQ-DASHBOARD-TEST |', '',
    ].join('\n'), 'utf8');
    const logDir = path.join(root, '00_Docs', '05_日志');
    fs.mkdirSync(logDir, { recursive: true });
    fs.writeFileSync(path.join(logDir, 'build.log'), 'build ok\nwarning: sample\n', 'utf8');
    fs.writeFileSync(path.join(logDir, 'registers.txt'), 'CFSR=0x00000000\n', 'utf8');

    const snapshot = readDashboardSnapshot({ root, requestId });
    const html = renderDashboardHtml(snapshot);

    expect(snapshot.featureCatalog).toMatchObject({ available: true, counts: { completed: 0, inProgress: 1, pending: 0 } });
    expect(snapshot.featureCatalog.features[0]).toMatchObject({ name: '温湿度采集', status: 'inProgress', requestIds: [requestId] });
    expect(snapshot.logs).toMatchObject({ available: true });
    expect(snapshot.logs.files.map((file) => file.name)).toEqual(expect.arrayContaining(['build.log', 'registers.txt']));
    expect(snapshot.build.buildLog.name).toBe('build.log');
    expect(html).toContain('温湿度采集');
    expect(html).toContain('构建日志');
    expect(html).toContain('寄存器快照');
    expect(html).not.toContain('"task_id":"T-002"');
  });

  test('parses runtime resource samples only from the explicit log format', () => {
    const logDir = path.join(root, '00_Docs', '05_日志');
    fs.mkdirSync(logDir, { recursive: true });
    fs.writeFileSync(path.join(logDir, 'serial.log'), [
      'MCUWB_RUNTIME heap_free_bytes=12000 heap_min_free_bytes=8000 cpu_percent=17',
      'MCUWB_TASK name=defaultTask stack_high_water_words=64 cpu_percent=4 state=Running',
      'ordinary free_heap=999 should_not_be_parsed',
      '',
    ].join('\n'), 'utf8');

    const snapshot = readDashboardSnapshot({ root, requestId });
    const html = renderDashboardHtml(snapshot);

    expect(snapshot.resources.runtime).toMatchObject({
      confidence: 'confirmed',
      heapFreeBytes: 12000,
      heapMinimumFreeBytes: 8000,
      cpuPercent: 17,
      sampleCount: 2,
    });
    expect(snapshot.resources.runtime.tasks).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'defaultTask', stackHighWaterWords: 64, cpuPercent: 4, state: 'Running' }),
    ]));
    expect(html).toContain('目标板运行时资源状态');
    expect(html).toContain('11.7 KB');
  });

  test('splits the resource page into switchable sub-pages', () => {
    const snapshot = readDashboardSnapshot({ root, requestId });
    const html = renderDashboardHtml(snapshot);

    expect(html).toContain('资源总览');
    expect(html).toContain('器件与接口');
    expect(html).toContain('冲突检查');
    expect(html).toContain('内存与运行时');
    expect(html).toContain('data-resource-page-button');
    expect(html).toContain('data-resource-page-panel="resource-summary"');
    expect(html).toContain('data-resource-page-panel="resource-hardware"');
    expect(html).toContain('data-resource-page-panel="resource-conflicts"');
    expect(html).toContain('data-resource-page-panel="resource-runtime"');
    expect(html).toContain('resource-page-panel is-active');
  });

  test('extracts hardware interfaces, pins, and resources from CubeMX evidence', () => {
    const cubeRoot = path.join(root, '06_Toolchain', 'cubemx', 'demo');
    const docsRoot = path.join(root, '00_Docs', '01_资源分配表');
    fs.mkdirSync(path.join(cubeRoot, 'Core', 'Inc'), { recursive: true });
    fs.mkdirSync(path.join(cubeRoot, 'Core', 'Src'), { recursive: true });
    fs.mkdirSync(docsRoot, { recursive: true });
    fs.writeFileSync(path.join(cubeRoot, 'demo.ioc'), [
      'Mcu.Name=STM32F411C(C-E)Ux',
      'Mcu.Package=UFQFPN48',
      'Mcu.IP0=I2C1',
      'ProjectManager.TargetToolchain=CMake',
      'PB6.Mode=I2C',
      'PB6.Signal=I2C1_SCL',
      'PB7.Mode=I2C',
      'PB7.Signal=I2C1_SDA',
      'Dma.Request0=I2C1_RX',
      'Dma.I2C1_RX.0.Instance=DMA1_Stream0',
      'Dma.I2C1_RX.0.Direction=DMA_PERIPH_TO_MEMORY',
      'ProjectManager.functionlistsort=1-MX_I2C1_Init-I2C1-false',
      '',
    ].join('\n'), 'utf8');
    fs.writeFileSync(path.join(cubeRoot, 'Core', 'Inc', 'main.h'), [
      '#define SENSOR_SCL_Pin GPIO_PIN_6',
      '#define SENSOR_SCL_GPIO_Port GPIOB',
      '',
    ].join('\n'), 'utf8');
    fs.writeFileSync(path.join(docsRoot, '总线资源分配表.md'), [
      '| 逻辑能力 | STM32/CubeMX 实例 | 引脚 | 配置 | 当前绑定 | 状态 |',
      '|---|---|---|---|---|---|',
      '| I2C1 | I2C1 | PB6=SCL、PB7=SDA | 地址由设备传入 | 传感器总线 | confirmed |',
      '',
    ].join('\n'), 'utf8');

    const snapshot = readDashboardSnapshot({ root, requestId });
    const html = renderDashboardHtml(snapshot);

    expect(snapshot.resources.interfaces).toEqual(expect.arrayContaining([
      expect.objectContaining({ interface: 'I2C1', pins: 'PB6=SCL、PB7=SDA' }),
    ]));
    expect(snapshot.resources.pins).toEqual(expect.arrayContaining([
      expect.objectContaining({ pin: 'PB6', signal: 'I2C1_SCL', label: 'SENSOR_SCL' }),
    ]));
    expect(snapshot.resources.hardwareResources).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'DMA1_Stream0', kind: 'DMA' }),
    ]));
    expect(html).toContain('硬件接口 → 引脚');
    expect(html).toContain('data-hardware-item');
    expect(html).toContain('I2C1');
    expect(html).toContain('PB6=SCL、PB7=SDA');
  });

  test('extracts confirmed device to bus attachment evidence when board instances exist', () => {
    const boardRoot = path.join(root, '04_Impl', 'impl_board');
    fs.mkdirSync(path.join(boardRoot, 'inc'), { recursive: true });
    fs.mkdirSync(path.join(boardRoot, 'src'), { recursive: true });
    fs.writeFileSync(path.join(boardRoot, 'inc', 'board_busmap.h'), [
      'typedef struct { int device_id; const char *name; int bus_id; int device_address; int chip_select_pin_id; int reset_pin_id; int irq_id; int power_domain_id; } board_bus_attachment_t;',
      'extern const board_bus_attachment_t g_board_bus_attachments[];',
      '',
    ].join('\n'), 'utf8');
    fs.writeFileSync(path.join(boardRoot, 'src', 'impl_board_resource.c'), [
      'const board_bus_capability_t g_board_busmap[] = {',
      '    {1, "I2C1", 400000, 8, BOARD_BUS_MODE_NONE, 0},',
      '};',
      'const board_bus_attachment_t g_board_bus_attachments[] = {',
      '    {1, "AHT21", 1, 0x38u, BOARD_BUS_PIN_NONE, BOARD_BUS_PIN_NONE, BOARD_BUS_IRQ_NONE, BOARD_BUS_POWER_NONE},',
      '};',
      '',
    ].join('\n'), 'utf8');

    const snapshot = readDashboardSnapshot({ root, requestId });
    const html = renderDashboardHtml(snapshot);

    expect(snapshot.resources.boardAttachments).toEqual(expect.objectContaining({ status: 'confirmed' }));
    expect(snapshot.resources.boardAttachments.attachments).toEqual(expect.arrayContaining([
      expect.objectContaining({ device: 'AHT21', bus: 'I2C1', address: '0x38', status: 'confirmed' }),
    ]));
    expect(html).toContain('器件级板级挂接');
    expect(html).toContain('AHT21');
    expect(html).toContain('0x38');
  });

  test('reports static pin and DMA conflicts in the resource page', () => {
    const cubeRoot = path.join(root, '06_Toolchain', 'cubemx', 'demo');
    const docsRoot = path.join(root, '00_Docs', '01_资源分配表');
    fs.mkdirSync(cubeRoot, { recursive: true });
    fs.mkdirSync(docsRoot, { recursive: true });
    fs.writeFileSync(path.join(cubeRoot, 'demo.ioc'), [
      'Mcu.Name=STM32F411C(C-E)Ux',
      'Mcu.IP0=I2C1',
      'PB6.Mode=I2C',
      'PB6.Signal=I2C1_SCL',
      'Dma.I2C1_RX.0.Instance=DMA1_Stream0',
      'Dma.I2C1_RX.0.Direction=DMA_PERIPH_TO_MEMORY',
      'Dma.SPI1_TX.0.Instance=DMA1_Stream0',
      'Dma.SPI1_TX.0.Direction=DMA_MEMORY_TO_PERIPH',
      '',
    ].join('\n'), 'utf8');
    fs.writeFileSync(path.join(docsRoot, '总线资源分配表.md'), [
      '| 逻辑能力 | STM32/CubeMX 实例 | 引脚 | 配置 | 当前绑定 | 状态 |',
      '|---|---|---|---|---|---|',
      '| I2C1 | I2C1 | PB6=SCL | - | 传感器 | confirmed |',
      '| SPI1 | SPI1 | PB6=SCK | - | 显示 | confirmed |',
      '',
    ].join('\n'), 'utf8');

    const snapshot = readDashboardSnapshot({ root, requestId });
    const html = renderDashboardHtml(snapshot);

    expect(snapshot.resources.conflicts.status).toBe('error');
    expect(snapshot.resources.conflicts.conflicts).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: '总线引脚冲突', resource: 'PB6' }),
      expect.objectContaining({ category: '重复占用', resource: 'DMA 实例 DMA1_Stream0' }),
    ]));
    expect(html).toContain('资源冲突检查');
    expect(html).toContain('发现错误');
  });

  test('extracts Flash, RAM, heap, and stack evidence from build outputs', () => {
    const buildDir = path.join(root, 'build', 'debug');
    const toolchainDir = path.join(root, '06_Toolchain');
    fs.mkdirSync(buildDir, { recursive: true });
    fs.mkdirSync(toolchainDir, { recursive: true });
    fs.writeFileSync(path.join(buildDir, 'firmware.map'), [
      'Memory Configuration',
      'RAM              0x20000000         0x00020000         xrw',
      'FLASH            0x08000000         0x00080000         xr',
      '',
      'Linker script and memory map',
      '.isr_vector      0x08000000        0x100',
      '.text            0x08000100        0x2000',
      '.rodata          0x08002100        0x80',
      '.data            0x20000000        0x20 load address 0x08002180',
      '.bss             0x20000020        0x300',
      '._user_heap_stack 0x20000320      0xc00',
      '',
    ].join('\n'), 'utf8');
    fs.writeFileSync(path.join(toolchainDir, 'test.ld'), [
      '_Min_Heap_Size = 0x400;',
      '_Min_Stack_Size = 0x800;',
      '',
    ].join('\n'), 'utf8');
    fs.writeFileSync(path.join(toolchainDir, 'FreeRTOSConfig.h'), [
      '#define configMINIMAL_STACK_SIZE ((uint16_t)128)',
      '#define configTOTAL_HEAP_SIZE ((size_t)15360)',
      '#define configTIMER_TASK_STACK_DEPTH 256',
      '#define INCLUDE_uxTaskGetStackHighWaterMark 1',
      '',
    ].join('\n'), 'utf8');

    const snapshot = readDashboardSnapshot({ root, requestId });
    const html = renderDashboardHtml(snapshot);

    expect(snapshot.resources.memory).toMatchObject({
      available: true,
      flash: expect.objectContaining({ capacity: 0x80000, used: 0x21a0 }),
      ram: expect.objectContaining({ capacity: 0x20000, used: 0x320, reserved: 0xf20 }),
      heap: expect.objectContaining({ freertosBytes: 15360, linkerBytes: 1024 }),
      stack: expect.objectContaining({ linkerBytes: 2048, minimalTaskBytes: 512, timerTaskBytes: 1024, highWaterMarkAvailable: true }),
    });
    expect(html).toContain('Flash / RAM 占用');
    expect(html).toContain('FreeRTOS 动态堆');
    expect(html).toContain('链接器主栈');
    expect(html).toContain('运行时空闲堆');
  });
});
