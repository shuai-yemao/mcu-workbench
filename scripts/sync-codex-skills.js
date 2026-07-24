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
    else if (argument === '--help' || argument === '-h') return { ...options, help: true };
    else throw new Error(`Unknown argument: ${argument}`);
  }

  if (!options.target) throw new Error('--target requires a directory');
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
    const aliases = [skill.legacyId, ...(skill.aliases || [])]
      .filter((alias, index, all) => alias && alias !== skill.id && all.indexOf(alias) === index);

    if (!fs.existsSync(source)) throw new Error(`Repository skill missing: ${source}`);
    if (!isInside(resolvedTarget, destination)
      || aliases.some((alias) => !isInside(resolvedTarget, path.join(resolvedTarget, alias)))) {
      throw new Error(`Target path escapes sync directory: ${skill.id}`);
    }

    const destinationExists = fs.existsSync(destination);
    const existingAliases = aliases
      .map((alias) => path.join(resolvedTarget, alias))
      .filter((aliasPath) => fs.existsSync(aliasPath));
    if (destinationExists && existingAliases.length) {
      throw new Error(`New and legacy directories both exist: ${skill.id} / ${existingAliases.map((aliasPath) => path.basename(aliasPath)).join(', ')}`);
    }
    if (existingAliases.length > 1) {
      throw new Error(`Multiple legacy directories exist: ${existingAliases.map((aliasPath) => path.basename(aliasPath)).join(', ')}`);
    }

    const existingAlias = existingAliases[0] || null;
    return {
      skill,
      source,
      destination,
      existing: destinationExists ? destination : existingAlias,
      rename: Boolean(existingAlias && !destinationExists)
    };
  });
  return { target: resolvedTarget, plan };
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function wait(milliseconds) {
  if (milliseconds <= 0) return;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function renameWithRetry(source, destination, { retries = 4, delayMs = 25 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      fs.renameSync(source, destination);
      return;
    } catch (error) {
      lastError = error;
      if (!['EPERM', 'EBUSY'].includes(error.code) || attempt === retries) throw error;
      wait(delayMs * (attempt + 1));
    }
  }
  throw lastError;
}

function syncCodexSkills({ target, backupRoot, dryRun = false } = {}) {
  const { target: resolvedTarget, plan } = buildPlan(target || path.join(os.homedir(), '.agents', 'skills'));
  const changes = plan.filter((entry) => entry.existing || !fs.existsSync(entry.destination));
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
    if (!isInside(resolvedTarget, staging)) throw new Error(`Temporary path escapes sync directory: ${entry.skill.id}`);
    if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true, force: true });
    fs.cpSync(entry.source, staging, { recursive: true });
    if (entry.existing) fs.rmSync(entry.existing, { recursive: true, force: true });
    renameWithRetry(staging, entry.destination);
  }

  return summary;
}

function formatSummary(summary) {
  const lines = [
    `Codex skills sync complete: ${summary.total}`,
    `Target: ${summary.target}`,
    `Renamed: ${summary.renamed}, added: ${summary.added}, replaced: ${summary.replaced}`
  ];
  if (summary.backup) lines.push(`Backup: ${summary.backup}`);
  if (summary.dryRun) lines.push('Dry run; no files changed.');
  return lines.join('\n');
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log('Usage: node scripts/sync-codex-skills.js [--dry-run] [--target <directory>] [--backup-root <directory>]');
      process.exit(0);
    }
    console.log(formatSummary(syncCodexSkills(options)));
  } catch (error) {
    console.error(`Codex skills sync failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { buildPlan, parseArgs, renameWithRetry, syncCodexSkills };
