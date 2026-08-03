const { parseArgs, runCli } = require('../lib/cli');

function captureCli(argv) {
  const output = [];
  return runCli(argv, {
    stdout: (line) => output.push({ stream: 'stdout', line }),
    stderr: (line) => output.push({ stream: 'stderr', line })
  }).then((result) => ({ result, output }));
}

describe('CLI', () => {
  test('parses command aliases and dashed options', () => {
    expect(parseArgs(['mcu-build', '--platform', 'stm32f4', '--gdb-port=3334'])).toEqual({
      command: 'build',
      options: { platform: 'stm32f4', gdbPort: '3334' }
    });
  });

  test('parses repeatable --core and the mcu-core implementation alias', () => {
    expect(parseArgs(['mcu-core', '--peripheral', 'iic', '--platform', 'stm32f4'])).toEqual({
      command: 'core', options: { peripheral: 'iic', platform: 'stm32f4' }
    });
    expect(parseArgs(['driver', '--device-type', 'externflash', '--device', 'W25Q64', '--core', 'spi', '--core', 'dma'])).toEqual({
      command: 'driver', options: { deviceType: 'externflash', device: 'W25Q64', core: ['spi', 'dma'] }
    });
  });

  test('returns a stable usage exit code and migration message for old driver parameters', async () => {
    const { result, output } = await captureCli(['driver', '--peripheral', 'oled', '--platform', 'stm32f4']);
    expect(result.exitCode).toBe(2);
    expect(output.some((entry) => entry.line.includes('MCUWB_E_DEPRECATED_PERIPHERAL'))).toBe(true);
  });

  test('prints the SSD1306 manifest before its nine generated file paths', async () => {
    const { result, output } = await captureCli([
      'driver', '--device-type', 'display', '--device', 'SSD1306',
      '--core', 'i2c', '--platform', 'stm32f4'
    ]);
    expect(result.exitCode).toBe(0);
    expect(output[0].line).toContain('Manifest:');
    expect(output[0].line).toContain('UNRESOLVED_OSAL_API');
    expect(output[1].line).toContain('Generated 9 files for SSD1306');
    expect(output.slice(2)).toHaveLength(9);
  });

  test('prints a JSON build plan without executing tools', async () => {
    const { result, output } = await captureCli(['build', '--platform', 'stm32f4', '--json']);
    expect(result.exitCode).toBe(0);
    const json = JSON.parse(output.find((entry) => entry.stream === 'stdout').line);
    expect(json.success).toBe(true);
    expect(json.command).toContain('cmake');
    expect(output.filter((entry) => entry.stream === 'stderr')).toHaveLength(0);
  });

  test('keeps --target as a build compatibility alias', async () => {
    const { result, output } = await captureCli(['build', '--target', 'stm32f4', '--json']);
    expect(result.exitCode).toBe(0);
    const json = JSON.parse(output.find((entry) => entry.stream === 'stdout').line);
    expect(json.success).toBe(true);
    expect(json.command).toContain('cmake');
  });

  test('rejects conflicting build platform aliases', async () => {
    const { result, output } = await captureCli(['build', '--platform', 'stm32f4', '--target', 'esp32']);
    expect(result.exitCode).toBe(1);
    expect(output.some((entry) => entry.line.includes('Cannot use both --platform and --target with different values'))).toBe(true);
  });

  test('lists only active skills by default and archived entries with --all', async () => {
    const active = await captureCli(['skills', '--json']);
    const archived = await captureCli(['skills', '--all', '--json']);
    const activeJson = JSON.parse(active.output[0].line);
    const archivedJson = JSON.parse(archived.output[0].line);
    expect(activeJson.skills.some((skill) => skill.id === 'tools-build')).toBe(true);
    expect(activeJson.skills.some((skill) => skill.archived)).toBe(false);
    expect(archivedJson.skills.length).toBeGreaterThan(activeJson.skills.length);
  });

  test('returns a non-zero exit code for missing required options', async () => {
    const { result, output } = await captureCli(['new', '--platform', 'stm32f4']);
    expect(result.exitCode).toBe(1);
    expect(output.some((entry) => entry.line.includes('--name'))).toBe(true);
  });
});
