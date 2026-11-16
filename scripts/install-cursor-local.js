#!/usr/bin/env node
/**
 * 把当前仓库复制到 Cursor 的本地插件目录。
 * Cursor 不跟随指向该目录之外的符号链接，因此这里复制插件树。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP = new Set(['.git', 'node_modules', 'coverage', 'integration-test', 'test-project']);

function copyEntry(src, dest) {
  const stat = fs.lstatSync(src);
  if (stat.isSymbolicLink()) {
    fs.symlinkSync(fs.readlinkSync(src), dest);
    return;
  }
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      if (SKIP.has(entry)) continue;
      copyEntry(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }
  if (stat.isFile()) fs.copyFileSync(src, dest);
}

function installCursorPlugin(target = path.join(os.homedir(), '.cursor', 'plugins', 'local', 'mcu-workbench')) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  copyEntry(ROOT, target);
  return target;
}

if (require.main === module) {
  const target = installCursorPlugin();
  process.stdout.write(`Cursor 本地插件已安装到 ${target}\n`);
  process.stdout.write('请在 Cursor 中执行 Developer: Reload Window，然后在 Customize 中确认 Skills 和 MCP。\n');
}

module.exports = {
  installCursorPlugin
};
