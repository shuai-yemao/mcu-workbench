'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  getWorkflowStatePaths,
  readWorkflowState,
} = require('../lib/workflow-state');

const EXIT_CODES = {
  PASS: 0,
  TOOL_ERROR: 1,
  BLOCKED: 2,
  INVALID_INPUT: 3,
};

const APPROVED_SPEC_STATUSES = new Set([
  'approved-for-integration-plan',
  'approved-for-task-execution',
  'approved-for-implementation',
  'approved-for-delivery',
]);

const APPROVED_REVIEW_STATUSES = new Set([
  'approved',
  'user-approved',
  '已批准',
  '通过',
]);

function parseArgs(argv) {
  const options = {
    json: false,
    strict: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--json') {
      options.json = true;
      continue;
    }

    if (argument === '--strict') {
      options.strict = true;
      continue;
    }

    if (argument === '--root') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--root requires a project path');
      }
      options.root = path.resolve(value);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  if (!options.root) {
    throw new Error('--root is required');
  }

  return options;
}

function readText(filePath, checkedFiles) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  checkedFiles.push(filePath);
  return fs.readFileSync(filePath, 'utf8');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readMarkdownField(text, fieldName) {
  const pattern = new RegExp(
    `^\\|\\s*${escapeRegExp(fieldName)}\\s*\\|\\s*([^|]+?)\\s*\\|\\s*$`,
    'm',
  );
  const match = text.match(pattern);
  return match ? match[1].trim().replace(/^`|`$/g, '') : null;
}

function readRequestId(text) {
  return readMarkdownField(text, 'request_id');
}

function resolveDocumentPath(documentsDir, value) {
  if (!value) {
    return null;
  }

  const fileName = value.replace(/^.*[\\/]/, '');
  return path.resolve(documentsDir, fileName);
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim().replace(/^`|`$/g, ''));
}

function findTaskTable(text) {
  const lines = text.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => {
    const cells = splitTableRow(line);
    return cells.some((cell) => cell === 'ID' || cell === 'task_id')
      && cells.some((cell) => cell === '状态');
  });

  if (headerIndex < 0) return null;

  const headers = splitTableRow(lines[headerIndex]);
  const idIndex = headers.findIndex((cell) => cell === 'ID' || cell === 'task_id');
  const statusIndex = headers.indexOf('状态');
  const rows = [];
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    if (!lines[index].trim().startsWith('|')) break;
    const cells = splitTableRow(lines[index]);
    if (/^T-\d+$/.test(cells[idIndex] || '')) {
      rows.push({ id: cells[idIndex], status: cells[statusIndex] || null, cells });
    }
  }

  return { rows };
}

function readTaskRow(text, taskId) {
  const table = findTaskTable(text);
  return table ? table.rows.find((row) => row.id === taskId) || null : null;
}

function readFirstTaskRow(text) {
  const table = findTaskTable(text);
  return table && table.rows.length > 0 ? table.rows[0] : null;
}

function addMissing(result, item) {
  if (!result.missing_items.includes(item)) {
    result.missing_items.push(item);
  }
}

function addBlock(result, reason) {
  if (!result.blocking_reasons.includes(reason)) {
    result.blocking_reasons.push(reason);
  }
}

