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
    expect(parseArgs(['mcu-build', '--target', 'stm32f4', '--gdb-port=3334'])).toEqual({
      command: 'build',
      options: { target: 'stm32f4', gdbPort: '3334' }
    });
  });

  test('prints a JSON build plan without executing tools', async () => {
    const { result, output } = await captureCli(['build', '--target', 'stm32f4', '--json']);
    expect(result.exitCode).toBe(0);
    const json = JSON.parse(output.find((entry) => entry.stream === 'stdout').line);
    expect(json.success).toBe(true);
    expect(json.command).toContain('cmake');
    expect(output.filter((entry) => entry.stream === 'stderr')).toHaveLength(0);
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
