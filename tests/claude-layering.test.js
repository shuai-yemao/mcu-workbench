const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  createDefaultConfig,
  normalizeLayoutKeys,
  runClaudeLayer,
  scanProject
} = require('../lib/claude-layer');
const { runCli } = require('../lib/cli');

function withFixture(callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-layering-'));
  try {
    fs.mkdirSync(path.join(root, 'App'), { recursive: true });
    fs.mkdirSync(path.join(root, 'BSP', 'Wrapper'), { recursive: true });
    fs.mkdirSync(path.join(root, 'Core'), { recursive: true });
    fs.mkdirSync(path.join(root, 'Misc'), { recursive: true });
    fs.mkdirSync(path.join(root, '.claude', 'rules'), { recursive: true });
    fs.writeFileSync(path.join(root, 'CMakeLists.txt'), 'project(layering_fixture)\n', 'utf8');
    fs.writeFileSync(path.join(root, 'board.ioc'), 'Mcu.Name=STM32F411\n', 'utf8');
    fs.writeFileSync(path.join(root, 'FreeRTOSConfig.h'), '#define configUSE_PREEMPTION 1\n', 'utf8');
    fs.writeFileSync(path.join(root, 'App', 'main.c'), '#include "drv_adapter_demo.h"\nint main(void) { return 0; }\n', 'utf8');
    fs.writeFileSync(path.join(root, 'BSP', 'Wrapper', 'drv_adapter_demo.h'), 'int demo_read(void);\n', 'utf8');
    fs.writeFileSync(path.join(root, 'Core', 'bus.c'), 'int bus_read(void) { return 0; }\n', 'utf8');
    fs.writeFileSync(path.join(root, 'Misc', 'legacy.c'), 'int legacy(void) { return 0; }\n', 'utf8');
    fs.writeFileSync(path.join(root, 'AGENTS.md'), '# Shared instructions\n', 'utf8');
    fs.writeFileSync(path.join(root, 'CLAUDE.md'), '# Manual heading\n\nKeep this text.\n', 'utf8');
    fs.writeFileSync(path.join(root, '.claude', 'rules', 'team.md'), '# Team rule\n', 'utf8');
    return callback(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function withFixtureAsync(callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-layering-'));
  try {
    fs.mkdirSync(path.join(root, 'App'), { recursive: true });
    fs.mkdirSync(path.join(root, 'BSP', 'Wrapper'), { recursive: true });
    fs.writeFileSync(path.join(root, 'CMakeLists.txt'), 'project(layering_fixture)\n', 'utf8');
    fs.writeFileSync(path.join(root, 'App', 'main.c'), 'int main(void) { return 0; }\n', 'utf8');
    return await callback(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

describe('Claude layering', () => {
  test('scans STM32/CMake evidence, source references, and unknown source files', () => withFixture((root) => {
    const scan = scanProject({ root, config: createDefaultConfig() });

    expect(scan.project.buildSystems).toContain('CMake');
    expect(scan.project.platformEvidence.some((item) => item.kind === 'cubemx')).toBe(true);
    expect(scan.project.rtosEvidence.some((item) => item.kind === 'freertos')).toBe(true);
    expect(scan.layers.app.files.map((item) => item.path)).toContain('App/main.c');
    expect(scan.layers.app.references).toEqual(expect.arrayContaining([
      expect.objectContaining({ file: 'App/main.c', line: 1, include: 'drv_adapter_demo.h' })
    ]));
    expect(scan.layers.platform.files.map((item) => item.path)).toContain('BSP/Wrapper/drv_adapter_demo.h');
    expect(scan.layers.impl.files.map((item) => item.path)).toContain('Core/bus.c');
    expect(scan.unverified).toEqual(expect.arrayContaining([
      expect.objectContaining({ file: 'Misc/legacy.c' })
    ]));
  }));

  test('init preserves manual files unless --write is requested, then creates managed artifacts', () => withFixture((root) => {
    const preview = runClaudeLayer({ action: 'init', root });
    expect(preview.changed).toBe(true);
    expect(fs.existsSync(path.join(root, '.mcu-workbench', 'claude-layer.json'))).toBe(false);

    const result = runClaudeLayer({ action: 'init', root, write: true });
    expect(result.changed).toBe(true);
    const rootClaude = fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8');
    expect(rootClaude).toContain('# Manual heading');
    expect(rootClaude).toContain('Keep this text.');
    expect(rootClaude).toContain('@AGENTS.md');
    expect(rootClaude).toContain('mcu-workbench:managed:start');
    expect(rootClaude).toContain('App → Service → Platform ← Impl → Vendor');
    expect(fs.existsSync(path.join(root, '.claude', 'rules', 'mcu-workbench', '10-app.md'))).toBe(true);
    expect(fs.existsSync(path.join(root, '.claude', 'rules', 'mcu-workbench', '20-service.md'))).toBe(false);
    expect(fs.existsSync(path.join(root, '.claude', 'rules', 'mcu-workbench', '40-vendor.md'))).toBe(false);
    expect(fs.readFileSync(path.join(root, '.claude', 'rules', 'team.md'), 'utf8')).toBe('# Team rule\n');
    expect(fs.existsSync(path.join(root, '.mcu-workbench', 'claude-layer.state.json'))).toBe(true);
  }));

  test('sync previews drift and validate distinguishes warnings, strict failures, and managed-file drift', () => withFixture((root) => {
    runClaudeLayer({ action: 'init', root, write: true });
    const relaxed = runClaudeLayer({ action: 'validate', root });
    expect(relaxed.exitCode).toBe(0);
    expect(relaxed.warnings.some((item) => item.code === 'UNVERIFIED_PATH')).toBe(true);

    const strict = runClaudeLayer({ action: 'validate', root, strict: true });
    expect(strict.exitCode).toBe(1);
    expect(strict.errors.some((item) => item.code === 'UNVERIFIED_PATH')).toBe(true);

    fs.appendFileSync(path.join(root, 'App', 'main.c'), '\nint next_step(void) { return 0; }\n', 'utf8');
    const preview = runClaudeLayer({ action: 'sync', root });
    expect(preview.changed).toBe(true);
    expect(preview.writes).toHaveLength(0);
    const synced = runClaudeLayer({ action: 'sync', root, write: true });
    expect(synced.writes.length).toBeGreaterThan(0);

    fs.appendFileSync(path.join(root, '.claude', 'rules', 'mcu-workbench', '10-app.md'), '\nmanual edit\n', 'utf8');
    const drift = runClaudeLayer({ action: 'validate', root });
    expect(drift.exitCode).toBe(1);
    expect(drift.errors.some((item) => item.code === 'MANAGED_ARTIFACT_DRIFT')).toBe(true);
  }));

  test('validate includes existing architecture findings', () => withFixture((root) => {
    runClaudeLayer({ action: 'init', root, write: true });
    fs.writeFileSync(path.join(root, 'App', 'hal.c'), 'void bad(void) { HAL_Delay(1); }\n', 'utf8');
    const result = runClaudeLayer({ action: 'validate', root });
    expect(result.exitCode).toBe(1);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ARCHITECTURE', ruleId: 'APP_VENDOR_CALL' })
    ]));
  }));

  test('honors configured mappings for non-standard project layouts', () => withFixture((root) => {
    fs.mkdirSync(path.join(root, 'Components', 'Device'), { recursive: true });
    fs.writeFileSync(path.join(root, 'Components', 'Device', 'sensor.c'), 'int sensor(void) { return 0; }\n', 'utf8');
    const config = createDefaultConfig();
    config.layout.impl = ['^Components/Device/'];
    const scan = scanProject({ root, config });
    expect(scan.layers.impl.files.map((item) => item.path)).toContain('Components/Device/sensor.c');
  }));

  test('falls back to legacy claude-layering config and state names, then writes new names', () => withFixture((root) => {
    // 模拟存量旧工程：legacy 配置已存在；init 读到它就不重写配置，仅生成新路径 state。
    fs.mkdirSync(path.join(root, '.mcu-workbench'), { recursive: true });
    const legacyConfig = path.join(root, '.mcu-workbench', 'claude-layering.json');
    const legacyState = path.join(root, '.mcu-workbench', 'claude-layering.state.json');
    fs.writeFileSync(legacyConfig, JSON.stringify(createDefaultConfig()), 'utf8');

    const init = runClaudeLayer({ action: 'init', root, write: true });
    expect(init.exitCode).toBe(0);
    const newState = path.join(root, '.mcu-workbench', 'claude-layer.state.json');
    expect(fs.existsSync(newState)).toBe(true);
    // 旧工程没有新路径 state，只有 legacy state。
    fs.renameSync(newState, legacyState);

    // 读取必须回退到 legacy 文件名。
    expect(runClaudeLayer({ action: 'scan', root }).exitCode).toBe(0);
    expect(runClaudeLayer({ action: 'validate', root }).exitCode).toBe(0);

    // 保存写新：sync 后 state 落回新路径，config 保留 legacy 路径。
    const synced = runClaudeLayer({ action: 'sync', root, write: true });
    expect(synced.exitCode).toBe(0);
    expect(fs.existsSync(newState)).toBe(true);
    expect(fs.existsSync(legacyConfig)).toBe(true);
  }));

  test('exposes claude-layer as a CLI subcommand with JSON output', async () => withFixtureAsync(async (root) => {
    const output = [];
    const result = await runCli(['claude-layer', 'scan', '--root', root, '--json'], {
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line)
    });
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(output[0])).toMatchObject({ action: 'scan', changed: false });
  }));

  test('classifies five-layer template directories (01_App..05_Vendor)', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-layering-'));
    try {
      fs.mkdirSync(path.join(root, '01_App'), { recursive: true });
      fs.mkdirSync(path.join(root, '02_Service', 'service_battery'), { recursive: true });
      fs.mkdirSync(path.join(root, '03_Platform', 'platform_mcu', 'Inc'), { recursive: true });
      fs.mkdirSync(path.join(root, '04_Impl', 'impl_board'), { recursive: true });
      fs.mkdirSync(path.join(root, '05_Vendor', 'patch'), { recursive: true });
      fs.writeFileSync(path.join(root, '01_App', 'app_main.c'), 'int main(void) { return 0; }\n', 'utf8');
      fs.writeFileSync(path.join(root, '02_Service', 'service_battery', 'service_battery.c'), 'int battery(void) { return 0; }\n', 'utf8');
      fs.writeFileSync(path.join(root, '03_Platform', 'platform_mcu', 'Inc', 'platform_mcu.h'), 'int mcu_init(void);\n', 'utf8');
      fs.writeFileSync(path.join(root, '04_Impl', 'impl_board', 'impl_board.c'), 'int board(void) { return 0; }\n', 'utf8');
      fs.writeFileSync(path.join(root, '05_Vendor', 'patch', 'demo.c'), 'int demo(void) { return 0; }\n', 'utf8');

      const scan = scanProject({ root, config: createDefaultConfig() });
      expect(scan.layers.app.files.map((item) => item.path)).toContain('01_App/app_main.c');
      expect(scan.layers.service.files.map((item) => item.path)).toContain('02_Service/service_battery/service_battery.c');
      expect(scan.layers.platform.files.map((item) => item.path)).toContain('03_Platform/platform_mcu/Inc/platform_mcu.h');
      expect(scan.layers.impl.files.map((item) => item.path)).toContain('04_Impl/impl_board/impl_board.c');
      expect(scan.layers.vendor.files.map((item) => item.path)).toContain('05_Vendor/patch/demo.c');
      expect(scan.unverified).toHaveLength(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('classifies vendor paths and os_adapter subpaths into the five layers', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-layering-'));
    try {
      fs.mkdirSync(path.join(root, 'Vendor', 'STM32'), { recursive: true });
      fs.mkdirSync(path.join(root, 'Middlewares', 'LVGL', 'src'), { recursive: true });
      fs.mkdirSync(path.join(root, 'Drivers', 'CMSIS', 'Device', 'ST'), { recursive: true });
      fs.mkdirSync(path.join(root, 'Middlewares', 'os_adapter', 'inc'), { recursive: true });
      fs.mkdirSync(path.join(root, 'Middlewares', 'os_adapter', 'FreeRTOS'), { recursive: true });
      fs.writeFileSync(path.join(root, 'Vendor', 'STM32', 'stm32_hal.c'), 'int hal(void) { return 0; }\n', 'utf8');
      fs.writeFileSync(path.join(root, 'Middlewares', 'LVGL', 'src', 'lvgl.c'), 'int lvgl(void) { return 0; }\n', 'utf8');
      fs.writeFileSync(path.join(root, 'Drivers', 'CMSIS', 'Device', 'ST', 'stm32f4xx.c'), 'int chip(void) { return 0; }\n', 'utf8');
      fs.writeFileSync(path.join(root, 'Middlewares', 'os_adapter', 'inc', 'os_adapter.h'), 'int os_init(void);\n', 'utf8');
      fs.writeFileSync(path.join(root, 'Middlewares', 'os_adapter', 'FreeRTOS', 'freertos_port.c'), 'int port(void) { return 0; }\n', 'utf8');

      const scan = scanProject({ root, config: createDefaultConfig() });
      expect(scan.layers.vendor.files.map((item) => item.path)).toEqual(expect.arrayContaining([
        'Vendor/STM32/stm32_hal.c',
        'Middlewares/LVGL/src/lvgl.c',
        'Drivers/CMSIS/Device/ST/stm32f4xx.c'
      ]));
      expect(scan.layers.platform.files.map((item) => item.path)).toContain('Middlewares/os_adapter/inc/os_adapter.h');
      expect(scan.layers.impl.files.map((item) => item.path)).toContain('Middlewares/os_adapter/FreeRTOS/freertos_port.c');
      expect(scan.unverified).toHaveLength(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('normalizes legacy layout keys to the five-layer model', () => withFixture((root) => {
    const config = createDefaultConfig();
    config.layout.driver = ['^Components/Device/'];
    config.layout.middleware = ['^ThirdParty/'];
    const { layout, migrated } = normalizeLayoutKeys(config.layout);
    expect(migrated).toBe(true);
    expect(layout.impl).toEqual(['^Components/Device/']);
    expect(layout.vendor).toEqual(['^ThirdParty/']);
    expect(layout.driver).toBeUndefined();
    expect(layout.middleware).toBeUndefined();

    fs.mkdirSync(path.join(root, 'Components', 'Device'), { recursive: true });
    fs.writeFileSync(path.join(root, 'Components', 'Device', 'sensor.c'), 'int sensor(void) { return 0; }\n', 'utf8');
    fs.mkdirSync(path.join(root, 'ThirdParty'), { recursive: true });
    fs.writeFileSync(path.join(root, 'ThirdParty', 'lib.c'), 'int lib(void) { return 0; }\n', 'utf8');
    const scan = scanProject({ root, config: { ...config, layout } });
    expect(scan.layers.impl.files.map((item) => item.path)).toContain('Components/Device/sensor.c');
    expect(scan.layers.vendor.files.map((item) => item.path)).toContain('ThirdParty/lib.c');
  }));

  test('removes stale managed rule files on sync and keeps user files', () => withFixture((root) => {
    runClaudeLayer({ action: 'init', root, write: true });
    const rulesDir = path.join(root, '.claude', 'rules', 'mcu-workbench');
    fs.writeFileSync(path.join(rulesDir, '20-middleware.md'), '# stale\n', 'utf8');
    fs.writeFileSync(path.join(rulesDir, '60-driver.md'), '# stale\n', 'utf8');
    fs.writeFileSync(path.join(rulesDir, 'user-note.md'), '# keep\n', 'utf8');

    const preview = runClaudeLayer({ action: 'sync', root });
    expect(preview.changes.some((item) => item.path.endsWith('20-middleware.md') && item.operation === 'delete')).toBe(true);
    expect(preview.changes.some((item) => item.path.endsWith('60-driver.md') && item.operation === 'delete')).toBe(true);

    runClaudeLayer({ action: 'sync', root, write: true });
    expect(fs.existsSync(path.join(rulesDir, '20-middleware.md'))).toBe(false);
    expect(fs.existsSync(path.join(rulesDir, '60-driver.md'))).toBe(false);
    expect(fs.readFileSync(path.join(rulesDir, 'user-note.md'), 'utf8')).toBe('# keep\n');
  }));
});
