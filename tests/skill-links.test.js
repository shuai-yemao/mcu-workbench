const fs = require('fs');
const os = require('os');
const path = require('path');

const { validateSkillLinks } = require('../lib/skill-links');

describe('Skill Markdown link validation', () => {
  let temporaryRoot;

  beforeEach(() => {
    temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mcu-workbench-links-'));
  });

  afterEach(() => {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  });

  test('reports real missing links and ignores code examples', () => {
    const skillRoot = path.join(temporaryRoot, 'skills');
    fs.mkdirSync(path.join(skillRoot, 'demo', 'references'), { recursive: true });
    fs.writeFileSync(path.join(skillRoot, 'demo', 'references', 'ok.md'), '# ok\n');
    fs.writeFileSync(path.join(skillRoot, 'demo', 'SKILL.md'), [
      '[valid](references/ok.md)',
      '[missing](references/missing.md)',
      '`[inline-example](references/inline-missing.md)`',
      '```markdown',
      '[fenced-example](references/fenced-missing.md)',
      '```',
      '[web](https://example.com)',
      '[anchor](#section)'
    ].join('\n'));

    const result = validateSkillLinks({
      root: skillRoot,
      boundaryRoot: temporaryRoot
    });

    expect(result.findings).toEqual([
      expect.objectContaining({
        ruleId: 'LINK_NOT_FOUND',
        file: 'demo/SKILL.md',
        line: 2,
        target: 'references/missing.md'
      })
    ]);
  });

  test('rejects links that escape the declared repository boundary', () => {
    const skillRoot = path.join(temporaryRoot, 'skills');
    fs.mkdirSync(path.join(skillRoot, 'demo'), { recursive: true });
    fs.writeFileSync(path.join(skillRoot, 'demo', 'SKILL.md'), '[outside](../../../outside.md)\n');

    const result = validateSkillLinks({
      root: skillRoot,
      boundaryRoot: temporaryRoot
    });

    expect(result.findings).toEqual([
      expect.objectContaining({ ruleId: 'LINK_OUTSIDE_ROOT' })
    ]);
  });
});
