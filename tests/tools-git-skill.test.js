const fs = require('fs');
const path = require('path');
const { CANONICAL_SKILLS, resolveSkillId } = require('../skills/catalog');
const { getSkillContent } = require('../skills/loader');

const ROOT = path.resolve(__dirname, '..');
const SKILL_ROOT = path.join(ROOT, 'skills', 'tools', 'tools-git');
const REFERENCE_FILES = [
  'git-safety-contract.md',
  'git-lifecycle-workflow.md',
  'git-embedded-handoff.md'
];

describe('tools-git skill contract', () => {
  test('registers the canonical Git management skill without a legacy alias', () => {
    expect(CANONICAL_SKILLS.filter((skill) => skill.id === 'tools-git')).toHaveLength(1);
    expect(resolveSkillId('tools-git')).toBe('tools-git');
    expect(resolveSkillId('git-management')).toBeNull();
    expect(getSkillContent('tools-git')).toContain('name: tools-git');
  });

  test('links its three focused Git references from the main entry', () => {
    const content = fs.readFileSync(path.join(SKILL_ROOT, 'SKILL.md'), 'utf8');
    for (const file of REFERENCE_FILES) {
      expect(fs.existsSync(path.join(SKILL_ROOT, 'references', file))).toBe(true);
      expect(content).toContain(`references/${file}`);
    }
  });

  test('preserves the confirmed safety, branch, commit, and handoff contract', () => {
    const skill = fs.readFileSync(path.join(SKILL_ROOT, 'SKILL.md'), 'utf8');
    const safety = fs.readFileSync(path.join(SKILL_ROOT, 'references', 'git-safety-contract.md'), 'utf8');
    const lifecycle = fs.readFileSync(path.join(SKILL_ROOT, 'references', 'git-lifecycle-workflow.md'), 'utf8');
    const handoff = fs.readFileSync(path.join(SKILL_ROOT, 'references', 'git-embedded-handoff.md'), 'utf8');

    expect(skill).toContain('执行边界');
    expect(skill).toContain('未执行的高风险操作');
    expect(safety).toContain('git add -A');
    expect(safety).toContain('逐项确认');
    expect(lifecycle).toContain('<type>/<JIRA-KEY>-<scope>-<topic>');
    expect(lifecycle).toContain('type(scope): 中文摘要');
    expect(lifecycle).toContain('验证待补');
    expect(handoff).toContain('tools-quality');
    expect(handoff).toContain('tools-build');
    expect(handoff).toContain('tools-release');
    expect(handoff).toContain('不替代');
  });
});
