const { generateDriver } = require('../commands/mcu-driver');

describe('MCU Driver Command', () => {
  test('generateDriver creates oled driver files', async () => {
    const result = await generateDriver({
      peripheral: 'oled',
      platform: 'stm32f4'
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.files.length).toBeGreaterThan(0);
  });

  test('generateDriver validates required options', async () => {
    await expect(generateDriver({})).rejects.toThrow('Peripheral is required');
  });
});
