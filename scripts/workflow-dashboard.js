#!/usr/bin/env node

'use strict';

const { watchDashboard, writeDashboard } = require('../lib/workflow-dashboard');

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`--${key} requires a value`);
    args[key] = value;
    index += 1;
  }
  return args;
}

function requireOptions(args) {
  if (!args.root) throw new Error('--root requires an absolute project path');
  return {
    root: args.root,
    requestId: args['request-id'],
    docsDir: args['docs-dir'],
    outputPath: args.output,
    debounceMs: args['debounce-ms'] === undefined ? undefined : Number(args['debounce-ms']),
  };
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const command = args._[0];
  if (!['render', 'watch'].includes(command)) {
    throw new Error('usage: workflow-dashboard.js render|watch --root <absolute-path> [--request-id <id>] [--output <file>]');
  }
  const options = requireOptions(args);
  if (command === 'render') {
    const result = writeDashboard(options);
    process.stdout.write(`generated ${result.outputPath}; issues=${result.snapshot.issues.length}\n`);
    return;
  }

  const watcher = watchDashboard({
    ...options,
    onError: (error) => process.stderr.write(`watch error: ${error.message}\n`),
  });
  process.stdout.write(`watching ${options.root}; press Ctrl+C to stop\n`);
  const stop = () => {
    watcher.stop();
    process.exit(0);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`workflow-dashboard error: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { main, parseArgs };
