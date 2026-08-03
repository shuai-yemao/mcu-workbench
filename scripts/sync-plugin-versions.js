#!/usr/bin/env node
/**
 * 版本单一来源同步脚本。
 * package.json 的 version 是唯一版本源，.claude-plugin/plugin.json 与
 * .codex-plugin/plugin.json 的 version 必须与其一致。
 *
 * 用法：
 *   node scripts/sync-plugin-versions.js          # 同步（写回两个 plugin.json）
 *   node scripts/sync-plugin-versions.js --check  # 只检查不一致
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VERSION_TARGETS = ['.claude-plugin/plugin.json', '.codex-plugin/plugin.json'];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function writeJson(relativePath, object) {
  fs.writeFileSync(path.join(ROOT, relativePath), JSON.stringify(object, null, 2) + '\n');
}

function getVersions() {
  return {
    package: readJson('package.json').version,
    claude: readJson('.claude-plugin/plugin.json').version,
    codex: readJson('.codex-plugin/plugin.json').version
  };
}

/** 把 package.json 版本写回各插件清单，返回新版本号。 */
function syncVersions() {
  const version = readJson('package.json').version;
  for (const target of VERSION_TARGETS) {
    const manifest = readJson(target);
    if (manifest.version !== version) {
      manifest.version = version;
      writeJson(target, manifest);
    }
  }
  return version;
}

/** 校验器：向 errors 追加版本不一致错误。 */
function checkVersionSync(errors) {
  const pkgVersion = readJson('package.json').version;
  for (const target of VERSION_TARGETS) {
    const manifestVersion = readJson(target).version;
    if (manifestVersion !== pkgVersion) {
      errors.push(`version: ${target} version(${manifestVersion}) 与 package.json(${pkgVersion}) 不一致，请运行 npm run sync:versions`);
    }
  }
}

if (require.main === module) {
  if (process.argv.includes('--check')) {
    const errors = [];
    checkVersionSync(errors);
    if (errors.length) {
      console.error(`版本校验失败（${errors.length} 项）：`);
      for (const error of errors) console.error(`- ${error}`);
      process.exitCode = 1;
    } else {
      console.log(`版本一致：${JSON.stringify(getVersions())}`);
    }
  } else {
    console.log(`已同步版本到 ${syncVersions()}`);
  }
}

module.exports = {
  VERSION_TARGETS,
  getVersions,
  syncVersions,
  checkVersionSync
};
