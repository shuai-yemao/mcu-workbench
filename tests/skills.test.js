const path = require('path');
const fs = require('fs');
const { SKILL_CATALOG, CANONICAL_SKILLS, resolveSkillId } = require('../skills/catalog');
const { getAllSkills, getSkillAliases, getSkillsByCategory, listSkillNames } = require('../skills/registry');
const { getSkillContent, listAvailableSkills, loadSkillsFromPlugin } = require('../skills/loader');
const { validatePlugin } = require('../scripts/validate-plugin');

describe('Skills catalog and loader', () => {
  test('catalog keeps active entries and exposes 47 canonical software and tool skills', () => {
    expect(SKILL_CATALOG).toHaveLength(49);
    expect(CANONICAL_SKILLS).toHaveLength(47);
    expect(new Set(SKILL_CATALOG.map((skill) => skill.id)).size).toBe(SKILL_CATALOG.length);
    expect(new Set(SKILL_CATALOG.map((skill) => skill.legacyId)).size).toBe(SKILL_CATALOG.length);
    expect(CANONICAL_SKILLS.map((skill) => skill.id)).toEqual(expect.arrayContaining([
      'workflow-requirements-router', 'workflow-requirements-challenge', 'workflow-review-gate', 'workflow-integration-plan', 'workflow-task-breakdown', 'workflow-task-execution', 'app-architecture',
      'platform_mcu', 'platform_os', 'platform_bsp', 'platform_common', 'platform_middleware', 'impl_os', 'impl_board',
      'impl_bsp', 'impl_middleware', 'vendor_mcu', 'vendor_rtos', 'vendor_lvgl',
      'vendor_stack', 'vendor_fatfs', 'vendor_fal',
      'vendor_flashdb', 'vendor_letter_shell',
      'vendor_algorithm',
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
    expect(resolveSkillId('driver-vendor')).toBe('vendor_mcu');
    expect(resolveSkillId('platform-stm32-hal')).toBe('vendor_mcu');
    expect(resolveSkillId('platform-stm32-spl')).toBe('vendor_mcu');
    expect(resolveSkillId('stm32-hal-development')).toBe('vendor_mcu');
    expect(resolveSkillId('stm32-spl-development')).toBe('vendor_mcu');
    expect(resolveSkillId('mcu-platform')).toBe('vendor_mcu');
    expect(resolveSkillId('vendor_stm32')).toBe('vendor_mcu');
    expect(resolveSkillId('vendor-rtos')).toBe('vendor_rtos');
    expect(resolveSkillId('platform-cortex-registers')).toBe('platform_mcu');
    expect(resolveSkillId('protocol-mqtt')).toBe('vendor_stack');
    expect(resolveSkillId('middleware-fatfs')).toBe('vendor_fatfs');
    expect(resolveSkillId('middleware-lvgl')).toBe('vendor_lvgl');
    expect(resolveSkillId('middleware-algorithms')).toBe('vendor_algorithm');
    expect(resolveSkillId('vendor_dsp')).toBe('vendor_algorithm');
    expect(resolveSkillId('not-a-skill')).toBeNull();
  });

  test('loader returns every catalog skill and accepts legacy lookup', () => {
    expect(listAvailableSkills()).toHaveLength(47);
    expect(Object.keys(loadSkillsFromPlugin())).toHaveLength(47);
    expect(getSkillContent('workflow-requirements-router')).toContain('name: workflow-requirements-router');
    expect(getSkillContent('workflow-router')).toContain('name: workflow-requirements-router');
    expect(getSkillContent('embedded')).toContain('name: workflow-requirements-router');
    expect(getSkillContent('learning-tutor')).toContain('name: tools-learning-tutor');
    expect(getSkillContent('os-adapter')).toContain('name: platform_os');
    expect(getSkillContent('rtos-freertos')).toContain('name: impl_os');
    expect(getSkillContent('bsp-adapter')).toContain('name: impl_board');
    expect(getSkillContent('driver-vendor')).toContain('name: vendor_mcu');
    expect(getSkillContent('vendor_stm32')).toContain('name: vendor_mcu');
    expect(getSkillContent('workflow-requirements-challenge')).toContain('name: workflow-requirements-challenge');
    expect(getSkillContent('workflow-task-breakdown')).toContain('name: workflow-task-breakdown');
  });

  test('workflow router emits a bounded, canonical routing contract', () => {
    const router = getSkillContent('workflow-requirements-router');
    const rcpTemplate = fs.readFileSync(path.join(
      __dirname,
      '..',
      'skills',
      'workflow',
      'workflow-requirements-router',
      'references',
      'rcp-template.md'
    ), 'utf8');
    expect(router).toContain('## 路由单（固定输出）');
    expect(router).toContain('必经下游：workflow-review-gate');
    expect(router).toContain('workflow-requirements-challenge');
    expect(router).toContain('references/rcp-template.md');
    expect(rcpTemplate).toContain('# 需求约束包（RCP）模板');
    expect(rcpTemplate).toContain('confirmed');
    expect(rcpTemplate).toContain('user-confirmed');
    expect(rcpTemplate).toContain('RCP 状态');
    expect(rcpTemplate).toContain('challenged');
    expect(rcpTemplate).not.toContain('selected_option');
    expect(rcpTemplate).toContain('workflow-review-gate');
    expect(router).toContain('实现 Skill：<由 workflow-integration-plan 分发的唯一 canonical ID；未完成 RCP 时为空>');
    expect(router).toContain('workflow-integration-plan` 在审查放行后生成阶段级 Agent/Skill 基线');
    expect(router).toContain('workflow-task-execution` 按当前任务复核一个主实现 Skill 和必要辅助 Skill');
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
    expect(integration).toContain('带补证记录和质疑结论的需求约束包（RCP）');
    expect(integration).toContain('workflow-requirements-challenge');
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
    expect(integration).toContain('### 必选四份清单审计章节');
    expect(integration).toContain('00_Docs/04_需求文档/');
    expect(integration).toContain('项目文档输出边界');
    expect(integration).toContain('不得回退到插件内部保存');
    expect(integration).toContain('process.cwd()');
    expect(integration).toContain('项目路径缺失');
    expect(integration).toContain('不生成四个独立 Markdown 文件');
    expect(integration).toContain('### 下游 spec.md 输出');
    expect(integration).toContain('<project_root>/00_Docs/04_需求文档/spec.md');
    expect(integration).toContain('只能由四张清单整合生成');
    expect(reviewPackage).toContain('## 5. 四份清单审计章节（不单独落盘）');
    expect(reviewPackage).toContain('不得将它们分别输出为四个 Markdown 文件');
    expect(reviewPackage).toContain('## 6. 下游 `spec.md` 整合输出');
    expect(reviewPackage).toContain('<project_root>/00_Docs/04_需求文档/spec.md');
    expect(reviewPackage).toContain('只能由四张清单整合生成');
    expect(integration).not.toContain('BRD');
    expect(integration).not.toContain('PRD');
    expect(integration).not.toContain('SRSys');
    expect(reviewPackage).not.toContain('BRD');
    expect(reviewPackage).not.toContain('PRD');
    expect(reviewPackage).not.toContain('SRSys');
    expect(reviewPackage).toContain('文档落盘前置条件');
    expect(reviewPackage).toContain('不得写入插件仓库内部');
    expect(reviewPackage).toContain('不生成插件内占位文件');
    expect(integration).not.toContain('<request_id>-工程现状表.md');
    expect(integration).not.toContain('<request_id>-文件施工清单.md');
    expect(integration).not.toContain('<request_id>-代码生成约束清单.md');
    expect(integration).not.toContain('<request_id>-验收测试清单.md');
    expect(reviewPackage).not.toContain('<request_id>-工程现状表.md');
    expect(reviewPackage).not.toContain('<request_id>-文件施工清单.md');
    expect(reviewPackage).not.toContain('<request_id>-代码生成约束清单.md');
    expect(reviewPackage).not.toContain('<request_id>-验收测试清单.md');
  });

  test('requirements challenge clarifies RCP before review gate', () => {
    const challenge = getSkillContent('workflow-requirements-challenge');
    expect(challenge).toContain('## RCP 完善问答阶段');
    expect(challenge).toContain('先读取当前仓库和已有项目规则，执行 RCP 完整性检查');
    expect(challenge).toContain('每轮最多提出 4 个问题');
    expect(challenge).toContain('第一版范围和非目标');
    expect(challenge).toContain('空状态、失败状态和权限边界');
    expect(challenge).toContain('给出基于现有证据的推荐');
    expect(challenge).toContain('category: scope | business-rule | state-permission | acceptance');
    expect(challenge).toContain('用户回答后分别回填 RCP');
    expect(challenge).toContain('只有 RCP 完成上述补证门禁后，才能形成最终质疑结论');
    expect(challenge).toContain('目的质疑');
    expect(challenge).toContain('可行性质疑');
    expect(challenge).toContain('质疑结论与交接判定');
    expect(challenge).toContain('不生成方案 A/B');
    expect(challenge).toContain('交 workflow-review-gate');
    expect(challenge).not.toContain('selected_option');
    expect(challenge).not.toContain('## 用户选择门禁');
    expect(challenge).not.toContain('待用户选择');
    expect(challenge).toContain('workflow-review-gate');
    expect(challenge).toContain('不生成代码');
  });

  test('integration plan dispatches a single implementation skill after gate clearance', () => {
    const plan = getSkillContent('workflow-integration-plan');
    const planTemplate = fs.readFileSync(path.join(
      __dirname,
      '..',
      'skills',
      'workflow',
      'workflow-integration-plan',
      'references',
      'plan-template.md'
    ), 'utf8');
    expect(plan).toContain('生成两个面向用户、易于比较的实施方案');
    expect(plan).toContain('等待用户选择');
    expect(plan).toContain('选定方案审查');
    expect(plan).toContain('<project_root>/00_Docs/04_需求文档/plan.md');
    expect(plan).toContain('plan-template.md');
    expect(plan).toContain('workflow-task-breakdown');
    expect(plan).toContain('workflow-task-execution');
    expect(plan).toContain('task.md');
    expect(planTemplate).toContain('# 集成实施计划（plan.md）');
    expect(planTemplate).toContain('### 用户选择');
    expect(planTemplate).toContain('## 12. 方案审查记录');
    expect(planTemplate).toContain('## 14. 下游交接');
    expect(planTemplate).toContain('下游执行 Agent 与 Skill 基线');
    expect(plan).toContain('唯一主实现 Skill');
    expect(plan).toContain('阶段级 Agent/Skill 基线');
    expect(plan).toContain('审查包门禁状态非放行、`spec.md` 缺失/过期、`plan.md` 尚未审查通过、阶段级 Agent/Skill 基线缺失或 `task.md` 尚未达到 `可交付` 时不得进入执行');
    expect(plan).toContain('workflow-final-review');
    expect(plan).toContain('格式与必要注释整改闭环');
    expect(plan).toContain('现状表');
    expect(plan).toContain('文件修改表');
  });

  test('task breakdown converts an approved plan into ordered verifiable tasks', () => {
    const taskSkill = getSkillContent('workflow-task-breakdown');
    const taskTemplate = fs.readFileSync(path.join(
      __dirname,
      '..',
      'skills',
      'workflow',
      'workflow-task-breakdown',
      'references',
      'task-template.md'
    ), 'utf8');
    expect(taskSkill).toContain('plan.md');
    expect(taskSkill).toContain('spec.md');
    expect(taskSkill).toContain('有顺序、单一责任、可独立验证');
    expect(taskSkill).toContain('拓扑排序');
    expect(taskSkill).toContain('不得修改 `spec.md` 或 `plan.md`');
    expect(taskSkill).toContain('<project_root>/00_Docs/04_需求文档/task.md');
    expect(taskSkill).toContain('主 Agent、协作 Agent、主实现 Skill 和辅助 Skill');
    expect(taskSkill).toContain('allocation_evidence');
    expect(taskTemplate).toContain('# 实施任务清单（task.md）');
    expect(taskTemplate).toContain('| 顺序 | task_id |');
    expect(taskTemplate).toContain('owner_agent');
    expect(taskTemplate).toContain('supporting_skills');
    expect(taskTemplate).toContain('命令或条件');
    expect(taskTemplate).toContain('## 7. 下游交接');
  });

  test('task execution enforces one-task, test-first, blocked-on-spec and status handoff rules', () => {
    const execution = getSkillContent('workflow-task-execution');
    expect(execution).toContain('每次调用只允许选择一个任务');
    expect(execution).toContain('Agent 与 Skill 分配协议');
    expect(execution).toContain('primary_agent');
    expect(execution).toContain('primary_implementation_skill');
    expect(execution).toContain('辅助 Skill 只能提供约束');
    expect(execution).toContain('先补充一个能够证明当前行为缺失');
    expect(execution).toContain('Spec 内存在互相矛盾');
    expect(execution).toContain('不得自行选择解释');
    expect(execution).toContain('更新为 `pass`/`完成`');
    expect(execution).toContain('下一次调用');
    expect(execution).toContain('验收标准：<criterion-by-criterion result>');
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
    for (const id of ['platform_mcu', 'platform_common', 'platform_middleware', 'vendor_mcu', 'vendor_rtos', 'vendor_lvgl', 'vendor_stack', 'vendor_fatfs', 'vendor_fal', 'vendor_flashdb', 'vendor_letter_shell', 'vendor_algorithm']) {
      expect(getSkillContent(id)).not.toMatch(/Adapter\s*(?:接口|目录|实现|分层|设计)/);
    }
    expect(getSkillContent('platform_bsp')).toMatch(/函数表|函数表|注册/);
    expect(getSkillContent('platform_common')).toMatch(/统一错误码|对象模型|生命周期/);
    expect(getSkillContent('platform_middleware')).toMatch(/log|fs|kv|crypto|gui|comm/);
    expect(getSkillContent('impl_board')).toMatch(/组合根|Port/);
    expect(getSkillContent('platform_os')).toMatch(/platform_os_/);
  });
});
