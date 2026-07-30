const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('embedded architecture skill contracts', () => {
  const canonicalSkillEntries = [
    'skills/platform/core-mcu/SKILL.md',
    'skills/bsp/bsp-adapter/SKILL.md',
    'skills/bsp/bsp-hal-driver/SKILL.md',
    'skills/bsp/bsp-handler/SKILL.md',
    'skills/rtos/os-abstraction/SKILL.md',
    'skills/rtos/rtos-freertos/SKILL.md',
    'skills/tools/tools-observability/SKILL.md',
    'skills/workflow/workflow-project-integration/SKILL.md'
  ];

  test('keeps project-specific evidence out of canonical entry points', () => {
    for (const relativePath of canonicalSkillEntries) {
      const content = read(relativePath);
      expect(content).not.toMatch(/EC-S100|AHT21/);
      expect(content).not.toContain('Wapper');
    }
  });

  test('uses the verified two-layer OS naming consistently', () => {
    const abstraction = read('skills/rtos/os-abstraction/SKILL.md');
    const contract = read('skills/rtos/os-abstraction/references/osal-contract.md');
    const freertos = read('skills/rtos/rtos-freertos/SKILL.md');
    const freertosMap = read('skills/rtos/rtos-freertos/references/freertos-source-map.md');

    expect(abstraction).toContain('os_*_impl()');
    expect(contract).toContain('osal_task_create() → os_task_create_impl()');
    expect(freertosMap).toContain('osal_task_create → os_task_create_impl → xTaskCreate');
    expect(`${abstraction}\n${contract}\n${freertos}\n${freertosMap}`).not.toContain('os_impl_task_create');
  });

  test('publishes all evidence references at their canonical locations', () => {
    for (const relativePath of [
      'skills/workflow/workflow-project-integration/references/ec-s100-architecture-audit.md',
      'skills/platform/core-mcu/references/core-iic-backends-case.md',
      'skills/bsp/references/bsp-aht21-case.md',
      'skills/rtos/os-abstraction/references/osal-freertos-case.md',
      'skills/tools/tools-observability/references/debugcomponent-rtt-case.md'
    ]) {
      expect(fs.existsSync(path.join(ROOT, relativePath))).toBe(true);
    }
  });

  test('keeps device names out of generic architecture rules', () => {
    const validator = read('lib/architecture-contract.js');
    expect(validator).not.toMatch(/AHT21|bsp_gpio_iic|drv_adapter_temphumi/);
  });

  test('requires file-level delivery tables and evidence handoff', () => {
    const integration = read('skills/workflow/workflow-project-integration/SKILL.md');
    expect(integration).toContain('现状表');
    expect(integration).toContain('边界表');
    expect(integration).toContain('文件修改表');
    expect(integration).toContain('验收表');
    expect(integration).toContain('运行记录');
  });

  test('keeps active capability guides aligned with the canonical contracts', () => {
    const adapterGuide = read(
      'skills/bsp/bsp-adapter/references/capabilities/bsp-platform-adapter/GUIDE.md'
    );
    const driverGuide = read(
      'skills/bsp/bsp-hal-driver/references/capabilities/bsp-device-driver/GUIDE.md'
    );
    const handlerGuide = read(
      'skills/bsp/bsp-handler/references/capabilities/bsp-device-service/GUIDE.md'
    );
    const freertosMap = read(
      'skills/rtos/rtos-freertos/references/freertos-source-map.md'
    );

    expect(adapterGuide).toContain('不能在 BSP Port 实现');
    expect(adapterGuide).not.toContain('Adapter 才调用 HAL');
    expect(driverGuide).toContain('START、STOP、ACK、SDA 方向、总线锁和临界区不注入 Driver');
    expect(handlerGuide).toContain('必须先在当前 OSAL Port');
    expect(freertosMap).toContain('os_task_create_impl');
    expect(freertosMap).not.toContain('os_impl_task_create');
  });
});
