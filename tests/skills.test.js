const path = require('path');
const { SKILL_CATALOG, resolveSkillId } = require('../skills/catalog');
const { getSkillContent, listAvailableSkills, loadSkillsFromPlugin } = require('../skills/loader');
const { validatePlugin } = require('../scripts/validate-plugin');

describe('Skills catalog and loader', () => {
  test('catalog has 79 unique normalized skill names', () => {
    expect(SKILL_CATALOG).toHaveLength(79);
    expect(new Set(SKILL_CATALOG.map((skill) => skill.id)).size).toBe(79);
    expect(new Set(SKILL_CATALOG.map((skill) => skill.legacyId)).size).toBe(79);
    for (const skill of SKILL_CATALOG) {
      expect(skill.id).toMatch(/^[a-z][a-z0-9]*(?:-[a-z0-9]+){1,3}$/);
      expect(skill.path).toBe(path.posix.join('skills', skill.layer, skill.id));
    }
  });

  test('legacy names resolve to their renamed skills', () => {
    expect(resolveSkillId('embedded')).toBe('workflow-router');
    expect(resolveSkillId('build-keil')).toBe('tool-build-keil');
    expect(resolveSkillId('bsp-peripheral-driver')).toBe('bsp-device-driver');
    expect(resolveSkillId('not-a-skill')).toBeNull();
  });

  test('loader returns every catalog skill and accepts legacy lookup', () => {
    expect(listAvailableSkills()).toHaveLength(79);
    expect(Object.keys(loadSkillsFromPlugin())).toHaveLength(79);
    expect(getSkillContent('workflow-router')).toContain('name: workflow-router');
    expect(getSkillContent('embedded')).toContain('name: workflow-router');
  });

  test('plugin filesystem, frontmatter and manifest validate', () => {
    expect(validatePlugin().errors).toEqual([]);
  });
});
