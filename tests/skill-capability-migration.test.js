const fs = require('fs');
const path = require('path');
const { CANONICAL_SKILLS, SKILL_BY_CANONICAL_ID } = require('../skills/catalog');
const {
  buildCapabilityMigrationPlan,
  materializeSkillCapabilities
} = require('../scripts/materialize-skill-capabilities');
const { validateCapabilityMigration, validatePlugin } = require('../scripts/validate-plugin');

const ROOT = path.resolve(__dirname, '..');

describe('archived capability transfer into active skills', () => {
  test('maps every archived source to a canonical skill', () => {
    const { groups, errors } = buildCapabilityMigrationPlan();
    const entries = [...groups.values()].flat();

    expect(errors).toEqual([]);
    expect(entries).toHaveLength(76);
    expect(groups.get('workflow-integration-plan').map((entry) => entry.source.id)).toEqual(expect.arrayContaining([
      'workflow-architecture', 'workflow-code-porting'
    ]));
    expect(groups.get('workflow-review-gate').map((entry) => entry.source.id)).toEqual(expect.arrayContaining([
      'project-integration'
    ]));
    expect(groups.get('tools-quality').map((entry) => entry.source.id)).toEqual(expect.arrayContaining([
      'quality-code-review'
    ]));
    expect(groups.get('tools-learning-tutor').map((entry) => entry.source.id)).toEqual(expect.arrayContaining([
      'workflow-devlog', 'workflow-learning-tutor'
    ]));
  });

  test('stores every transferred source as an indexed capability reference', () => {
    const result = materializeSkillCapabilities({ write: false });
    const { groups } = buildCapabilityMigrationPlan();

    expect(result.errors).toEqual([]);
    expect(result.missing).toEqual([]);
    expect(result.staleIndexes).toEqual([]);
    expect(result.staleLegacyPaths).toEqual([]);
    for (const [targetId, entries] of groups) {
      const target = SKILL_BY_CANONICAL_ID[targetId];
      const skillPath = path.join(ROOT, target.path, 'SKILL.md');
      const indexPath = path.join(ROOT, target.path, 'references', 'capability-index.md');
      const skill = fs.readFileSync(skillPath, 'utf8');
      const index = fs.readFileSync(indexPath, 'utf8');
      expect(skill).toContain('references/capability-index.md');
      for (const entry of entries) {
        expect(fs.existsSync(path.join(entry.destination, 'GUIDE.md'))).toBe(true);
        expect(index).toContain(`capabilities/${entry.source.id}/GUIDE.md`);
      }
      if (targetId === 'tools-learning-tutor') {
        expect(index).toContain('迁移比对资料');
        expect(index).toContain('不作为 active reference 读取');
      }
    }
  });

  test('keeps all canonical entry files non-empty and validates capability integrity', () => {
    for (const skill of CANONICAL_SKILLS) {
      const content = fs.readFileSync(path.join(ROOT, skill.path, 'SKILL.md'), 'utf8');
      const body = content.replace(/^---[\s\S]*?---\s*/, '').trim();
      expect(body.length).toBeGreaterThan(0);
    }
    const errors = [];
    validateCapabilityMigration(errors);
    expect(errors).toEqual([]);
    expect(validatePlugin().errors).toEqual([]);
  });
});
