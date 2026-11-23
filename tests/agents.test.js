const fs = require('fs');
const path = require('path');
const { validatePlugin, parseAgentFrontmatter, EXPECTED_AGENTS } = require('../scripts/validate-plugin');
const { resolveSkillId, SKILL_BY_CANONICAL_ID } = require('../skills/catalog');

const ROOT = path.resolve(__dirname, '..');

describe('Claude Code agent definitions', () => {
  test('contains exactly the seven registered agents', () => {
    const files = fs.readdirSync(path.join(ROOT, 'agents')).filter((name) => name.endsWith('.md'));
    expect(files).toHaveLength(7);
    expect(new Set(files.map((name) => path.basename(name, '.md')))).toEqual(EXPECTED_AGENTS);
    expect(validatePlugin().errors).toEqual([]);
    expect(validatePlugin().summary.agents).toBe(7);
  });

  test('agent skill references resolve to canonical skills', () => {
    for (const file of fs.readdirSync(path.join(ROOT, 'agents')).filter((name) => name.endsWith('.md'))) {
      const content = fs.readFileSync(path.join(ROOT, 'agents', file), 'utf8');
      const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1];
      const parsed = parseAgentFrontmatter(frontmatter);
      for (const skill of parsed.skills) {
        const resolved = resolveSkillId(skill);
        expect(SKILL_BY_CANONICAL_ID[resolved] || resolved.startsWith('hardware-')).toBeTruthy();
      }
    }
  });
});
