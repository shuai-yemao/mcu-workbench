'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { writeDashboard } = require('./workflow-dashboard');

const DASHBOARD_SCRIPT = path.join(__dirname, '..', 'scripts', 'workflow-dashboard.js');
const RUNTIME_ROOT = path.join(os.tmpdir(), 'mcu-workbench-dashboard');

function assertProjectRoot(value) {
  if (!value || !path.isAbsolute(value)) throw new TypeError('projectRoot must be an absolute path');
  return path.resolve(value);
}

function isDashboardProjectRoot(value) {
  if (!value || !path.isAbsolute(value)) return false;
  const root = path.resolve(value);
  const layerDirectories = ['01_App', '02_Service', '03_Platform', '04_Impl', '05_Vendor', '06_Toolchain'];
  return fs.existsSync(path.join(root, '00_Docs')) && layerDirectories.some((directory) => fs.existsSync(path.join(root, directory)));
}

function runtimePaths(projectRoot) {
  const root = assertProjectRoot(projectRoot);
  const key = crypto.createHash('sha256').update(root.toLowerCase()).digest('hex').slice(0, 24);
  const directory = path.join(RUNTIME_ROOT, key);
  return {
    directory,
    pid: path.join(directory, 'watcher.pid'),
    stdout: path.join(directory, 'watcher.out.log'),
    stderr: path.join(directory, 'watcher.err.log'),
  };
}

function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readPid(projectRoot) {
  const paths = runtimePaths(projectRoot);
  if (!fs.existsSync(paths.pid)) return { paths, pid: null, stale: false };
  const value = Number.parseInt(fs.readFileSync(paths.pid, 'utf8').trim(), 10);
  if (processIsAlive(value)) return { paths, pid: value, stale: false };
  fs.rmSync(paths.pid, { force: true });
  return { paths, pid: null, stale: true };
}

function writePid(paths, pid) {
  fs.mkdirSync(paths.directory, { recursive: true });
  fs.writeFileSync(paths.pid, `${pid}\n`, 'utf8');
}

function startDashboard(options = {}) {
  const root = assertProjectRoot(options.root || options.projectRoot);
  if (!isDashboardProjectRoot(root)) return { started: false, skipped: true, reason: '目标目录不是可识别的嵌入式项目根目录。', root };
  const existing = readPid(root);
  if (existing.pid) return { started: false, alreadyRunning: true, pid: existing.pid, root, paths: existing.paths };

  const outputPath = options.outputPath || path.join(root, 'workflow-dashboard.html');
  writeDashboard({ root, requestId: options.requestId, docsDir: options.docsDir, outputPath });
  fs.mkdirSync(existing.paths.directory, { recursive: true });
  const stdoutFd = fs.openSync(existing.paths.stdout, 'a');
  const stderrFd = fs.openSync(existing.paths.stderr, 'a');
  const child = spawn(process.execPath, [DASHBOARD_SCRIPT, 'watch', '--root', root, '--output', outputPath, ...(options.requestId ? ['--request-id', options.requestId] : []), ...(options.docsDir ? ['--docs-dir', options.docsDir] : [])], {
    cwd: root,
    detached: true,
    windowsHide: true,
    stdio: ['ignore', stdoutFd, stderrFd],
  });
  child.unref();
  fs.closeSync(stdoutFd);
  fs.closeSync(stderrFd);
  writePid(existing.paths, child.pid);
  return { started: true, pid: child.pid, root, outputPath, paths: existing.paths };
}

function statusDashboard(options = {}) {
  const root = assertProjectRoot(options.root || options.projectRoot);
  const current = readPid(root);
  return { running: Boolean(current.pid), pid: current.pid, stale: current.stale, root, outputPath: path.join(root, 'workflow-dashboard.html'), paths: current.paths };
}

function stopDashboard(options = {}) {
  const root = assertProjectRoot(options.root || options.projectRoot);
  const current = readPid(root);
  if (!current.pid) return { stopped: false, root, stale: current.stale, paths: current.paths };
  try { process.kill(current.pid); } catch { /* 进程可能已在退出，下面仍清理管理状态。 */ }
  fs.rmSync(current.paths.pid, { force: true });
  return { stopped: true, pid: current.pid, root, paths: current.paths };
}

function renderDashboard(options = {}) {
  const root = assertProjectRoot(options.root || options.projectRoot);
  return writeDashboard({ root, requestId: options.requestId, docsDir: options.docsDir, outputPath: options.outputPath });
}

function openDashboard(options = {}) {
  const root = assertProjectRoot(options.root || options.projectRoot);
  const outputPath = options.outputPath || path.join(root, 'workflow-dashboard.html');
  if (!fs.existsSync(outputPath)) renderDashboard({ ...options, root, outputPath });
  let child;
  if (process.platform === 'win32') child = spawn('explorer.exe', [outputPath], { detached: true, windowsHide: true, stdio: 'ignore' });
  else if (process.platform === 'darwin') child = spawn('open', [outputPath], { detached: true, stdio: 'ignore' });
  else child = spawn('xdg-open', [outputPath], { detached: true, stdio: 'ignore' });
  child.unref();
  return { opened: true, root, outputPath };
}

function ensureDashboardStarted(options = {}) {
  const root = options.root || options.projectRoot;
  if (!root || !path.isAbsolute(root) || !isDashboardProjectRoot(root)) return { started: false, skipped: true, reason: '当前上下文没有识别到嵌入式项目根目录。', root: root || null };
  return startDashboard(options);
}

module.exports = { isDashboardProjectRoot, runtimePaths, startDashboard, statusDashboard, stopDashboard, renderDashboard, openDashboard, ensureDashboardStarted };
