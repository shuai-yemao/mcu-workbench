const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'validate-workflow-gate.js');
const REQUEST_ID = 'REQ-GATE-FIXTURE-20260819';

const {
  createWorkflowState,
  getWorkflowStatePaths,
  writeWorkflowState,
} = require('../lib/workflow-state');

function writeFile(root, relativePath, content) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
}

function createFixture({
  specStatus = 'approved-for-task-execution',
  specReviewStatus = 'approved',
  planReviewStatus = 'approved',
  selectedPlan = '方案 A',
  planDecisionOwner = 'user',
  taskStatus = 'ready-for-execution',
  previousTaskStatus = 'pass',
  taskId = 'T-001',
  includeState = true,
  stateRequestId = REQUEST_ID,
  verifyStatus = 'pending',
  taskIdHeader = 'ID',
} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcu-workbench-gate-'));
  const documents = path.join('00_Docs', '04_需求文档');

  if (includeState) {
    const state = createWorkflowState({
      requestId: stateRequestId,
      projectRoot: root,
      specVersion: 'v1.0',
      planVersion: 'v1.0',
      taskVersion: 'v1.0',
    });
    state.user_gates.spec = specReviewStatus;
    state.user_gates.plan = planReviewStatus;
    state.verify_summary.status = verifyStatus;
    const statePaths = getWorkflowStatePaths(root, REQUEST_ID);
    writeWorkflowState(statePaths.statePath, state);
  }

  writeFile(root, path.join(documents, 'spec.md'), [
    '# Spec',
    '',
    `| request_id | \`${REQUEST_ID}\` |`,
    '| Spec 版本 | `v1.0` |',
    '| Spec 状态 | `' + specStatus + '` |',
    '| 用户审查状态 | `' + specReviewStatus + '` |',
    ''
  ].join('\n'));
  writeFile(root, path.join(documents, 'plan.md'), [
    '# Plan',
    '',
    `| request_id | \`${REQUEST_ID}\` |`,
    '| 计划版本 | `v1.0` |',
    '| 计划状态 | `approved-for-task-execution` |',
    '| 用户审查状态 | `' + planReviewStatus + '` |',
    '| 选定方案 | `' + selectedPlan + '` |',
    '| 方案选择人 | `' + planDecisionOwner + '` |',
    ''
  ].join('\n'));
  writeFile(root, path.join(documents, 'task.md'), [
    '# Task',
    '',
    `| request_id | \`${REQUEST_ID}\` |`,
    '| 任务清单版本 | `v1.0` |',
    '| 状态 | `' + taskStatus + '` |',
    '',
    `| ${taskIdHeader} | 任务 | 主实现 Skill | 前置 | 状态 | 主要产物 |`,
    '|---|---|---|---|---|---|',
    `| ${taskId} | 入口 | workflow-requirements-router | T-000 | ${previousTaskStatus} | docs |`,
    ''
  ].join('\n'));

  return root;
}

function runGate(root) {
  const result = spawnSync(process.execPath, [SCRIPT, '--root', root, '--json', '--strict'], {
    cwd: ROOT,
    encoding: 'utf8'
  });

  return {
    code: result.status,
    report: JSON.parse(result.stdout),
    stderr: result.stderr
  };
}

afterEach(() => {
  for (const entry of fs.readdirSync(os.tmpdir())
    .filter((name) => name.startsWith('mcu-workbench-gate-'))) {
    fs.rmSync(path.join(os.tmpdir(), entry), { recursive: true, force: true });
  }
});

describe('validate-workflow-gate', () => {
  test('passes a complete workflow chain without internal Markdown artifacts', () => {
    const result = runGate(createFixture());

    expect(result.code).toBe(0);
    expect(result.report).toMatchObject({
      status: 'pass',
      request_id: REQUEST_ID,
      evidence_level: 'static',
      missing_items: [],
      blocking_reasons: []
    });
  });

  test('blocks when the internal workflow state is missing', () => {
    const result = runGate(createFixture({ includeState: false }));

    expect(result.code).toBe(2);
    expect(result.report.status).toBe('blocked');
    expect(result.report.missing_items.join('\n')).toContain('state.json');
  });

  test('blocks a non-approved Spec status', () => {
    const result = runGate(createFixture({ specStatus: 'review-blocked' }));

    expect(result.code).toBe(2);
    expect(result.report.blocking_reasons.join('\n')).toContain('Spec 状态未放行');
  });

  test('blocks when the user has not approved the Spec gate', () => {
    const result = runGate(createFixture({ specReviewStatus: 'awaiting_user_review' }));

    expect(result.code).toBe(2);
    expect(result.report.blocking_reasons.join('\n')).toContain('用户 Spec 闸门未批准');
  });

  test('blocks when the user has not approved or selected the Plan', () => {
    const result = runGate(createFixture({
      planReviewStatus: 'awaiting_user_review',
      selectedPlan: 'none',
    }));

    expect(result.code).toBe(2);
    expect(result.report.blocking_reasons.join('\n')).toContain('用户 Plan 闸门未批准');
    expect(result.report.blocking_reasons.join('\n')).toContain('H-03 缺少用户选择的实施方案');
  });

  test('blocks a request ID mismatch in the internal state', () => {
    const result = runGate(createFixture({ stateRequestId: 'REQ-OTHER' }));

    expect(result.code).toBe(2);
    expect(result.report.blocking_reasons.join('\n')).toContain('内部 Workflow State 无效');
  });

  test('blocks when the first task is not complete', () => {
    const result = runGate(createFixture({ previousTaskStatus: 'pending' }));

    expect(result.code).toBe(2);
    expect(result.report.blocking_reasons.join('\n')).toContain('首个任务被阻塞或未就绪');
  });

  test('accepts three-digit task identifiers for automatic execution', () => {
    const result = runGate(createFixture({
      taskId: 'T-001',
      taskStatus: 'ready-for-auto-execution',
      previousTaskStatus: 'ready',
    }));

    expect(result.code).toBe(0);
    expect(result.report.status).toBe('pass');
  });

  test('accepts the task_id header used by the formal task document', () => {
    const result = runGate(createFixture({ taskIdHeader: 'task_id' }));

    expect(result.code).toBe(0);
    expect(result.report.status).toBe('pass');
  });

  test('blocks when final Verify requires a Spec revision', () => {
    const result = runGate(createFixture({ verifyStatus: 'spec_revision_required' }));

    expect(result.code).toBe(2);
    expect(result.report.blocking_reasons.join('\n')).toContain('最终 Verify 要求回到 Spec');
  });

  test('reports invalid input for a missing project root', () => {
    const result = runGate(path.join(ROOT, 'tests', '.missing-gate-root'));

    expect(result.code).toBe(3);
    expect(result.report).toMatchObject({
      status: 'invalid-input',
      evidence_level: 'static'
    });
  });

  test('keeps the package command available without manifest hooks', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, '.codex-plugin', 'plugin.json'), 'utf8'));

    expect(packageJson.scripts['validate:workflow-gate']).toBe('node scripts/validate-workflow-gate.js');
    expect(manifest).not.toHaveProperty('hooks');
    expect(manifest).not.toHaveProperty('mcpServers');
  });
});
