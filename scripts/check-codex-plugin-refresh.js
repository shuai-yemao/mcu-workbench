#!/usr/bin/env node

/**
 * 检查本地 Marketplace 源与 Codex 受管插件缓存是否一致。
 *
 * 本脚本只读，不删除、覆盖或移动 Codex 缓存；发现差异时交接给官方
 * Marketplace Refresh 流程。
 */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CACHE_ROOT = path.join(
  os.homedir(),
  '.codex',
  'plugins',
  'cache',
  'mcu-workbench-local',
  'mcu-workbench'
);

const ROOT_FILES = [
  '.codex-plugin/plugin.json',
  'AGENTS.md',
  'AGENTS.override.md',
  'index.js',
  'opencode.json',
  'opencode.mjs',
  'package.json'
];
const DIRECTORY_ROOTS = ['agents', 'codex', 'skills'];

function parseArgs(argv) {
  const options = {
    source: ROOT,
    cacheRoot: CACHE_ROOT,
    json: false,
    strict: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--source') options.source = path.resolve(argv[++index]);
    else if (argument === '--cache-root') options.cacheRoot = path.resolve(argv[++index]);
    else if (argument === '--json') options.json = true;
    else if (argument === '--strict') options.strict = true;
    else if (argument === '--help' || argument === '-h') return { ...options, help: true };
    else throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
}

function readVersion(source) {
  const packagePath = path.join(source, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return packageJson.version;
}

function readGitCommit(source) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: source,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return null;
  }
}

function isDirectoryEntry(entry) {
  return entry.isDirectory() && !entry.isSymbolicLink();
}

function collectFiles(root) {
  const files = [];
  const visit = (relativeRoot) => {
    const absoluteRoot = path.join(root, relativeRoot);
    if (!fs.existsSync(absoluteRoot)) return;

    const entries = fs.readdirSync(absoluteRoot, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const relativePath = path.posix.join(relativeRoot.replaceAll(path.sep, '/'), entry.name);
      const absolutePath = path.join(root, relativePath);
      if (isDirectoryEntry(entry)) visit(relativePath);
      else if (entry.isFile()) files.push({ absolutePath, relativePath });
    }
  };

  for (const relativePath of ROOT_FILES) {
    if (fs.existsSync(path.join(root, relativePath))) {
      files.push({ absolutePath: path.join(root, relativePath), relativePath });
    }
  }
  for (const directoryRoot of DIRECTORY_ROOTS) visit(directoryRoot);
  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function fingerprint(root) {
  const hash = crypto.createHash('sha256');
  const files = collectFiles(root);
  for (const file of files) {
    hash.update(file.relativePath.replaceAll(path.sep, '/'));
    hash.update('\0');
    hash.update(fs.readFileSync(file.absolutePath));
    hash.update('\0');
  }
  return { hash: hash.digest('hex'), files: files.map((file) => file.relativePath) };
}

function readDirtyState(source) {
  try {
    return execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
      cwd: source,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim().length > 0;
  } catch {
    return null;
  }
}

function checkCodexPluginRefresh({ source = ROOT, cacheRoot = CACHE_ROOT } = {}) {
  const resolvedSource = path.resolve(source);
  const resolvedCacheRoot = path.resolve(cacheRoot);
  const sourceVersion = readVersion(resolvedSource);
  const cachePath = path.join(resolvedCacheRoot, sourceVersion);
  const sourceFingerprint = fingerprint(resolvedSource);
  const sourceCommit = readGitCommit(resolvedSource);
  const sourceDirty = readDirtyState(resolvedSource);
  const reasons = [];

  if (!fs.existsSync(cachePath)) {
    reasons.push(`Codex cache for version ${sourceVersion} does not exist.`);
  } else {
    const cacheFingerprint = fingerprint(cachePath);
    if (cacheFingerprint.hash !== sourceFingerprint.hash) {
      reasons.push('Marketplace source and Codex cache content fingerprints differ.');
    }
  }

  const status = reasons.length ? 'refresh_required' : 'up_to_date';
  return {
    status,
    action: status === 'refresh_required' ? 'marketplace_refresh' : 'none',
    source: {
      path: resolvedSource,
      version: sourceVersion,
      commit: sourceCommit,
      dirty: sourceDirty,
      fingerprint: sourceFingerprint.hash,
      fileCount: sourceFingerprint.files.length
    },
    cache: {
      path: cachePath,
      exists: fs.existsSync(cachePath),
      fingerprint: fs.existsSync(cachePath) ? fingerprint(cachePath).hash : null
    },
    reasons,
    instructions: status === 'refresh_required'
      ? '在 Codex 的 Marketplace 插件上执行 Refresh；必要时重启 Codex。不要直接覆盖 .codex/plugins/cache。'
      : 'Marketplace 源与当前版本的 Codex 缓存一致。'
  };
}

function formatReport(report) {
  const lines = [
    `Codex plugin refresh status: ${report.status}`,
    `Source: ${report.source.path}`,
    `Version: ${report.source.version}`,
    `Source commit: ${report.source.commit || 'unavailable'}`,
    `Cache: ${report.cache.path}`,
    `Action: ${report.action}`
  ];
  if (report.reasons.length) {
    lines.push('Reasons:');
    for (const reason of report.reasons) lines.push(`- ${reason}`);
  }
  lines.push(`Next step: ${report.instructions}`);
  return lines.join('\n');
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log('Usage: node scripts/check-codex-plugin-refresh.js [--source <dir>] [--cache-root <dir>] [--json] [--strict]');
      process.exit(0);
    }
    const report = checkCodexPluginRefresh(options);
    console.log(options.json ? JSON.stringify(report, null, 2) : formatReport(report));
    if (options.strict && report.status !== 'up_to_date') process.exitCode = 2;
  } catch (error) {
    console.error(`Codex plugin refresh check failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  CACHE_ROOT,
  DIRECTORY_ROOTS,
  ROOT_FILES,
  checkCodexPluginRefresh,
  collectFiles,
  fingerprint,
  formatReport,
  parseArgs
};
