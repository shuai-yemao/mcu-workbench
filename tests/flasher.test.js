const { getFlashCommand, flashFirmware } = require('../lib/flasher');

describe('Flasher Module', () => {
  test('getFlashCommand returns stlink command for stm32f4', () => {
    const cmd = getFlashCommand('stm32f4', 'stlink');
    expect(cmd).toContain('st-flash');
  });

  test('getFlashCommand returns esptool command for esp32', () => {
    const cmd = getFlashCommand('esp32', 'esptool');
    expect(cmd).toContain('esptool.py');
  });

  test('flashFirmware returns success object', async () => {
    const result = await flashFirmware('/tmp/test-project', 'stm32f4', 'stlink');
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.output).toContain('Flash complete');
  });
});
