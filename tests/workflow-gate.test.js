const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'validate-workflow-gate.js');
const REQUEST_ID = 'REQ-GATE-FIXTURE-20260819';

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
  taskId = 'T-01',
  rcpRequestId = REQUEST_ID,
  includeRcp = true,
} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcu-workbench-gate-'));
  const documents = path.join('00_Docs', '04_需求文档');
  const rcpName = `${REQUEST_ID}-RCP.md`;
  const reviewPackageName = `${REQUEST_ID}-Review-Package.md`;

  if (includeRcp) {
    writeFile(root, path.join(documents, rcpName), `| request_id | \`${rcpRequestId}\` |\n| 工作流状态 | \`可交接\` |\n`);
  }
  writeFile(root, path.join(documents, reviewPackageName), `| request_id | \`${REQUEST_ID}\` |\n| 审查状态 | \`可交接\` |\n`);
  writeFile(root, path.join(documents, 'spec.md'), [
    '# Spec',
    '',
    `| request_id | \`${REQUEST_ID}\` |`,
    '| Spec 状态 | `' + specStatus + '` |',
    '| 用户审查状态 | `' + specReviewStatus + '` |',
    `| 输入 RCP | \`${rcpName}\` |`,
    `| Review-Package | \`${reviewPackageName}\` |`,
    ''
  ].join('\n'));
  writeFile(root, path.join(documents, 'plan.md'), [
    '# Plan',
    '',
    `| request_id | \`${REQUEST_ID}\` |`,
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
    '| task 状态 | `' + taskStatus + '` |',
    '',
    '| ID | 任务 | 主实现 Skill | 前置 | 状态 | 主要产物 |',
    '|---|---|---|---|---|---|',
    `| ${taskId} | 入口 | workflow-requirements-router | T-00 | ${previousTaskStatus} | docs |`,
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
  test('passes a complete and consistent workflow chain', () => {
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

  test('blocks when the RCP is missing', () => {
    const result = runGate(createFixture({ includeRcp: false }));

    expect(result.code).toBe(2);
    expect(result.report.status).toBe('blocked');
    expect(result.report.missing_items.join('\n')).toContain('-RCP.md');
  });

  test('blocks a non-approved Spec status', () => {
    const result = runGate(createFixture({ specStatus: 'review-blocked' }));

    expect(result.code).toBe(2);
    expect(result.report.blocking_reasons.join('\n')).toContain('Spec 状态未放行');
  });

  test('blocks when the user has not approved the Spec gate', () => {
    const result = runGate(createFixture({ specReviewStatus: 'awaiting_user_review' }));

    expect(result.code).toBe(2);
    expect(result.report.blocking_reasons.join('\n')).toContain('用户闸门 H-02 未批准');
  });

  test('blocks when the user has not approved or selected the Plan', () => {
    const result = runGate(createFixture({
      planReviewStatus: 'awaiting_user_review',
      selectedPlan: 'none',
    }));

    expect(result.code).toBe(2);
    expect(result.report.blocking_reasons.join('\n')).toContain('用户闸门 H-03 未批准');
    expect(result.report.blocking_reasons.join('\n')).toContain('H-03 缺少用户选择的实施方案');
  });

  test('blocks a request ID mismatch across workflow documents', () => {
    const result = runGate(createFixture({ rcpRequestId: 'REQ-OTHER' }));

    expect(result.code).toBe(2);
    expect(result.report.blocking_reasons.join('\n')).toContain('RCP request_id 不一致');
  });

  test('blocks when the previous task is not complete', () => {
    const result = runGate(createFixture({ previousTaskStatus: 'pending' }));

    expect(result.code).toBe(2);
    expect(result.report.blocking_reasons.join('\n')).toContain('前置任务 T-01 未完成');
  });

  test('accepts the current three-digit task identifiers for automatic execution', () => {
    const result = runGate(createFixture({
      taskId: 'T-001',
      taskStatus: 'ready-for-auto-execution',
      previousTaskStatus: 'ready',
    }));

    expect(result.code).toBe(0);
    expect(result.report.status).toBe('pass');
  });

  test('reports invalid input for a missing project root', () => {
    const result = runGate(path.join(ROOT, 'tests', '.missing-gate-root'));

    expect(result.code).toBe(3);
    expect(result.report).toMatchObject({
      status: 'invalid-input',
      evidence_level: 'static'
    });
  });

  test('keeps the package command available without changing the plugin manifest', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, '.codex-plugin', 'plugin.json'), 'utf8'));

    expect(packageJson.scripts['validate:workflow-gate']).toBe('node scripts/validate-workflow-gate.js');
    expect(manifest).not.toHaveProperty('hooks');
    expect(manifest).not.toHaveProperty('mcpServers');
  });
});
