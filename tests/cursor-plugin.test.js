const fs = require('fs');
const path = require('path');

const { SKILL_CATALOG } = require('../skills/catalog');
const { parseSkillMeta } = require('../skills/loader');
const {
  CURSOR_NAME,
  ROOT,
  buildPlan,
  cursorName,
  diffAgainstDisk,
  discoverInstalledSkills
} = require('../scripts/sync-cursor-plugin');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('Cursor plugin adapter', () => {
  test('discovers every canonical skill with a Cursor-legal name', () => {
    const plan = buildPlan();
    expect(plan.errors).toEqual([]);

    const activeSkills = SKILL_CATALOG.filter((skill) => !skill.archived);
    const discovered = discoverInstalledSkills(ROOT, plan.manifest.skills);
    expect(discovered).toHaveLength(activeSkills.length);
    expect(new Set(discovered.map((skill) => skill.name)).size).toBe(activeSkills.length);

    for (const skill of discovered) {
      expect(skill.name).toMatch(CURSOR_NAME);
      expect(skill.description.length).toBeGreaterThan(0);
      expect(skill.description.length).toBeLessThanOrEqual(1024);
    }

    for (const skill of activeSkills) {
      const expectedName = CURSOR_NAME.test(skill.id) ? skill.id : cursorName(skill.id);
      expect(discovered.map((item) => item.name)).toContain(expectedName);
    }
  });

  test('alias skills point at the canonical skill and keep the original id', () => {
    const plan = buildPlan();
    expect(plan.aliases.length).toBeGreaterThan(0);
    for (const alias of plan.aliases) {
      const meta = parseSkillMeta(alias.content);
      expect(meta.name).toMatch(CURSOR_NAME);
      expect(meta.name).not.toContain('_');
      expect(alias.content).toMatch(/\[[a-z0-9_]+\]\(\.\.\/\.\.\/skills\/.+\/SKILL\.md\)/);
      const target = alias.content.match(/\((\.\.\/\.\.\/skills\/.+\/SKILL\.md)\)/)[1];
      expect(fs.existsSync(path.resolve(ROOT, ALIAS_DIR(alias.path), target))).toBe(true);
    }
  });

  test('checked-in manifest and aliases match the generator', () => {
    expect(diffAgainstDisk(buildPlan())).toEqual([]);
    const manifest = JSON.parse(read('.cursor-plugin/plugin.json'));
    expect(manifest.name).toBe('mcu-workbench');
    expect(manifest.version).toBe(JSON.parse(read('package.json')).version);
    expect(manifest.skills).toEqual(expect.arrayContaining([
      './skills/workflow',
      './skills/app',
      './skills/tools',
      './skills/hardware',
      './cursor-skills'
    ]));
    expect(manifest.skills).not.toContain('./skills');
    expect(manifest.skills).not.toContain('./skills/platform');
  });

  test('workflow input and output contract is available to Cursor', () => {
    const rule = read('rules/mcu-workflow-io.mdc');
    const command = read('commands/mcu-workflow.md');
    for (const text of [rule, command]) {
      expect(text).toMatch(/workflow-requirements-router/);
      expect(text).toMatch(/00_Docs\/04_需求文档/);
      expect(text).toMatch(/spec\.md/);
      expect(text).toMatch(/plan\.md/);
      expect(text).toMatch(/task\.md/);
    }
    expect(rule).toMatch(/alwaysApply:\s*true/);

    const handoff = [
      ['skills/workflow/workflow-requirements-router/SKILL.md', /workflow-requirements-challenge/],
      ['skills/workflow/workflow-requirements-challenge/SKILL.md', /workflow-review-gate/],
      ['skills/workflow/workflow-review-gate/SKILL.md', /00_Docs\/04_需求文档/],
      ['skills/workflow/workflow-integration-plan/SKILL.md', /plan\.md/],
      ['skills/workflow/workflow-task-breakdown/SKILL.md', /task\.md/],
      ['skills/workflow/workflow-task-execution/SKILL.md', /spec\.md/],
      ['skills/workflow/workflow-final-review/SKILL.md', /spec\.md/]
    ];
    for (const [file, pattern] of handoff) expect(read(file)).toMatch(pattern);

    for (const agent of fs.readdirSync(path.join(ROOT, 'agents')).filter((name) => name.endsWith('.md'))) {
      const meta = parseSkillMeta(read(`agents/${agent}`));
      expect(meta.name).toMatch(CURSOR_NAME);
      expect(meta.description.length).toBeGreaterThan(0);
    }
  });
});

function ALIAS_DIR(relativeFile) {
  return path.dirname(relativeFile);
}
