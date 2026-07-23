const path = require('path');
const { SKILL_CATALOG, CANONICAL_SKILLS, resolveSkillId } = require('../skills/catalog');
const { getAllSkills, getSkillAliases, getSkillsByCategory, listSkillNames } = require('../skills/registry');
const { getSkillContent, listAvailableSkills, loadSkillsFromPlugin } = require('../skills/loader');
const { validatePlugin } = require('../scripts/validate-plugin');

describe('Skills catalog and loader', () => {
  test('catalog keeps legacy entries and freezes 22 canonical software and tool skills', () => {
    expect(CANONICAL_SKILLS).toHaveLength(22);
    expect(new Set(SKILL_CATALOG.map((skill) => skill.id)).size).toBe(SKILL_CATALOG.length);
    expect(new Set(SKILL_CATALOG.map((skill) => skill.legacyId)).size).toBe(SKILL_CATALOG.length);
    expect(CANONICAL_SKILLS.map((skill) => skill.id)).toEqual(expect.arrayContaining([
      'workflow-router', 'workflow-project-integration', 'app-architecture',
      'os-abstraction', 'rtos-freertos', 'bsp-adapter', 'bsp-hal-driver',
      'bsp-handler', 'core-mcu', 'driver-vendor', 'middleware-lvgl',
      'middleware-communication', 'middleware-storage', 'middleware-algorithms',
      'software-system', 'tools-build', 'tools-flash', 'tools-linker',
      'tools-debug', 'tools-observability', 'tools-quality', 'tools-release'
    ]));
    for (const skill of SKILL_CATALOG) {
      expect(skill.id).toMatch(/^[a-z][a-z0-9]*(?:-[a-z0-9]+){1,3}$/);
      const expectedPath = skill.archived
        ? skill.path
        : path.posix.join('skills', skill.layer, skill.id);
      expect(skill.path).toBe(expectedPath);
      if (skill.archived) {
        expect(skill.path).toMatch(/^archive\/(?:software-legacy\/[^/]+\/|tools-legacy\/)[^/]+$/);
      }
    }
  });

  test('legacy names resolve to their renamed skills', () => {
    expect(resolveSkillId('embedded')).toBe('workflow-router');
    expect(resolveSkillId('build-keil')).toBe('tools-build');
    expect(resolveSkillId('tool-build-keil')).toBe('tools-build');
    expect(resolveSkillId('gang-flash')).toBe('tools-flash');
    expect(resolveSkillId('debug-gdb-openocd')).toBe('tools-debug');
    expect(resolveSkillId('rtt-monitor')).toBe('tools-observability');
    expect(resolveSkillId('map-analyzer')).toBe('tools-quality');
    expect(resolveSkillId('ota-update-system')).toBe('tools-release');
    expect(resolveSkillId('bsp-peripheral-driver')).toBe('bsp-hal-driver');
    expect(resolveSkillId('protocol-mqtt')).toBe('middleware-communication');
    expect(resolveSkillId('middleware-fatfs')).toBe('middleware-storage');
    expect(resolveSkillId('not-a-skill')).toBeNull();
  });

  test('all 29 archived tool entries resolve to their canonical group', () => {
    const expectedGroup = (id) => {
      if (id.startsWith('tool-build-') || id.startsWith('build-')) return 'tools-build';
      if (id.startsWith('tool-flash-') || id.startsWith('flash-') || id === 'gang-flash') return 'tools-flash';
      if (id === 'tool-linker-scatter' || id === 'linker-scatter') return 'tools-linker';
      if (id.startsWith('debug-') || id === 'cmbacktrace-debug' || id === 'embedded-debugger-framework' || id === 'ozone-module' || id === 'rtos-debug') return 'tools-debug';
      if (id.startsWith('observability-') || ['elog-module', 'rtt-monitor', 'segger-rtt-module', 'serial-monitor', 'systemview-module'].includes(id)) return 'tools-observability';
      if (id.startsWith('quality-') || ['embedded-reviewer', 'map-analyzer', 'static-analysis', 'embedded-unity-testing'].includes(id)) return 'tools-quality';
      if (id.startsWith('release-') || ['ota-package', 'ota-update-system'].includes(id)) return 'tools-release';
      return null;
    };
    const archivedTools = SKILL_CATALOG.filter((skill) => skill.path.startsWith('archive/tools-legacy/'));
    expect(archivedTools).toHaveLength(29);
    for (const skill of archivedTools) {
      expect(resolveSkillId(skill.id)).toBe(expectedGroup(skill.id));
      expect(resolveSkillId(skill.legacyId)).toBe(expectedGroup(skill.legacyId));
    }
  });

  test('loader returns every catalog skill and accepts legacy lookup', () => {
    expect(listAvailableSkills()).toHaveLength(22);
    expect(Object.keys(loadSkillsFromPlugin())).toHaveLength(22);
    expect(getSkillContent('workflow-router')).toContain('name: workflow-router');
    expect(getSkillContent('embedded')).toContain('name: workflow-router');
  });

  test('registry is a compatibility view derived from catalog', () => {
    expect(Object.keys(getAllSkills())).toHaveLength(SKILL_CATALOG.length);
    expect(listSkillNames()).toEqual(Object.keys(getAllSkills()));
    expect(Object.keys(getSkillsByCategory('tools'))).toHaveLength(36);
    expect(getSkillAliases()['build-keil']).toBe('tools-build');
    expect(getSkillAliases()['tool-build-keil']).toBe('tools-build');
    expect(getSkillAliases()['embedded']).toBe('workflow-router');
  });

  test('plugin filesystem, frontmatter and manifest validate', () => {
    expect(validatePlugin().errors).toEqual([]);
  });

  test('legacy software is archived and operations are exposed as tools', () => {
    const archived = SKILL_CATALOG.filter((skill) => skill.archived);
    const archivedTools = archived.filter((skill) => skill.path.startsWith('archive/tools-legacy/'));
    const tools = SKILL_CATALOG.filter((skill) => skill.layer === 'tools' && skill.canonical);
    expect(archived).toHaveLength(80);
    expect(archivedTools).toHaveLength(29);
    expect(tools).toHaveLength(7);
    expect(archived.filter((skill) => skill.path.startsWith('archive/software-legacy/'))).toHaveLength(51);
    expect(tools.every((skill) => skill.path.startsWith('skills/tools/'))).toBe(true);
  });

  test('adapter rule is explicit in canonical software skills', () => {
    for (const id of ['core-mcu', 'driver-vendor', 'middleware-lvgl', 'middleware-communication', 'middleware-storage', 'middleware-algorithms']) {
      expect(getSkillContent(id)).not.toMatch(/Adapter\s*(?:接口|目录|实现|分层|设计)/);
    }
    expect(getSkillContent('bsp-adapter')).toMatch(/Wrapper/);
    expect(getSkillContent('os-abstraction')).toMatch(/Wrapper/);
  });
});
