const path = require('path');
const fs = require('fs');
const { SKILL_CATALOG, CANONICAL_SKILLS, resolveSkillId } = require('../skills/catalog');
const { getAllSkills, getSkillAliases, getSkillsByCategory, listSkillNames } = require('../skills/registry');
const { getSkillContent, listAvailableSkills, loadSkillsFromPlugin } = require('../skills/loader');
const { validatePlugin } = require('../scripts/validate-plugin');

describe('Skills catalog and loader', () => {
  test('catalog keeps legacy entries and exposes 30 canonical software and tool skills', () => {
    expect(SKILL_CATALOG).toHaveLength(108);
    expect(CANONICAL_SKILLS).toHaveLength(30);
    expect(new Set(SKILL_CATALOG.map((skill) => skill.id)).size).toBe(SKILL_CATALOG.length);
    expect(new Set(SKILL_CATALOG.map((skill) => skill.legacyId)).size).toBe(SKILL_CATALOG.length);
    expect(CANONICAL_SKILLS.map((skill) => skill.id)).toEqual(expect.arrayContaining([
      'workflow-requirements-router', 'workflow-project-integration', 'app-architecture',
      'os-adapter', 'os-runtime', 'bsp-wrapper', 'bsp-port',
      'bsp-hal-driver', 'bsp-handler', 'core-mcu', 'mcu-platform', 'middleware-lvgl',
      'middleware-communication', 'middleware-storage', 'middleware-fal',
      'middleware-flashdb', 'middleware-letter-shell',
      'middleware-algorithms',
      'software-system', 'tools-build', 'tools-flash', 'tools-linker',
      'tools-debug', 'tools-observability', 'tools-quality', 'tools-git', 'tools-release',
      'tools-learning-tutor', 'workflow-final-review', 'workflow-claude-layering'
    ]));
    expect(CANONICAL_SKILLS.find((skill) => skill.id === 'app-architecture')).toMatchObject({
      layer: 'app',
      path: 'skills/app/app-architecture'
    });
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
    expect(resolveSkillId('embedded')).toBe('workflow-requirements-router');
    expect(resolveSkillId('workflow-router')).toBe('workflow-requirements-router');
    expect(resolveSkillId('build-keil')).toBe('tools-build');
    expect(resolveSkillId('tool-build-keil')).toBe('tools-build');
    expect(resolveSkillId('gang-flash')).toBe('tools-flash');
    expect(resolveSkillId('debug-gdb-openocd')).toBe('tools-debug');
    expect(resolveSkillId('rtt-monitor')).toBe('tools-observability');
    expect(resolveSkillId('map-analyzer')).toBe('tools-quality');
    expect(resolveSkillId('ota-update-system')).toBe('tools-release');
    expect(resolveSkillId('bsp-peripheral-driver')).toBe('bsp-hal-driver');
    expect(resolveSkillId('os-abstraction')).toBe('os-adapter');
    expect(resolveSkillId('rtos-freertos')).toBe('os-runtime');
    expect(resolveSkillId('freertos-module')).toBe('os-runtime');
    expect(resolveSkillId('bsp-adapter')).toBe('bsp-port');
    expect(resolveSkillId('bsp-device-adaptation')).toBe('bsp-port');
    expect(resolveSkillId('bsp-platform-adapter')).toBe('bsp-port');
    expect(resolveSkillId('peripheral-driver')).toBe('bsp-port');
    expect(resolveSkillId('embedded-adapter')).toBe('bsp-port');
    expect(resolveSkillId('driver-vendor')).toBe('mcu-platform');
    expect(resolveSkillId('platform-stm32-hal')).toBe('mcu-platform');
    expect(resolveSkillId('platform-stm32-spl')).toBe('mcu-platform');
    expect(resolveSkillId('stm32-hal-development')).toBe('mcu-platform');
    expect(resolveSkillId('stm32-spl-development')).toBe('mcu-platform');
    expect(resolveSkillId('platform-cortex-registers')).toBe('core-mcu');
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
    expect(listAvailableSkills()).toHaveLength(30);
    expect(Object.keys(loadSkillsFromPlugin())).toHaveLength(30);
    expect(getSkillContent('workflow-requirements-router')).toContain('name: workflow-requirements-router');
    expect(getSkillContent('workflow-router')).toContain('name: workflow-requirements-router');
    expect(getSkillContent('embedded')).toContain('name: workflow-requirements-router');
    expect(getSkillContent('learning-tutor')).toContain('name: tools-learning-tutor');
    expect(getSkillContent('os-abstraction')).toContain('name: os-adapter');
    expect(getSkillContent('rtos-freertos')).toContain('name: os-runtime');
    expect(getSkillContent('bsp-adapter')).toContain('name: bsp-port');
    expect(getSkillContent('driver-vendor')).toContain('name: mcu-platform');
  });

  test('workflow router emits a bounded, canonical routing contract', () => {
    const router = getSkillContent('workflow-requirements-router');
    expect(router).toContain('## 路由单（固定输出）');
    expect(router).toContain('必经下游：workflow-project-integration');
    expect(router).toContain('建议主 Skill：<由 project-integration 分发的 canonical ID 参考；未完成 RCP 时为空>');
    expect(router).toContain('交接 Skill：<0 至 2 个 canonical ID>');
    expect(router).toContain('workflow-project-integration');
    expect(router).toContain('workflow-final-review');
    expect(router).toContain('tools-quality');
    expect(router).toContain('不引用归档 Skill 作为 active 路由目标');
  });

  test('project integration reviews implementation plans before code generation', () => {
    const integration = getSkillContent('workflow-project-integration');
    const reviewPackage = fs.readFileSync(path.join(
      __dirname,
      '..',
      'skills',
      'workflow',
      'workflow-project-integration',
      'references',
      'implementation-plan-review-package.md'
    ), 'utf8');
    expect(integration).toContain('## 实现方案审查与代码前门禁');
    expect(integration).toContain('需求约束包（RCP）');
    expect(integration).toContain('唯一接收方');
    expect(integration).toContain('Router 固定交付需求约束包（RCP）');
    expect(integration).toContain('既有需求实现方案');
    expect(integration).toContain('embedded-lead');
    expect(integration).toContain('system-architect');
    expect(integration).toContain('firmware-engineer');
    expect(integration).toContain('verification-engineer');
    expect(integration).toContain('hardware-integration');
    expect(integration).toContain('toolchain-engineer');
    expect(integration).toContain('knowledge-engineer');
    expect(integration).toContain('`confirmed`、`user-confirmed`、`inferred` 或 `unverified`');
    expect(integration).toContain('可采用');
    expect(integration).toContain('需修订');
    expect(integration).toContain('阻塞风险');
    expect(integration).toContain('CubeMX');
    expect(integration).toContain('implementation-plan-review-package.md');
    expect(integration).toContain('workflow-final-review');
    expect(integration).toContain('不得进入代码阶段');
    expect(reviewPackage).toContain('## 1. 工程现状表');
    expect(reviewPackage).toContain('## 2. 文件施工清单');
    expect(reviewPackage).toContain('## 3. 代码生成约束清单');
    expect(reviewPackage).toContain('## 4. 验收测试清单');
    expect(reviewPackage).toContain('可采用');
    expect(reviewPackage).toContain('需修订');
    expect(reviewPackage).toContain('阻塞风险');
    expect(reviewPackage).toContain('代码阶段判定');
  });

  test('registry is a compatibility view derived from catalog', () => {
    expect(Object.keys(getAllSkills())).toHaveLength(SKILL_CATALOG.length);
    expect(listSkillNames()).toEqual(Object.keys(getAllSkills()));
    expect(Object.keys(getSkillsByCategory('tools'))).toHaveLength(38);
    expect(getSkillAliases()['build-keil']).toBe('tools-build');
    expect(getSkillAliases()['tool-build-keil']).toBe('tools-build');
    expect(getSkillAliases()['embedded']).toBe('workflow-requirements-router');
    expect(getSkillAliases()['workflow-router']).toBe('workflow-requirements-router');
  });

  test('module boundary: catalog holds facts, registry derives the view, loader reads disk', () => {
    const catalog = require('../skills/catalog');
    const registry = require('../skills/registry');
    const loader = require('../skills/loader');

    for (const fact of ['SKILL_CATALOG', 'CANONICAL_SKILLS', 'MIGRATION_MAP', 'SKILL_BY_ID', 'SKILL_BY_CANONICAL_ID', 'SKILL_BY_LEGACY_ID', 'resolveSkillId']) {
      expect(catalog).toHaveProperty(fact);
    }
    for (const derived of ['SKILLS', 'getAllSkills', 'getSkillsByCategory', 'getSkillsByPlatform', 'getSkillAliases', 'listSkillNames']) {
      expect(catalog).not.toHaveProperty(derived);
      expect(registry).toHaveProperty(derived);
    }
    for (const diskApi of ['loadSkillsFromPlugin', 'getSkillContent', 'listAvailableSkills', 'parseSkillMeta']) {
      expect(loader).toHaveProperty(diskApi);
    }

    expect(Object.keys(registry.getAllSkills())).toHaveLength(catalog.SKILL_CATALOG.length);
    expect(registry.getAllSkills()['tools-debug']).toMatchObject({ canonical: true, archived: false });
    expect(registry.getAllSkills()['tools-debug'].category).toBe('tools');
  });

  test('plugin filesystem, frontmatter and manifest validate', () => {
    expect(validatePlugin().errors).toEqual([]);
  });

  test('legacy software is archived and operations are exposed as tools', () => {
    const archived = SKILL_CATALOG.filter((skill) => skill.archived);
    const archivedTools = archived.filter((skill) => skill.path.startsWith('archive/tools-legacy/'));
    const tools = SKILL_CATALOG.filter((skill) => skill.layer === 'tools' && skill.canonical);
    expect(archived).toHaveLength(76);
    expect(archivedTools).toHaveLength(29);
    expect(tools).toHaveLength(9);
    expect(archived.filter((skill) => skill.path.startsWith('archive/software-legacy/'))).toHaveLength(47);
    expect(tools.every((skill) => skill.path.startsWith('skills/tools/'))).toBe(true);
  });

  test('adapter rule is explicit in canonical software skills', () => {
    for (const id of ['core-mcu', 'mcu-platform', 'middleware-lvgl', 'middleware-communication', 'middleware-storage', 'middleware-fal', 'middleware-flashdb', 'middleware-letter-shell', 'middleware-algorithms']) {
      expect(getSkillContent(id)).not.toMatch(/Adapter\s*(?:接口|目录|实现|分层|设计)/);
    }
    expect(getSkillContent('bsp-wrapper')).toMatch(/Wrapper/);
    expect(getSkillContent('bsp-port')).toMatch(/Port/);
    expect(getSkillContent('os-adapter')).toMatch(/Wrapper/);
  });
});
