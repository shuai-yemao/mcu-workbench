const { parseArgs, runCli } = require('../lib/cli');

function captureCli(argv) {
  const output = [];
  return runCli(argv, {
    stdout: (line) => output.push({ stream: 'stdout', line }),
    stderr: (line) => output.push({ stream: 'stderr', line })
  }).then((result) => ({ result, output }));
}

describe('CLI', () => {
  test('parses a command and dashed options', () => {
    expect(parseArgs(['build', '--platform', 'stm32f4', '--gdb-port=3334'])).toEqual({
      command: 'build',
      options: { platform: 'stm32f4', gdbPort: '3334' }
    });
  });

  test('parses repeatable --core and a canonical core peripheral', () => {
    expect(parseArgs(['core', '--peripheral', 'i2c', '--platform', 'stm32f4'])).toEqual({
      command: 'core', options: { peripheral: 'i2c', platform: 'stm32f4' }
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

  test('rejects the removed --target build option', async () => {
    const { result, output } = await captureCli(['build', '--target', 'stm32f4', '--json']);
    expect(result.exitCode).toBe(1);
    expect(output.some((entry) => entry.line.includes('Unknown option for build: --target'))).toBe(true);
  });

  test('lists canonical skills by default and all active skills with --all', async () => {
    const active = await captureCli(['skills', '--json']);
    const all = await captureCli(['skills', '--all', '--json']);
    const activeJson = JSON.parse(active.output[0].line);
    const allJson = JSON.parse(all.output[0].line);
    expect(activeJson.skills.some((skill) => skill.id === 'tools-build')).toBe(true);
    expect(activeJson.skills.every((skill) => skill.canonical)).toBe(true);
    expect(activeJson.skills.some((skill) => skill.archived)).toBe(false);
    expect(allJson.skills.length).toBeGreaterThan(activeJson.skills.length);
    expect(allJson.skills.some((skill) => skill.id === 'hardware-pcb-analysis')).toBe(true);
    expect(allJson.skills.some((skill) => skill.archived)).toBe(false);
  });

  test('returns a non-zero exit code for missing required options', async () => {
    const { result, output } = await captureCli(['new', '--platform', 'stm32f4']);
    expect(result.exitCode).toBe(1);
    expect(output.some((entry) => entry.line.includes('--name'))).toBe(true);
  });

  test('prints an OpenOCD debug plan without starting a session', async () => {
    const { result, output } = await captureCli(['debug', '--platform', 'stm32f4', '--json']);
    expect(result.exitCode).toBe(0);
    const json = JSON.parse(output.find((entry) => entry.stream === 'stdout').line);
    expect(json.success).toBe(true);
    expect(json.probe).toBe('openocd');
    expect(json.openocdCommand).toContain('openocd');
    expect(json.openocdCommand).toContain('interface/stlink.cfg');
    expect(json.gdbCommand).toContain('arm-none-eabi-gdb');
    expect(json.gdbCommand).toContain('target remote :3333');
  });

  test('prints a J-Link debug plan using the platform jlinkChip', async () => {
    const { result, output } = await captureCli(['debug', '--platform', 'stm32f4', '--probe', 'jlink', '--json']);
    expect(result.exitCode).toBe(0);
    const json = JSON.parse(output.find((entry) => entry.stream === 'stdout').line);
    expect(json.probe).toBe('jlink');
    expect(json.jlinkServerCommand).toContain('JLinkGDBServer');
    expect(json.jlinkServerCommand).toContain('STM32F411CEU6');
  });

  test('accepts --execute for debug while still honouring --execute=false', async () => {
    const { result } = await captureCli(['debug', '--platform', 'stm32f4', '--probe', 'jlink', '--execute=false', '--json']);
    expect(result.exitCode).toBe(0);
    expect(result.result.probe).toBe('jlink');
  });

  test('rejects unknown debug options', async () => {
    const { result, output } = await captureCli(['debug', '--platform', 'stm32f4', '--target', 'x']);
    expect(result.exitCode).toBe(1);
    expect(output.some((entry) => entry.line.includes('Unknown option for debug: --target'))).toBe(true);
  });

  test('prints a serial monitor plan without starting a monitor', async () => {
    const { result, output } = await captureCli(['monitor', '--port', 'COM5', '--baud-rate', '9600', '--json']);
    expect(result.exitCode).toBe(0);
    const json = JSON.parse(output.find((entry) => entry.stream === 'stdout').line);
    expect(json.success).toBe(true);
    expect(json.channel).toBe('serial');
    expect(json.command).toContain('pio device monitor');
    expect(json.port).toBe('COM5');
    expect(json.baudRate).toBe(9600);
  });

  test('prints an RTT monitor plan with the J-Link headless client', async () => {
    const { result, output } = await captureCli(['monitor', '--channel', 'rtt', '--json']);
    expect(result.exitCode).toBe(0);
    const json = JSON.parse(output.find((entry) => entry.stream === 'stdout').line);
    expect(json.channel).toBe('rtt');
    expect(json.command).toContain('JLinkRTTClient');
  });

  test('rejects unsupported monitor channels', async () => {
    const { result, output } = await captureCli(['monitor', '--channel', 'bluetooth', '--json']);
    expect(result.exitCode).toBe(1);
    expect(output.some((entry) => entry.line.includes('Unsupported monitor channel'))).toBe(true);
  });

  test('accepts --execute for monitor while still honouring --execute=false', async () => {
    const { result } = await captureCli(['monitor', '--channel', 'rtt', '--execute=false', '--json']);
    expect(result.exitCode).toBe(0);
    expect(result.result.channel).toBe('rtt');
  });
});
