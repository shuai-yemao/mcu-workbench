#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  CANONICAL_SKILLS,
  SKILL_CATALOG,
  SKILL_BY_CANONICAL_ID,
  resolveSkillId
} = require('../skills/catalog');

const ROOT = path.resolve(__dirname, '..');

function buildCapabilityMigrationPlan() {
  const groups = new Map();
  const errors = [];
  for (const source of SKILL_CATALOG.filter((skill) => skill.archived)) {
    const targetId = resolveSkillId(source.id) || resolveSkillId(source.legacyId);
    const target = targetId && SKILL_BY_CANONICAL_ID[targetId];
    if (!target) {
      errors.push(`${source.id}: 没有 canonical 迁移目标`);
      continue;
    }
    const sourceDirectory = path.join(ROOT, source.path);
    if (!fs.existsSync(path.join(sourceDirectory, 'SKILL.md'))) {
      errors.push(`${source.id}: 迁移来源 SKILL.md 不存在`);
      continue;
    }
    const referencesRoot = path.join(ROOT, target.path, 'references');
    const destinationRoot = path.join(referencesRoot, 'capabilities');
    if (!groups.has(targetId)) groups.set(targetId, []);
    groups.get(targetId).push({
      source,
      sourceDirectory,
      referencesRoot,
      destinationRoot,
      destination: path.join(destinationRoot, source.id)
    });
  }
  return { groups, errors };
}

function renderCapabilityIndex(target, entries) {
  const rows = entries
    .sort((left, right) => left.source.id.localeCompare(right.source.id))
    .map((entry) => `| ${entry.source.description} | [完整流程与资源](capabilities/${entry.source.id}/GUIDE.md) |`);
  return [
    '# 内化能力索引',
    '',
    `以下资料已经成为 \`${target.id}\` 的 active references。仅在请求命中对应技术或工作流时读取相关条目；主入口仍负责边界、路由和验收。`,
    '',
    '| 能力主题 | 详细资料 |',
    '| --- | --- |',
    ...rows,
    ''
  ].join('\n');
}

function materializeSkillCapabilities({ write = false } = {}) {
  const { groups, errors } = buildCapabilityMigrationPlan();
  const missing = [];
  const staleIndexes = [];
  const staleLegacyPaths = [];
  const copied = [];
  const moved = [];
  for (const target of CANONICAL_SKILLS) {
    const entries = groups.get(target.id) || [];
    if (!entries.length) continue;
    const first = entries[0];
    const legacyRoot = path.join(first.referencesRoot, 'legacy');
    const capabilityIndex = path.join(first.referencesRoot, 'capability-index.md');
    const legacyIndex = path.join(first.referencesRoot, 'legacy-index.md');
    if (fs.existsSync(legacyRoot)) {
      staleLegacyPaths.push(`${target.id}/references/legacy`);
      if (write) {
        if (fs.existsSync(first.destinationRoot)) throw new Error(`${target.id}: capabilities 与旧 legacy 目录同时存在`);
        fs.renameSync(legacyRoot, first.destinationRoot);
        moved.push(`${target.id}/references/legacy → capabilities`);
      }
    }
    for (const entry of entries) {
      const guidePath = path.join(entry.destination, 'GUIDE.md');
      const formerSkillPath = path.join(entry.destination, 'SKILL.md');
      if (fs.existsSync(formerSkillPath) && !fs.existsSync(guidePath) && write) {
        fs.renameSync(formerSkillPath, guidePath);
      }
      if (!fs.existsSync(guidePath)) {
        missing.push(`${target.id} ← ${entry.source.id}`);
        if (write) {
          fs.mkdirSync(entry.destinationRoot, { recursive: true });
          fs.cpSync(entry.sourceDirectory, entry.destination, { recursive: true, force: false, errorOnExist: true });
          fs.renameSync(path.join(entry.destination, 'SKILL.md'), guidePath);
          copied.push(`${target.id} ← ${entry.source.id}`);
        }
      }
    }
    const expectedIndex = renderCapabilityIndex(target, entries);
    const currentIndex = fs.existsSync(capabilityIndex) ? fs.readFileSync(capabilityIndex, 'utf8') : null;
    if (currentIndex !== expectedIndex) {
      staleIndexes.push(target.id);
      if (write) fs.writeFileSync(capabilityIndex, expectedIndex, 'utf8');
    }
    if (fs.existsSync(legacyIndex)) {
      staleLegacyPaths.push(`${target.id}/references/legacy-index.md`);
      if (write) fs.rmSync(legacyIndex, { force: true });
    }
  }
  return { errors, missing, staleIndexes, staleLegacyPaths, copied, moved, targets: groups.size };
}

function parseArgs(argv) {
  if (argv.length === 0 || argv.includes('--check')) return { write: false };
  if (argv.length === 1 && argv[0] === '--write') return { write: true };
  throw new Error('Usage: node scripts/materialize-skill-capabilities.js [--check|--write]');
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = materializeSkillCapabilities(options);
    if (result.errors.length || (!options.write && (result.missing.length || result.staleIndexes.length || result.staleLegacyPaths.length))) {
      for (const message of [
        ...result.errors,
        ...result.missing,
        ...result.staleIndexes.map((id) => `${id}: capability-index.md 缺失或过期`),
        ...result.staleLegacyPaths.map((value) => `${value}: 仍保留旧迁移路径`)
      ]) console.error(`- ${message}`);
      process.exitCode = 1;
    } else {
      console.log(`能力内化${options.write ? '完成' : '校验通过'}：${result.targets} 个目标，新增 ${result.copied.length} 个来源，迁移 ${result.moved.length} 个目录。`);
    }
  } catch (error) {
    console.error(`能力内化失败：${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { buildCapabilityMigrationPlan, materializeSkillCapabilities, parseArgs, renderCapabilityIndex };
