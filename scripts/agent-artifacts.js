#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const RUN_FIELDS = [
  'run_id', 'agent', 'task', 'status', 'inputs', 'evidence', 'changed_files',
  'tests', 'artifacts', 'blockers', 'handoff'
];
const STATUSES = new Set(['planned', 'in_progress', 'completed', 'blocked']);

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const [rawKey, inlineValue] = token.slice(2).split('=', 2);
    if (inlineValue !== undefined) {
      if (!args[rawKey]) args[rawKey] = [];
      args[rawKey].push(inlineValue);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      if (!args[rawKey]) args[rawKey] = [];
      args[rawKey].push(next);
      index += 1;
    } else {
      args[rawKey] = ['true'];
    }
  }
  return args;
}

function first(args, key, fallback = '') {
  return args[key] && args[key].length ? args[key][0] : fallback;
}

function values(args, key) {
  return args[key] ? [...args[key]] : [];
}

function safeSegment(value, fallback = 'run') {
  const result = String(value || fallback)
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return result || fallback;
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function projectPaths(projectRoot) {
  const root = path.resolve(projectRoot || process.cwd());
  return {
    root,
    metadata: path.join(root, '.mcu-workbench', 'project.json'),
    runs: path.join(root, '.mcu-workbench', 'runs')
  };
}

function ensureDirectories(root) {
  for (const relative of [
    '.mcu-workbench/runs', 'docs/architecture', 'docs/verification',
    'docs/devlog', 'docs/notes'
  ]) fs.mkdirSync(path.join(root, relative), { recursive: true });
}

function initProject(options = {}) {
  const paths = projectPaths(options.projectRoot);
  ensureDirectories(paths.root);
  if (fs.existsSync(paths.metadata) && !options.force) {
    throw new Error(`project.json already exists: ${path.relative(paths.root, paths.metadata)}`);
  }
  const now = new Date().toISOString();
  const metadata = {
    schema_version: 1,
    project: options.projectId || path.basename(paths.root),
    mcu: options.mcu || null,
    toolchain: options.toolchain || null,
    platform: options.platform || null,
    created_at: now,
    updated_at: now,
    active_agents: [],
    artifact_roots: {
      runs: '.mcu-workbench/runs',
      architecture: 'docs/architecture',
      verification: 'docs/verification',
      devlog: 'docs/devlog',
      notes: 'docs/notes'
    }
  };
  fs.writeFileSync(paths.metadata, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  return { path: paths.metadata, metadata };
}

function normalizeRunId(options) {
  return options.runId || `${timestamp()}-${safeSegment(options.agent, 'agent')}-${safeSegment(options.task, 'task')}`;
}

function writeRunRecord(options = {}) {
  const paths = projectPaths(options.projectRoot);
  if (!fs.existsSync(paths.metadata)) throw new Error('project.json is missing; run init first');
  if (!options.agent || !options.task || !options.status) throw new Error('agent, task, and status are required');
  if (!STATUSES.has(options.status)) throw new Error(`status must be one of: ${[...STATUSES].join(', ')}`);
  const runId = normalizeRunId(options);
  const runPath = path.join(paths.runs, `${safeSegment(runId)}.json`);
  if (fs.existsSync(runPath)) throw new Error(`run record already exists: ${path.relative(paths.root, runPath)}`);
  fs.mkdirSync(paths.runs, { recursive: true });
  const record = {
    schema_version: 1,
    run_id: runId,
    agent: options.agent,
    task: options.task,
    status: options.status,
    inputs: values(options, 'inputs'),
    evidence: values(options, 'evidence'),
    changed_files: values(options, 'changedFiles'),
    tests: values(options, 'tests'),
    artifacts: values(options, 'artifacts'),
    blockers: values(options, 'blockers'),
    handoff: values(options, 'handoff'),
    created_at: new Date().toISOString()
  };
  fs.writeFileSync(runPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  const metadata = JSON.parse(fs.readFileSync(paths.metadata, 'utf8'));
  metadata.active_agents = Array.from(new Set([...(metadata.active_agents || []), options.agent]));
  metadata.updated_at = new Date().toISOString();
  fs.writeFileSync(paths.metadata, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  return { path: runPath, record };
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const command = args._[0];
  if (!command || !['init', 'record'].includes(command)) {
    throw new Error('usage: agent-artifacts.js init|record --project <path> [options]');
  }
  const projectRoot = first(args, 'project', process.cwd());
  if (command === 'init') {
    const result = initProject({
      projectRoot,
      projectId: first(args, 'project-id'),
      platform: first(args, 'platform'),
      mcu: first(args, 'mcu'),
      toolchain: first(args, 'toolchain'),
      force: first(args, 'force') === 'true'
    });
    console.log(`initialized ${path.relative(projectRoot, result.path)}`);
    return result;
  }
  const result = writeRunRecord({
    projectRoot,
    runId: first(args, 'run-id'),
    agent: first(args, 'agent'),
    task: first(args, 'task'),
    status: first(args, 'status'),
    inputs: values(args, 'input'),
    evidence: values(args, 'evidence'),
    changedFiles: values(args, 'changed-file'),
    tests: values(args, 'test'),
    artifacts: values(args, 'artifact'),
    blockers: values(args, 'blocker'),
    handoff: values(args, 'handoff')
  });
  console.log(`recorded ${path.relative(projectRoot, result.path)}`);
  return result;
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(`artifact error: ${error.message}`); process.exitCode = 1; }
}

module.exports = { RUN_FIELDS, parseArgs, initProject, writeRunRecord, projectPaths };
