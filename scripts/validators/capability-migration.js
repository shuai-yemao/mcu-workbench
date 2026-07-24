const fs = require('fs');
const path = require('path');
const { SKILL_BY_CANONICAL_ID } = require('../../skills/catalog');
const {
  buildCapabilityMigrationPlan,
  materializeSkillCapabilities
} = require('../materialize-skill-capabilities');
const { ROOT, validateLocalMarkdownLinks } = require('./common');

function validateCapabilityMigration(errors) {
  const result = materializeSkillCapabilities({ write: false });
  for (const message of result.errors) errors.push(`capability migration: ${message}`);
  for (const message of result.missing) errors.push(`capability migration: 缺少已内化资源 ${message}`);
  for (const targetId of result.staleIndexes) errors.push(`capability migration: ${targetId}/capability-index.md 缺失或过期`);
  for (const message of result.staleLegacyPaths) errors.push(`capability migration: ${message} 未清理`);

  const { groups } = buildCapabilityMigrationPlan();
  for (const [targetId, entries] of groups) {
    const target = SKILL_BY_CANONICAL_ID[targetId];
    if (!target) continue;
    const skillPath = path.join(ROOT, target.path, 'SKILL.md');
    const skillContent = fs.readFileSync(skillPath, 'utf8');
    if (!skillContent.includes('references/capability-index.md')) {
      errors.push(`capability migration: ${targetId}/SKILL.md 未链接 references/capability-index.md`);
    }
    const indexPath = path.join(ROOT, target.path, 'references', 'capability-index.md');
    if (fs.existsSync(indexPath)) {
      validateLocalMarkdownLinks(indexPath, fs.readFileSync(indexPath, 'utf8'), errors);
    }
    for (const entry of entries) {
      if (!fs.existsSync(path.join(entry.destination, 'GUIDE.md'))) {
        errors.push(`capability migration: ${targetId} 缺少 ${entry.source.id}/GUIDE.md`);
      }
    }
  }
}

module.exports = {
  validateCapabilityMigration
};
