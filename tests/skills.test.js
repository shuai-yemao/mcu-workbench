const path = require('path');
const fs = require('fs');
const { SKILL_CATALOG, CANONICAL_SKILLS, resolveSkillId } = require('../skills/catalog');
const { getAllSkills, getSkillAliases, getSkillsByCategory, listSkillNames } = require('../skills/registry');
const { getSkillContent, listAvailableSkills, loadSkillsFromPlugin } = require('../skills/loader');
const { validatePlugin } = require('../scripts/validate-plugin');

describe('Skills catalog and loader', () => {
  test('catalog keeps active entries and exposes 43 canonical software and tool skills', () => {
    expect(SKILL_CATALOG).toHaveLength(45);
    expect(CANONICAL_SKILLS).toHaveLength(43);
    expect(new Set(SKILL_CATALOG.map((skill) => skill.id)).size).toBe(SKILL_CATALOG.length);
    expect(new Set(SKILL_CATALOG.map((skill) => skill.legacyId)).size).toBe(SKILL_CATALOG.length);
    expect(CANONICAL_SKILLS.map((skill) => skill.id)).toEqual(expect.arrayContaining([
      'workflow-requirements-router', 'workflow-review-gate', 'workflow-integration-plan', 'app-architecture',
      'platform_mcu', 'platform_os', 'platform_bsp', 'platform_common', 'platform_middleware', 'impl_os', 'impl_board',
      'impl_bsp', 'impl_middleware', 'vendor_stm32', 'vendor_lvgl',
      'vendor_stack', 'vendor_fatfs', 'vendor_fal',
      'vendor_flashdb', 'vendor_letter_shell',
      'vendor_dsp',
      'service_system', 'service_battery', 'service_backlight', 'service_calendar', 'service_diagnosis',
      'service_log', 'service_ota', 'service_power', 'service_sensor', 'service_storage', 'service_watchdog',
      'tools-build', 'tools-flash', 'tools-linker',
      'tools-debug', 'tools-observability', 'tools-quality', 'tools-git', 'tools-release',
      'tools-learning-tutor', 'workflow-final-review', 'workflow-claude-layering'
    ]));
    expect(CANONICAL_SKILLS.find((skill) => skill.id === 'app-architecture')).toMatchObject({
      layer: 'app',
      path: 'skills/app/app-architecture'
    });
    for (const skill of SKILL_CATALOG) {
      expect(skill.id).toMatch(/^[a-z][a-z0-9]*(?:[-_][a-z0-9]+){1,3}$/);
      expect(skill.path).toBe(path.posix.join('skills', skill.layer, skill.id));
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
    expect(resolveSkillId('bsp-peripheral-driver')).toBe('impl_bsp');
    expect(resolveSkillId('os-abstraction')).toBe('platform_os');
    expect(resolveSkillId('os-adapter')).toBe('platform_os');
    expect(resolveSkillId('core-mcu')).toBe('platform_mcu');
    expect(resolveSkillId('bsp-wrapper')).toBe('platform_bsp');
    expect(resolveSkillId('rtos-freertos')).toBe('impl_os');
    expect(resolveSkillId('freertos-module')).toBe('impl_os');
    expect(resolveSkillId('bsp-adapter')).toBe('impl_board');
    expect(resolveSkillId('bsp-device-adaptation')).toBe('impl_board');
    expect(resolveSkillId('bsp-platform-adapter')).toBe('impl_board');
    expect(resolveSkillId('peripheral-driver')).toBe('impl_board');
    expect(resolveSkillId('embedded-adapter')).toBe('impl_board');
    expect(resolveSkillId('driver-vendor')).toBe('vendor_stm32');
    expect(resolveSkillId('platform-stm32-hal')).toBe('vendor_stm32');
    expect(resolveSkillId('platform-stm32-spl')).toBe('vendor_stm32');
    expect(resolveSkillId('stm32-hal-development')).toBe('vendor_stm32');
    expect(resolveSkillId('stm32-spl-development')).toBe('vendor_stm32');
    expect(resolveSkillId('mcu-platform')).toBe('vendor_stm32');
    expect(resolveSkillId('platform-cortex-registers')).toBe('platform_mcu');
    expect(resolveSkillId('protocol-mqtt')).toBe('vendor_stack');
    expect(resolveSkillId('middleware-fatfs')).toBe('vendor_fatfs');
    expect(resolveSkillId('middleware-lvgl')).toBe('vendor_lvgl');
    expect(resolveSkillId('middleware-algorithms')).toBe('vendor_dsp');
    expect(resolveSkillId('not-a-skill')).toBeNull();
  });

  test('loader returns every catalog skill and accepts legacy lookup', () => {
    expect(listAvailableSkills()).toHaveLength(43);
    expect(Object.keys(loadSkillsFromPlugin())).toHaveLength(43);
    expect(getSkillContent('workflow-requirements-router')).toContain('name: workflow-requirements-router');
    expect(getSkillContent('workflow-router')).toContain('name: workflow-requirements-router');
    expect(getSkillContent('embedded')).toContain('name: workflow-requirements-router');
    expect(getSkillContent('learning-tutor')).toContain('name: tools-learning-tutor');
    expect(getSkillContent('os-adapter')).toContain('name: platform_os');
    expect(getSkillContent('rtos-freertos')).toContain('name: impl_os');
    expect(getSkillContent('bsp-adapter')).toContain('name: impl_board');
    expect(getSkillContent('driver-vendor')).toContain('name: vendor_stm32');
  });

  test('workflow router emits a bounded, canonical routing contract', () => {
    const router = getSkillContent('workflow-requirements-router');
    expect(router).toContain('## 路由单（固定输出）');
    expect(router).toContain('必经下游：workflow-review-gate');
    expect(router).toContain('实现 Skill：<由 workflow-integration-plan 分发的唯一 canonical ID；未完成 RCP 时为空>');
    expect(router).toContain('只分发一个实现层 Skill；执行 agent 在执行中如需其他 Skill 的领域知识（分层约束、验收依据等），按需自行查阅，不预分配参考清单、不设数量上限');
    expect(router).not.toContain('参考 Skill');
    expect(router).toContain('workflow-review-gate');
    expect(router).toContain('workflow-integration-plan');
    expect(router).toContain('workflow-final-review');
    expect(router).toContain('tools-quality');
    expect(router).toContain('不引用归档 Skill 作为 active 路由目标');
  });

  test('review gate reviews implementation plans before code generation', () => {
    const integration = getSkillContent('workflow-review-gate');
    const reviewPackage = fs.readFileSync(path.join(
      __dirname,
      '..',
      'skills',
      'workflow',
      'workflow-review-gate',
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
    expect(integration).toContain('必选产品文档输出（BRD / PRD / SRSys）');
    expect(integration).toContain('docs/requirements/');
    expect(integration).toContain('SRSys');
    expect(reviewPackage).toContain('## 5. 产品文档映射（BRD / PRD / SRSys）');
    expect(reviewPackage).toContain('<request_id>-BRD.md');
    expect(reviewPackage).toContain('<request_id>-PRD.md');
    expect(reviewPackage).toContain('<request_id>-SRSys.md');
  });

  test('integration plan dispatches a single implementation skill after gate clearance', () => {
    const plan = getSkillContent('workflow-integration-plan');
    expect(plan).toContain('只分发一个实现层 Skill');
    expect(plan).toContain('审查包门禁状态非放行不得分发');
    expect(plan).toContain('workflow-final-review');
    expect(plan).toContain('现状表');
    expect(plan).toContain('文件修改表');
  });

  test('registry is a compatibility view derived from catalog', () => {
    expect(Object.keys(getAllSkills())).toHaveLength(SKILL_CATALOG.length);
    expect(listSkillNames()).toEqual(Object.keys(getAllSkills()));
    expect(Object.keys(getSkillsByCategory('tools'))).toHaveLength(9);
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
    expect(registry.getAllSkills()['tools-debug'].layer).toBe('tools');
    expect(registry.getAllSkills()['tools-debug'].category).toBe('tools');
  });

  test('plugin filesystem, frontmatter and manifest validate', () => {
    expect(validatePlugin().errors).toEqual([]);
  });

  test('no archived entries remain and operations are exposed as tools', () => {
    const archived = SKILL_CATALOG.filter((skill) => skill.archived);
    const tools = SKILL_CATALOG.filter((skill) => skill.layer === 'tools' && skill.canonical);
    expect(archived).toHaveLength(0);
    expect(tools).toHaveLength(9);
    expect(SKILL_CATALOG.filter((skill) => skill.layer === 'hardware')).toHaveLength(2);
    expect(tools.every((skill) => skill.path.startsWith('skills/tools/'))).toBe(true);
  });

  test('adapter rule is explicit in canonical software skills', () => {
    for (const id of ['platform_mcu', 'platform_common', 'platform_middleware', 'vendor_stm32', 'vendor_lvgl', 'vendor_stack', 'vendor_fatfs', 'vendor_fal', 'vendor_flashdb', 'vendor_letter_shell', 'vendor_dsp']) {
      expect(getSkillContent(id)).not.toMatch(/Adapter\s*(?:接口|目录|实现|分层|设计)/);
    }
    expect(getSkillContent('platform_bsp')).toMatch(/函数表|函数表|注册/);
    expect(getSkillContent('platform_common')).toMatch(/统一错误码|对象模型|生命周期/);
    expect(getSkillContent('platform_middleware')).toMatch(/log|fs|kv|crypto|gui|comm/);
    expect(getSkillContent('impl_board')).toMatch(/组合根|Port/);
    expect(getSkillContent('platform_os')).toMatch(/osal_/);
  });
});
