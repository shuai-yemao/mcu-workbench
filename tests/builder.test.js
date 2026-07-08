const { getBuildCommand, buildProject } = require('../lib/builder');

describe('Builder Module', () => {
  test('getBuildCommand returns cmake command for stm32f4', () => {
    const cmd = getBuildCommand('stm32f4');
    expect(cmd).toContain('cmake');
    expect(cmd).toContain('-DCMAKE_TOOLCHAIN_FILE');
  });

  test('getBuildCommand returns make command for esp32', () => {
    const cmd = getBuildCommand('esp32');
    expect(cmd).toContain('idf.py build');
  });

  test('buildProject returns success object', async () => {
    const result = await buildProject('/tmp/test-project', 'stm32f4');
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.output).toContain('Build complete');
  });
});
