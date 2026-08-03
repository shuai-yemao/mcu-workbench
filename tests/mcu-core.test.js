const { generateCore } = require('../commands/mcu-core');

describe('MCU Core Command', () => {
  test('generates one canonical i2c Core pair', async () => {
    const result = await generateCore({ peripheral: 'i2c', platform: 'stm32f4' });
    expect(result.peripheral).toBe('i2c');
    expect(result.files).toHaveLength(2);
  });
});
