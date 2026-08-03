const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  createDefaultConfig,
  runClaudeLayer,
  scanProject
} = require('../lib/claude-layering');
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
    expect(scan.unverified).toEqual(expect.arrayContaining([
      expect.objectContaining({ file: 'Misc/legacy.c' })
    ]));
  }));

  test('init preserves manual files unless --write is requested, then creates managed artifacts', () => withFixture((root) => {
    const preview = runClaudeLayer({ action: 'init', root });
    expect(preview.changed).toBe(true);
    expect(fs.existsSync(path.join(root, '.mcu-workbench', 'claude-layering.json'))).toBe(false);

    const result = runClaudeLayer({ action: 'init', root, write: true });
    expect(result.changed).toBe(true);
    const rootClaude = fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8');
    expect(rootClaude).toContain('# Manual heading');
    expect(rootClaude).toContain('Keep this text.');
    expect(rootClaude).toContain('@AGENTS.md');
    expect(rootClaude).toContain('mcu-workbench:managed:start');
    expect(fs.existsSync(path.join(root, '.claude', 'rules', 'mcu-workbench', '10-app.md'))).toBe(true);
    expect(fs.readFileSync(path.join(root, '.claude', 'rules', 'team.md'), 'utf8')).toBe('# Team rule\n');
    expect(fs.existsSync(path.join(root, '.mcu-workbench', 'claude-layering.state.json'))).toBe(true);
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
    config.layout.driver = ['^Components/Device/'];
    const scan = scanProject({ root, config });
    expect(scan.layers.driver.files.map((item) => item.path)).toContain('Components/Device/sensor.c');
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
});
