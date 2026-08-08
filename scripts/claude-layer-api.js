#!/usr/bin/env node
/**
 * claude-layer-api —— 分层扫描/同步/校验的 Programmatic 入口(替代原 CLI 命令)。
 * 由 workflow-claude-layering skill 直调,包装 lib/claude-layer.js 的 runClaudeLayer。
 * 用法:
 *   node scripts/claude-layer-api.js <action> --root <dir> [--write] [--strict] [--config <path>]
 * action: init | scan | sync | validate
 * 输出:结构化 JSON(含 exitCode;非零退出码表示失败)
 */

const path = require('path');
const { runClaudeLayer } = require('../lib/claude-layer');

function parseArgs(argv) {
  const options = { action: argv[0] };
  for (let i = 1; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--root' || token === '--config') {
      options[token.slice(2)] = argv[i + 1];
      i += 1;
    } else if (token === '--write' || token === '--strict') {
      options[token.slice(2)] = true;
    } else {
      throw new Error(`未知参数: ${token}`);
    }
  }
  return options;
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(JSON.stringify({ success: false, action: null, errors: [{ code: 'USAGE', message: err.message }], exitCode: 2 }));
    process.exit(2);
  }
  if (!['init', 'scan', 'sync', 'validate'].includes(options.action)) {
    console.error(JSON.stringify({ success: false, action: options.action, errors: [{ code: 'USAGE', message: 'action 必须是 init、scan、sync 或 validate' }], exitCode: 2 }));
    process.exit(2);
  }
  if (!options.root) {
    console.error(JSON.stringify({ success: false, action: options.action, errors: [{ code: 'USAGE', message: '缺少 --root' }], exitCode: 2 }));
    process.exit(2);
  }

  try {
    const result = runClaudeLayer({
      action: options.action,
      root: path.resolve(options.root),
      write: Boolean(options.write),
      strict: Boolean(options.strict),
      configPath: options.config
    });
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.exitCode || 0);
  } catch (err) {
    console.error(JSON.stringify({ success: false, action: options.action, errors: [{ code: 'RUNTIME', message: err.message }], exitCode: 1 }));
    process.exit(1);
  }
}

main();
