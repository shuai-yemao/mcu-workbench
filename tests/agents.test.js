const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { validatePlugin, parseAgentFrontmatter, EXPECTED_AGENTS } = require('../scripts/validate-plugin');
const { resolveSkillId, SKILL_BY_ID, SKILL_BY_CANONICAL_ID } = require('../skills/catalog');

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

  test('declares only canonical or tracked installable mcu-workbench skills', () => {
    for (const file of fs.readdirSync(path.join(ROOT, 'agents')).filter((name) => name.endsWith('.md'))) {
      const content = fs.readFileSync(path.join(ROOT, 'agents', file), 'utf8');
      const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1];
      const parsed = parseAgentFrontmatter(frontmatter);
      const ids = [
        ...parsed.skills,
        ...[...content.matchAll(/mcu-workbench:([a-z0-9-]+)/g)].map((match) => match[1])
      ];
      for (const id of ids) {
        const canonical = SKILL_BY_CANONICAL_ID[id];
        const entry = SKILL_BY_ID[id];
        const installable = entry && path.join(ROOT, entry.path, 'SKILL.md');
        const tracked = installable && execFileSync('git', ['ls-files', '--', path.relative(ROOT, installable)], {
          cwd: ROOT,
          encoding: 'utf8'
        }).trim();
        expect(canonical || (installable && fs.existsSync(installable) && tracked)).toBeTruthy();
      }
    }
  });
});
