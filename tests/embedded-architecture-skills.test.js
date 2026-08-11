const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function findMarkdownFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const current = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...findMarkdownFiles(current));
    if (entry.isFile() && entry.name.endsWith('.md')) files.push(current);
  }
  return files;
}

describe('embedded architecture skill contracts', () => {
  const canonicalSkillEntries = [
    'skills/platform/platform_mcu/SKILL.md',
    'skills/platform/platform_common/SKILL.md',
    'skills/platform/platform_middleware/SKILL.md',
    'skills/platform/platform_bsp/SKILL.md',
    'skills/impl/impl_board/SKILL.md',
    'skills/impl/impl_bsp/SKILL.md',
    'skills/platform/platform_os/SKILL.md',
    'skills/impl/impl_os/SKILL.md',
    'skills/tools/tools-observability/SKILL.md',
    'skills/workflow/workflow-review-gate/SKILL.md',
    'skills/workflow/workflow-integration-plan/SKILL.md'
  ];

  test('keeps project-specific evidence out of canonical entry points', () => {
    for (const relativePath of canonicalSkillEntries) {
      const content = read(relativePath);
      expect(content).not.toMatch(/EC-S100|AHT21/);
      expect(content).not.toContain('Wapper');
    }
  });

  test('uses the verified two-layer OS naming consistently', () => {
    const abstraction = read('skills/platform/platform_os/SKILL.md');
    const contract = read('skills/platform/platform_os/references/osal-contract.md');
    const freertos = read('skills/impl/impl_os/SKILL.md');
    const freertosMap = read('skills/impl/impl_os/references/freertos-source-map.md');

    expect(abstraction).toContain('os_*_impl()');
    expect(contract).toContain('osal_task_create() → os_task_create_impl()');
    expect(freertosMap).toContain('osal_task_create → os_task_create_impl → xTaskCreate');
    expect(`${abstraction}\n${contract}\n${freertos}\n${freertosMap}`).not.toContain('os_impl_task_create');
  });

  test('publishes all evidence references at their canonical locations', () => {
    for (const relativePath of [
      'skills/workflow/workflow-review-gate/references/ec-s100-architecture-audit.md',
      'skills/platform/platform_mcu/references/core-iic-backends-case.md',
      'skills/bsp/references/bsp-aht21-case.md',
      'skills/platform/platform_os/references/osal-freertos-case.md',
      'skills/tools/tools-observability/references/debugcomponent-rtt-case.md'
    ]) {
      expect(fs.existsSync(path.join(ROOT, relativePath))).toBe(true);
    }
  });

  test('keeps device names out of generic architecture rules', () => {
    const validator = read('lib/architecture-contract.js');
    expect(validator).not.toMatch(/AHT21|bsp_gpio_iic|drv_adapter_temphumi/);
  });

  test('keeps Middleware algorithms device-free and routes ports through both Wrappers', () => {
    const algorithms = read('skills/vendor/vendor_dsp/SKILL.md');
    expect(algorithms).toContain('BSP Wrapper');
    expect(algorithms).toContain('OS Wrapper');
    expect(algorithms).toContain('不直接操作外设');
  });

  test('keeps public documentation aligned with the 45 catalog and 43 canonical entries', () => {
    const documents = [
      'README.md', 'CLAUDE.md', 'docs/skills-migration.md', 'docs/codex-adaptation.md',
      'docs/plugin-capability-map.md', 'docs/plugin-execution-flow.md'
    ];
    for (const relativePath of documents) {
      const content = read(relativePath);
      expect(content).toContain('45 catalog / 43 canonical');
      expect(content).not.toMatch(/23\s*(?:个|份)?\s*canonical|15\s*\+\s*8/);
      for (const entry of ['platform_os', 'impl_os', 'platform_bsp', 'impl_board', 'platform_mcu', 'vendor_stm32']) {
        expect(content).toContain(entry);
      }
    }
  });

  test('lists current OS entries rather than compatibility aliases in migration prose', () => {
    const migration = read('docs/skills-migration.md');
    const activeSourceLine = migration.split(/\r?\n/).find((line) => line.includes('没有归档前身'));
    expect(activeSourceLine).toContain('platform_os');
    expect(activeSourceLine).toContain('impl_os');
    expect(activeSourceLine).not.toContain('os-abstraction');
    expect(activeSourceLine).not.toContain('rtos-freertos');
  });

  test('requires file-level delivery tables and evidence handoff', () => {
    const integration = read('skills/workflow/workflow-integration-plan/SKILL.md');
    expect(integration).toContain('现状表');
    expect(integration).toContain('边界表');
    expect(integration).toContain('文件修改表');
    expect(integration).toContain('验收表');
    expect(integration).toContain('运行记录');
  });

  test('keeps active capability guides aligned with the canonical contracts', () => {
    const adapterGuide = read(
      'skills/impl/impl_board/references/capabilities/bsp-platform-adapter/GUIDE.md'
    );
    const driverGuide = read(
      'skills/impl/impl_bsp/references/capabilities/bsp-device-driver/GUIDE.md'
    );
    const handlerGuide = read(
      'skills/impl/impl_bsp/references/capabilities/bsp-device-service/GUIDE.md'
    );
    const freertosMap = read(
      'skills/impl/impl_os/references/freertos-source-map.md'
    );

    expect(adapterGuide).toContain('不能在 BSP Port 实现');
    expect(adapterGuide).not.toContain('Adapter 才调用 HAL');
    expect(driverGuide).toContain('START、STOP、ACK、SDA 方向、总线锁和临界区不注入 Driver');
    expect(handlerGuide).toContain('必须先在当前 OSAL Port');
    expect(freertosMap).toContain('os_task_create_impl');
    expect(freertosMap).not.toContain('os_impl_task_create');
  });

  test('keeps repository-relative BSP adapter script paths valid', () => {
    const usagePath = 'skills/impl/impl_board/references/capabilities/bsp-device-adaptation/references/usage.md';
    const usage = read(usagePath);
    for (const [, scriptPath] of usage.matchAll(/python3\s+([^\s]+\.py)/g)) {
      expect(fs.existsSync(path.join(ROOT, scriptPath))).toBe(true);
    }
  });

  test('keeps fenced active documentation repository paths valid', () => {
    for (const documentPath of findMarkdownFiles(path.join(ROOT, 'skills'))) {
      const content = fs.readFileSync(documentPath, 'utf8');
      for (const block of content.matchAll(/```[^\r\n]*\r?\n([\s\S]*?)```/g)) {
        for (const [, repositoryPath] of block[1].matchAll(/(?:^|\s)(skills\/[A-Za-z0-9_./-]+)/g)) {
          expect(fs.existsSync(path.join(ROOT, repositoryPath))).toBe(true);
        }
      }
    }
  });
});
