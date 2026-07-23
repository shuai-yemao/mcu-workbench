const path = require('path');
const { SKILL_CATALOG, CANONICAL_SKILLS, resolveSkillId } = require('../skills/catalog');
const { getSkillContent, listAvailableSkills, loadSkillsFromPlugin } = require('../skills/loader');
const { validatePlugin } = require('../scripts/validate-plugin');

describe('Skills catalog and loader', () => {
  test('catalog keeps legacy entries and freezes 15 canonical software skills', () => {
    expect(CANONICAL_SKILLS).toHaveLength(15);
    expect(new Set(SKILL_CATALOG.map((skill) => skill.id)).size).toBe(SKILL_CATALOG.length);
    expect(new Set(SKILL_CATALOG.map((skill) => skill.legacyId)).size).toBe(SKILL_CATALOG.length);
    expect(CANONICAL_SKILLS.map((skill) => skill.id)).toEqual(expect.arrayContaining([
      'workflow-router', 'workflow-project-integration', 'app-architecture',
      'os-abstraction', 'rtos-freertos', 'bsp-adapter', 'bsp-hal-driver',
      'bsp-handler', 'core-mcu', 'driver-vendor', 'middleware-lvgl',
      'middleware-communication', 'middleware-storage', 'middleware-algorithms',
      'software-system'
    ]));
    for (const skill of SKILL_CATALOG) {
      expect(skill.id).toMatch(/^[a-z][a-z0-9]*(?:-[a-z0-9]+){1,3}$/);
      expect(skill.path).toBe(path.posix.join('skills', skill.layer, skill.id));
    }
  });

  test('legacy names resolve to their renamed skills', () => {
    expect(resolveSkillId('embedded')).toBe('workflow-router');
    expect(resolveSkillId('build-keil')).toBe('tool-build-keil');
    expect(resolveSkillId('bsp-peripheral-driver')).toBe('bsp-hal-driver');
    expect(resolveSkillId('protocol-mqtt')).toBe('middleware-communication');
    expect(resolveSkillId('middleware-fatfs')).toBe('middleware-storage');
    expect(resolveSkillId('not-a-skill')).toBeNull();
  });

  test('loader returns every catalog skill and accepts legacy lookup', () => {
    expect(listAvailableSkills()).toHaveLength(15);
    expect(Object.keys(loadSkillsFromPlugin())).toHaveLength(15);
    expect(getSkillContent('workflow-router')).toContain('name: workflow-router');
    expect(getSkillContent('embedded')).toContain('name: workflow-router');
  });

  test('plugin filesystem, frontmatter and manifest validate', () => {
    expect(validatePlugin().errors).toEqual([]);
  });

  test('adapter rule is explicit in canonical software skills', () => {
    for (const id of ['core-mcu', 'driver-vendor', 'middleware-lvgl', 'middleware-communication', 'middleware-storage', 'middleware-algorithms']) {
      expect(getSkillContent(id)).not.toMatch(/Adapter\s*(?:接口|目录|实现|分层|设计)/);
    }
    expect(getSkillContent('bsp-adapter')).toMatch(/Wrapper/);
    expect(getSkillContent('os-abstraction')).toMatch(/Wrapper/);
  });
});