function validate(options) {
  const documentsDir = path.join(options.root, '00_Docs', '04_需求文档');
  const checkedFiles = [];
  const result = {
    status: 'pass',
    request_id: null,
    stage: 'workflow-gate',
    checked_files: checkedFiles,
    missing_items: [],
    blocking_reasons: [],
    evidence_level: 'static',
    next_action: '可以继续当前已放行的工作流阶段。',
  };

  if (!fs.existsSync(options.root) || !fs.statSync(options.root).isDirectory()) {
    return {
      ...result,
      status: 'invalid-input',
      next_action: '提供存在的项目根目录。',
      blocking_reasons: [`项目根目录不存在：${options.root}`],
    };
  }

  const specPath = path.join(documentsDir, 'spec.md');
  const planPath = path.join(documentsDir, 'plan.md');
  const taskPath = path.join(documentsDir, 'task.md');
  const specText = readText(specPath, checkedFiles);
  const planText = readText(planPath, checkedFiles);
  const taskText = readText(taskPath, checkedFiles);

  if (!specText) addMissing(result, specPath);
  if (!planText) addMissing(result, planPath);
  if (!taskText) addMissing(result, taskPath);

  if (result.missing_items.length > 0) {
    addBlock(result, 'RCP/Spec/Plan/Task 入口文件不完整。');
  }

  if (!specText) {
    return finalize(result, options);
  }

  result.request_id = readRequestId(specText);
  if (!result.request_id) {
    addBlock(result, 'spec.md 缺少 request_id。');
  }

  const statePaths = getWorkflowStatePaths(options.root, result.request_id);
  let workflowState = null;
  if (!fs.existsSync(statePaths.statePath)) {
    addMissing(result, statePaths.statePath);
  } else {
    checkedFiles.push(statePaths.statePath);
    try {
      workflowState = readWorkflowState(statePaths.statePath, {
        expectedRequestId: result.request_id,
      });
    } catch (error) {
      addBlock(result, `内部 Workflow State 无效：${error.message}`);
    }
  }

  const specStatus = readMarkdownField(specText, 'Spec 状态');
  const planStatus = planText ? readMarkdownField(planText, '计划状态') : null;
  const taskStatus = taskText
    ? readMarkdownField(taskText, 'task 状态') || readMarkdownField(taskText, '状态')
    : null;
  const specReviewStatus = readMarkdownField(specText, '用户审查状态');
  const planReviewStatus = planText ? readMarkdownField(planText, '用户审查状态') : null;
  const selectedPlan = planText ? readMarkdownField(planText, '选定方案') : null;
  const planDecisionOwner = planText ? readMarkdownField(planText, '方案选择人') : null;
  const specVersion = readMarkdownField(specText, 'Spec 版本');
  const planVersion = planText ? readMarkdownField(planText, '计划版本') : null;
  const taskVersion = taskText
    ? readMarkdownField(taskText, '任务清单版本') || readMarkdownField(taskText, 'task 版本')
    : null;

  if (specStatus && !APPROVED_SPEC_STATUSES.has(specStatus)) {
    addBlock(result, `Spec 状态未放行：${specStatus}`);
  }
  if (!planStatus || !/approved-for-(task-breakdown|task-execution|delivery)/.test(planStatus)) {
    addBlock(result, `Plan 状态未放行：${planStatus || 'missing'}`);
  }
  if (!taskStatus || /blocked|fail/i.test(taskStatus)) {
    addBlock(result, `Task 状态阻塞或缺失：${taskStatus || 'missing'}`);
  }
  const stateSpecGate = workflowState?.user_gates?.spec;
  const statePlanGate = workflowState?.user_gates?.plan;
  if (!APPROVED_REVIEW_STATUSES.has(specReviewStatus || '')
    && !APPROVED_REVIEW_STATUSES.has(stateSpecGate || '')) {
    addBlock(result, `用户 Spec 闸门未批准：${specReviewStatus || stateSpecGate || 'missing'}`);
  }
  if (!APPROVED_REVIEW_STATUSES.has(planReviewStatus || '')
    && !APPROVED_REVIEW_STATUSES.has(statePlanGate || '')) {
    addBlock(result, `用户 Plan 闸门未批准：${planReviewStatus || statePlanGate || 'missing'}`);
  }
  if (!selectedPlan || /^none$/i.test(selectedPlan)) {
    addBlock(result, 'H-03 缺少用户选择的实施方案。');
  }
  if (planDecisionOwner && planDecisionOwner !== 'user') {
    addBlock(result, `H-03 方案选择人不是 user：${planDecisionOwner}`);
  }
  if (workflowState?.verify_summary?.status === 'spec_revision_required') {
    addBlock(result, '最终 Verify 要求回到 Spec，当前 Plan/Task 不得继续。');
  }
  if (workflowState && specVersion && workflowState.spec_version !== specVersion) {
    addBlock(result, `内部状态 Spec 版本不一致：${workflowState.spec_version}`);
  }
  if (workflowState && planVersion && workflowState.plan_version !== planVersion) {
    addBlock(result, `内部状态 Plan 版本不一致：${workflowState.plan_version}`);
  }
  if (workflowState && taskVersion && workflowState.task_version !== taskVersion) {
    addBlock(result, `内部状态 Task 版本不一致：${workflowState.task_version}`);
  }

  const documents = [
    {name: 'Spec', text: specText},
    {name: 'Plan', text: planText},
    {name: 'Task', text: taskText},
  ];
  for (const document of documents) {
    if (!document.text) continue;
    const requestId = readRequestId(document.text);
    if (!requestId) {
      addBlock(result, `${document.name} 缺少 request_id。`);
    } else if (result.request_id && requestId !== result.request_id) {
      addBlock(result, `${document.name} request_id 不一致：${requestId}`);
    }
  }

  if (taskText) {
    const firstTask = readFirstTaskRow(taskText);
    if (!firstTask) {
      addBlock(result, 'Task 缺少可执行任务表。');
    } else if (!/pass|ready|completed|in_progress|执行中/i.test(firstTask.status || '')) {
      addBlock(result, `首个任务被阻塞或未就绪：${firstTask.id}=${firstTask.status}`);
    }
  }

  if (options.strict && /unverified.*宿主|宿主.*unverified/i.test(specText)) {
    result.next_action = '静态 Gate 已通过；真实 Codex 宿主证据仍需单独执行，不得由本结果替代。';
  }

  return finalize(result, options);
}

function finalize(result, options) {
  if (result.missing_items.length > 0 || result.blocking_reasons.length > 0) {
    result.status = 'blocked';
    result.next_action = '停止实现，补齐内部状态或回到 Spec/Review Gate。';
  }

  if (options.json) {
    return result;
  }

  return result;
}

function printResult(result, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write(`status: ${result.status}\n`);
  process.stdout.write(`request_id: ${result.request_id || 'missing'}\n`);
  process.stdout.write(`stage: ${result.stage}\n`);
  process.stdout.write(`evidence_level: ${result.evidence_level}\n`);
  if (result.missing_items.length > 0) {
    process.stdout.write(`missing_items: ${result.missing_items.join('; ')}\n`);
  }
  if (result.blocking_reasons.length > 0) {
    process.stdout.write(`blocking_reasons: ${result.blocking_reasons.join('; ')}\n`);
  }
  process.stdout.write(`next_action: ${result.next_action}\n`);
}

function exitCodeFor(status) {
  if (status === 'pass') return EXIT_CODES.PASS;
  if (status === 'blocked') return EXIT_CODES.BLOCKED;
  return EXIT_CODES.INVALID_INPUT;
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`invalid-input: ${error.message}\n`);
    process.exitCode = EXIT_CODES.INVALID_INPUT;
    return;
  }

  try {
    const result = validate(options);
    printResult(result, options.json);
    process.exitCode = exitCodeFor(result.status);
  } catch (error) {
    if (options.json) {
      process.stdout.write(`${JSON.stringify({
        status: 'tool-error',
        stage: 'workflow-gate',
        evidence_level: 'static',
        blocking_reasons: [error.message],
      }, null, 2)}\n`);
    } else {
      process.stderr.write(`tool-error: ${error.stack || error.message}\n`);
    }
    process.exitCode = EXIT_CODES.TOOL_ERROR;
  }
}

main();
