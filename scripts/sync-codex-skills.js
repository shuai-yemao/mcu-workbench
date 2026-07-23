#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { CANONICAL_SKILLS } = require('../skills/catalog');

const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const options = {
    dryRun: false,
    target: path.join(os.homedir(), '.agents', 'skills'),
    backupRoot: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--dry-run') options.dryRun = true;
    else if (argument === '--target') options.target = argv[++index];
    else if (argument === '--backup-root') options.backupRoot = argv[++index];
    else if (argument === '--help' || argument === '-h') {
      return { ...options, help: true };
    } else {
      throw new Error(`未知参数：${argument}`);
    }
  }

  if (!options.target) throw new Error('--target 需要一个目录');
  if (!options.backupRoot) {
    options.backupRoot = path.join(path.dirname(path.resolve(options.target)), 'mcu-workbench-skill-backups');
  }
  return options;
}

function isInside(root, target) {
  const relative = path.relative(root, target);
  return relative && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

function skillSource(skill) {
  return path.join(ROOT, skill.path);
}

function buildPlan(target) {
  const resolvedTarget = path.resolve(target);
  const plan = CANONICAL_SKILLS.map((skill) => {
    const source = skillSource(skill);
    const destination = path.join(resolvedTarget, skill.id);
    const legacy = path.join(resolvedTarget, skill.legacyId);
    if (!fs.existsSync(source)) throw new Error(`仓库 skill 不存在：${source}`);
    if (!isInside(resolvedTarget, destination) || !isInside(resolvedTarget, legacy)) {
      throw new Error(`目标路径越界：${skill.id}`);
    }
    const legacyExists = fs.existsSync(legacy);
    const destinationExists = fs.existsSync(destination);
    if (legacy !== destination && legacyExists && destinationExists) {
      throw new Error(`同时发现旧目录和新目录，请先手工处理：${skill.legacyId} / ${skill.id}`);
    }
    return {
      skill,
      source,
      destination,
      existing: destinationExists ? destination : (legacyExists ? legacy : null),
      rename: legacyExists && legacy !== destination
    };
  });
  return { target: resolvedTarget, plan };
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function syncCodexSkills({ target, backupRoot, dryRun = false } = {}) {
  const { target: resolvedTarget, plan } = buildPlan(target || path.join(os.homedir(), '.agents', 'skills'));
  const changes = plan.filter((entry) => entry.existing || fs.existsSync(entry.destination) === false);
  const summary = {
    target: resolvedTarget,
    total: plan.length,
    renamed: plan.filter((entry) => entry.rename).length,
    added: plan.filter((entry) => !entry.existing).length,
    replaced: plan.filter((entry) => entry.existing).length,
    backup: null,
    dryRun
  };

  if (dryRun) return summary;

  fs.mkdirSync(resolvedTarget, { recursive: true });
  const existing = plan.filter((entry) => entry.existing);
  if (existing.length) {
    const resolvedBackupRoot = path.resolve(backupRoot || path.join(path.dirname(resolvedTarget), 'mcu-workbench-skill-backups'));
    const backup = path.join(resolvedBackupRoot, timestamp());
    fs.mkdirSync(backup, { recursive: true });
    for (const entry of existing) {
      fs.cpSync(entry.existing, path.join(backup, path.basename(entry.existing)), { recursive: true });
    }
    summary.backup = backup;
  }

  for (const entry of changes) {
    const staging = path.join(resolvedTarget, `.${entry.skill.id}.sync-${process.pid}`);
    if (!isInside(resolvedTarget, staging)) throw new Error(`临时路径越界：${entry.skill.id}`);
    if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true, force: true });
    fs.cpSync(entry.source, staging, { recursive: true });
    if (entry.existing) fs.rmSync(entry.existing, { recursive: true, force: true });
    fs.renameSync(staging, entry.destination);
  }

  return summary;
}

function formatSummary(summary) {
  const lines = [
    `Codex skills 同步完成：${summary.total} 个`,
    `目标目录：${summary.target}`,
    `重命名：${summary.renamed}，新增：${summary.added}，替换：${summary.replaced}`
  ];
  if (summary.backup) lines.push(`备份目录：${summary.backup}`);
  if (summary.dryRun) lines.push('仅预览，未修改文件。');
  return lines.join('\n');
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log('用法：node scripts/sync-codex-skills.js [--dry-run] [--target <目录>] [--backup-root <目录>]');
      process.exit(0);
    }
    console.log(formatSummary(syncCodexSkills(options)));
  } catch (error) {
    console.error(`Codex skills 同步失败：${error.message}`);
    process.exit(1);
  }
}

module.exports = { buildPlan, parseArgs, syncCodexSkills };
