'use strict';

const fs = require('node:fs');
const path = require('node:path');

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

function readTaskRow(text, taskId) {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.includes(`| ${taskId} |`)) {
      continue;
    }

    const cells = splitTableRow(line);
    if (cells[0] === taskId) {
      return {
        id: cells[0],
        status: cells[4] || null,
        cells,
      };
    }
  }

  return null;
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

  const rcpPath = resolveDocumentPath(
    documentsDir,
    readMarkdownField(specText, '输入 RCP'),
  );
  const reviewPackagePath = resolveDocumentPath(
    documentsDir,
    readMarkdownField(specText, 'Review-Package'),
  );
  const rcpText = rcpPath ? readText(rcpPath, checkedFiles) : null;
  const reviewPackageText = reviewPackagePath
    ? readText(reviewPackagePath, checkedFiles)
    : null;

  if (!rcpText) addMissing(result, rcpPath || 'Spec 输入 RCP');
  if (!reviewPackageText) {
    addMissing(result, reviewPackagePath || 'Spec Review-Package');
  }

  const specStatus = readMarkdownField(specText, 'Spec 状态');
  const planStatus = planText ? readMarkdownField(planText, '计划状态') : null;
  const taskStatus = taskText ? readMarkdownField(taskText, 'task 状态') : null;
  const reviewStatus = reviewPackageText
    ? readMarkdownField(reviewPackageText, '审查状态')
    : null;
  const rcpWorkflowStatus = rcpText
    ? readMarkdownField(rcpText, '工作流状态')
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
  if (reviewStatus && !/可交接|approved|pass/i.test(reviewStatus)) {
    addBlock(result, `Review-Package 未完成交接：${reviewStatus}`);
  }
  if (rcpWorkflowStatus && !/可交接|approved|pass/i.test(rcpWorkflowStatus)) {
    addBlock(result, `RCP 未完成交接：${rcpWorkflowStatus}`);
  }

  const documents = [
    {name: 'RCP', text: rcpText},
    {name: 'Review-Package', text: reviewPackageText},
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
    const t01 = readTaskRow(taskText, 'T-01');
    if (!t01 || !/pass|completed/i.test(t01.status || '')) {
      addBlock(result, `前置任务 T-01 未完成：${t01 ? t01.status : 'missing'}`);
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
    result.next_action = '停止实现，补齐缺失产物或回到 RCP/Review Gate。';
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
