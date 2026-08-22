#!/usr/bin/env node

/**
 * 管理 MCU Workbench 的 Codex 本地开发循环。
 *
 * 该脚本只操作本地 Marketplace 清单和插件源码版本缓存后缀，
 * 通过 Codex 官方插件安装命令重新导入，不直接覆盖 Codex 受管缓存。
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PLUGIN_NAME = 'mcu-workbench';
const MARKETPLACE_NAME = 'mcu-workbench-local';
const WATCH_TARGETS = ['agents', 'codex', 'skills', 'AGENTS.md', 'AGENTS.override.md', 'package.json'];

const { registerMarketplace } = require('./register-codex-marketplace');
const { checkCodexPluginRefresh, formatReport } = require('./check-codex-plugin-refresh');
const { validatePlugin } = require('./validate-plugin');

function parseArgs(argv) {
  const options = {
    action: 'setup',
    cachebuster: null,
    codexBin: process.env.CODEX_BIN || null,
    debounceMs: 500,
    json: false,
    strict: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === 'refresh') options.action = 'install';
    else if (['setup', 'install', 'check', 'watch'].includes(argument)) options.action = argument;
    else if (argument === '--cachebuster') options.cachebuster = argv[++index];
    else if (argument === '--codex-bin') options.codexBin = argv[++index];
    else if (argument === '--debounce-ms') options.debounceMs = Number(argv[++index]);
    else if (argument === '--json') options.json = true;
    else if (argument === '--strict') options.strict = true;
    else if (argument === '--help' || argument === '-h') return { ...options, help: true };
    else throw new Error(`Unknown argument: ${argument}`);
  }

  if (!Number.isInteger(options.debounceMs) || options.debounceMs < 0) {
    throw new Error('--debounce-ms must be a non-negative integer');
  }
  if (options.cachebuster !== null && !options.cachebuster.trim()) {
    throw new Error('--cachebuster must not be empty');
  }
  return options;
}

function sanitizeCachebuster(value) {
  const sanitized = value.trim().toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!sanitized) throw new Error('Cachebuster must contain at least one letter or digit');
  return sanitized;
}

function defaultCachebuster() {
  return new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
}

function withCachebuster(version, cachebuster) {
  return `${version.split('+', 1)[0]}+codex.${sanitizeCachebuster(cachebuster)}`;
}

function uniqueValues(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.trim()))];
}

function discoverCodexBins() {
  const command = process.platform === 'win32' ? 'where.exe' : 'which';
  const result = spawnSync(command, ['codex'], {
    encoding: 'utf8',
    windowsHide: true
  });
  const candidates = result.status === 0 && typeof result.stdout === 'string'
    ? result.stdout.split(/\r?\n/).map((candidate) => candidate.trim())
    : [];
  return uniqueValues([...candidates, 'codex']);
}

function probeCodexBin(codexBin) {
  const result = spawnSync(codexBin, ['--version'], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    windowsHide: true,
    timeout: 5000
  });
  return result.error == null && result.status === 0;
}

function resolveCodexBin(requestedBin = null, { candidates = null, probe = probeCodexBin } = {}) {
  const availableCandidates = uniqueValues(requestedBin ? [requestedBin] : (candidates || discoverCodexBins()));
  for (const candidate of availableCandidates) {
    if (probe(candidate)) return candidate;
  }
  const checked = availableCandidates.length ? availableCandidates.join(', ') : 'PATH 中的 codex';
  throw new Error(`未找到可用的 Codex CLI。已检查：${checked}。请使用 --codex-bin <path> 指定可用 CLI。`);
}

function readCodexManifest() {
  const manifestPath = path.join(ROOT, '.codex-plugin', 'plugin.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (typeof manifest.version !== 'string' || !manifest.version.trim()) {
    throw new Error(`Codex plugin manifest must contain a version: ${manifestPath}`);
  }
  return { manifest, manifestPath };
}

function updateCachebuster(cachebuster = defaultCachebuster()) {
  const { manifest, manifestPath } = readCodexManifest();
  const previousVersion = manifest.version;
  const nextVersion = withCachebuster(previousVersion, cachebuster);
  if (previousVersion !== nextVersion) {
    manifest.version = nextVersion;
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }
  return { manifestPath, previousVersion, nextVersion };
}

function validateLocalPlugin() {
  const result = validatePlugin();
  if (result.errors.length) {
    const details = result.errors.map((error) => `- ${error}`).join('\n');
    throw new Error(`插件结构校验失败（${result.errors.length} 项）：\n${details}`);
  }
  return result.summary;
}

function prepareLocalPlugin({ cachebuster = null } = {}) {
  const version = cachebuster === null ? readCodexManifest().manifest.version : updateCachebuster(cachebuster).nextVersion;
  const summary = validateLocalPlugin();
  const registration = registerMarketplace();
  return {
    marketplacePath: registration.marketplacePath,
    pluginVersion: version,
    summary
  };
}

function installLocalPlugin(codexBin) {
  const resolvedCodexBin = resolveCodexBin(codexBin);
  const result = spawnSync(resolvedCodexBin, ['plugin', 'add', `${PLUGIN_NAME}@${MARKETPLACE_NAME}`], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: 'inherit'
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Codex plugin install failed with exit code ${result.status}`);
  return resolvedCodexBin;
}

function checkLocalPlugin({ json = false, strict = false } = {}) {
  const report = checkCodexPluginRefresh({ source: ROOT });
  report.action = report.status === 'up_to_date' ? 'none' : 'codex_plugin_add';
  report.instructions = report.status === 'up_to_date'
    ? '本地源码与当前 Codex 缓存一致。'
    : '运行 npm run codex:dev:install；不要直接覆盖 .codex/plugins/cache。';
  console.log(json ? JSON.stringify(report, null, 2) : formatReport(report));
  if (strict && report.status !== 'up_to_date') process.exitCode = 2;
  return report;
}

function printSetup(prepared) {
  console.log(`Codex local development source: ${ROOT}`);
  console.log(`Local marketplace: ${prepared.marketplacePath}`);
  console.log(`Plugin version: ${prepared.pluginVersion}`);
  if (prepared.codexBin) console.log(`Codex CLI: ${prepared.codexBin}`);
  console.log(`Install command: codex plugin add ${PLUGIN_NAME}@${MARKETPLACE_NAME}`);
  console.log('安装后请新建 Codex 对话，以加载最新 skills。');
}

function runInstall(options) {
  const prepared = prepareLocalPlugin({ cachebuster: options.cachebuster || defaultCachebuster() });
  const codexBin = installLocalPlugin(options.codexBin);
  const report = checkCodexPluginRefresh({ source: ROOT });
  if (report.status !== 'up_to_date') {
    throw new Error(`Codex 插件安装后内容校验失败：\n${formatReport(report)}`);
  }
  printSetup({ ...prepared, codexBin });
}

function watchLocalPlugin(options) {
  const watchers = [];
  let timer = null;
  let running = false;
  let pending = false;

  const install = () => {
    if (running) {
      pending = true;
      return;
    }
    running = true;
    try {
      runInstall({ ...options, cachebuster: defaultCachebuster() });
    } catch (error) {
      console.error(`本地插件自动安装失败：${error.message}`);
      console.error('源码和本地 Marketplace 已保留；请修复 CLI 或手动执行 Install command。');
    } finally {
      running = false;
      if (pending) {
        pending = false;
        scheduleInstall();
      }
    }
  };

  const scheduleInstall = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(install, options.debounceMs);
  };

  for (const relativePath of WATCH_TARGETS) {
    const target = path.join(ROOT, relativePath);
    if (!fs.existsSync(target)) continue;
    watchers.push(fs.watch(target, { recursive: fs.statSync(target).isDirectory() }, scheduleInstall));
  }

  install();
  console.log('Codex local development watch active. Press Ctrl+C to stop.');

  const close = () => {
    if (timer) clearTimeout(timer);
    for (const watcher of watchers) watcher.close();
  };
  process.once('SIGINT', () => {
    close();
    process.exit(0);
  });
  process.once('SIGTERM', () => {
    close();
    process.exit(0);
  });
}

function printHelp() {
  console.log(`Usage: node scripts/codex-local-dev.js <setup|install|check|watch> [options]

setup   校验插件并注册本地 Marketplace，不执行 Codex 安装
install 更新 Codex 开发缓存后缀，并调用 codex plugin add
refresh install 的别名，用于强制加载当前源码
check   检查源码与 Codex 受管缓存是否一致
watch   监听源码变更并自动执行 install

Options:
  --cachebuster <token>  指定开发缓存后缀
  --codex-bin <path>     指定 Codex CLI 路径，也可使用 CODEX_BIN
  --debounce-ms <ms>     watch 防抖时间，默认 500
  --json                 check 输出 JSON
  --strict               check 不一致时返回退出码 2`);
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return;
  }
  if (options.action === 'check') {
    checkLocalPlugin(options);
    return;
  }
  if (options.action === 'setup') {
    printSetup(prepareLocalPlugin({ cachebuster: options.cachebuster }));
    return;
  }
  if (options.action === 'install') {
    runInstall(options);
    return;
  }
  watchLocalPlugin(options);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Codex local development failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  defaultCachebuster,
  discoverCodexBins,
  parseArgs,
  probeCodexBin,
  resolveCodexBin,
  sanitizeCachebuster,
  updateCachebuster,
  withCachebuster
};
