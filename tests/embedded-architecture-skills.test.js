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
    'skills/impl/impl_mcu/SKILL.md',
    'skills/platform/platform_os/SKILL.md',
    'skills/impl/impl_os/SKILL.md',
    'skills/tools/tools-observability/SKILL.md',
    'skills/workflow/workflow-requirements-challenge/SKILL.md',
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
    const contract = read('skills/platform/platform_os/references/platform-os-contract.md');
    const freertos = read('skills/impl/impl_os/SKILL.md');
    const freertosMap = read('skills/impl/impl_os/references/freertos-source-map.md');

    expect(abstraction).toContain('impl_os_*()');
    expect(contract).toContain('platform_os_task_create() → impl_os_task_create()');
    expect(freertosMap).toContain('platform_os_task_create → impl_os_task_create → xTaskCreate');
    const removedFunctionName = ['os', 'task', 'create', 'impl'].join('_');
    expect(`${abstraction}\n${contract}\n${freertos}\n${freertosMap}`).not.toContain(removedFunctionName);
  });

  test('does not retain removed OS names in the canonical OS Skill content', () => {
    const canonicalContent = [
      read('skills/platform/platform_os/SKILL.md'),
      read('skills/platform/platform_os/references/platform-os-contract.md'),
      read('skills/platform/platform_os/references/platform-os-freertos-case.md'),
      read('skills/impl/impl_os/SKILL.md'),
      read('skills/impl/impl_os/references/freertos-source-map.md')
    ].join('\n');

    expect(canonicalContent).toMatch(/platform_os_/);
    expect(canonicalContent).toMatch(/impl_os_/);
    expect(canonicalContent).not.toMatch(/\bosal_|\bos_[a-z0-9_]+_impl\b|\bos_impl_/i);
  });

  test('uses App to Service as the only application call chain', () => {
    const graph = read('skills/workflow/workflow-review-gate/references/software-architecture-knowledge-graph.md');
    const evidence = read('skills/app/app-architecture/references/app-architecture-evidence.md');

    expect(graph).toContain('APP["APP"] --> SERVICE["Service public APIs"]');
    expect(graph).not.toContain('APP["APP"] --> OW');
    expect(evidence).toContain('先走 Service');
  });

  test('keeps MCU API profiles and Impl MCU ownership explicit', () => {
    const platformMcu = read('skills/platform/platform_mcu/SKILL.md');
    const implMcu = read('skills/impl/impl_mcu/SKILL.md');
    const contract = read('skills/workflow/workflow-review-gate/references/software-layer-contract.md');

    expect(platformMcu).toContain('flat-logical-resource');
    expect(platformMcu).toContain('object-ops');
    expect(platformMcu).toContain('plat_<capability>.h');
    expect(implMcu).toContain('impl_mcu');
    expect(implMcu).toContain('stm32f411_plat_i2c.c');
    expect(implMcu).toContain('HAL/LL/CMSIS/SDK');
    expect(contract).toContain('flat logical resource');
    expect(contract).toContain('直接实现 `plat_*`');
  });

  test('publishes all evidence references at their canonical locations', () => {
    for (const relativePath of [
      'skills/workflow/workflow-review-gate/references/ec-s100-architecture-audit.md',
      'skills/platform/platform_mcu/references/core-iic-backends-case.md',
      'skills/bsp/references/bsp-aht21-case.md',
      'skills/platform/platform_os/references/platform-os-freertos-case.md',
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
    const algorithms = read('skills/vendor/vendor_algorithm/SKILL.md');
    expect(algorithms).toContain('platform_bsp');
    expect(algorithms).toContain('platform_os');
    expect(algorithms).toContain('vendor_algorithm');
    expect(algorithms).toContain('不直接操作外设');
  });

  test('keeps Vendor content policy explicit and routes access through Impl', () => {
    const mcu = read('skills/vendor/vendor_mcu/SKILL.md');
    const rtos = read('skills/vendor/vendor_rtos/SKILL.md');
    const mapping = read('skills/vendor/references/vendor_mapping.md');
    const contract = read('skills/vendor/references/vendor-content-contract.md');

    expect(mcu).toContain('05_Vendor/vendor_mcu');
    expect(mcu).toContain('完整');
    expect(rtos).toContain('05_Vendor/vendor_rtos');
    expect(rtos).toContain('完整内容');
    expect(mapping).toContain('05_Vendor/vendor_middleware');
    expect(mapping).toContain('目标工程 Git 统一提交整个 `05_Vendor/`');
    expect(contract).toContain('Service、App 和 Platform 公共头文件不得直接 include Vendor 头文件');
    expect(contract).toContain('Impl` 是唯一允许绑定 Vendor 原生 API');
  });

  test('keeps Middleware Platform-to-Impl exception scoped to implementation boundaries', () => {
    const platform = read('skills/platform/platform_middleware/SKILL.md');
    const impl = read('skills/impl/impl_middleware/SKILL.md');
    const board = read('skills/impl/impl_board/SKILL.md');
    const service = read('skills/service/service_log/SKILL.md');
    const contract = read('skills/workflow/workflow-review-gate/references/software-layer-contract.md');

    expect(platform).toContain('Platform→Impl 受限例外');
    expect(platform).toContain('不出现在 Platform 公共头的 include、类型或宏中');
    expect(platform).toContain('当前日志基线');
    expect(platform).toContain('一个公共头');
    expect(platform).toContain('platform_log.h');
    expect(impl).toContain('默认单一 Port');
    expect(impl).toContain('impl_elog_log.c/.h');
    expect(impl).toContain('impl_elog_port.c');
    expect(impl).toContain('受控拆分');
    expect(impl).toContain('不复制、不格式化、不直接修改');
    expect(impl).toContain('时间戳必须绑定到 Impl Port');
    expect(impl).toContain('FreeRTOS/HAL');
    expect(impl).toContain('Impl/Board 边界');
    expect(board).toContain('impl_board_<board>_middleware.c');
    expect(board).toContain('MCU/HAL');
    expect(service).toContain('platform_service_t');
    expect(service).toContain('PLATFORM_SERVICE_CLASS_SYSTEM');
    expect(service).toContain('静默截断');
    expect(contract).toContain('Middleware 受限例外');
    expect(contract).toContain('不适用于 OS、BSP、MCU 或其他 Platform 子域');
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
    expect(freertosMap).toContain('impl_os_task_create');
    const removedFunctionName = ['os', 'task', 'create', 'impl'].join('_');
    expect(freertosMap).not.toContain(removedFunctionName);
  });

  test('keeps OS skills grounded in the embedded_framework impl_os evidence', () => {
    const implOs = read('skills/impl/impl_os/SKILL.md');
    const sourceMap = read('skills/impl/impl_os/references/freertos-source-map.md');
    const quickref = read('skills/impl/impl_os/references/freertos-api-quickref.md');
    const platformOs = read('skills/platform/platform_os/SKILL.md');
    const contract = read('skills/platform/platform_os/references/platform-os-contract.md');

    expect(implOs).toContain('platform_os_internal_*.h');
    expect(implOs).toContain('Timer record');
    expect(implOs).toContain('UNRESOLVED_RTOS_CONFIG');
    expect(sourceMap).toContain('platform_os_timer_start → impl_os_timer_start → xTimerStart');
    expect(sourceMap).toContain('05_Vendor/vendor_rtos');
    expect(quickref).toContain('屏蔽状态 token');
    expect(quickref).toContain('原生能力与当前 Port 分开');
    expect(platformOs).toContain('是否存在 `platform_os_*.c` 转发实现必须以目标工程为准');
    expect(contract).toContain('Timer ID/record 生命周期');
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
