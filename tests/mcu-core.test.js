const { generateCore } = require('../commands/mcu-core');

describe('MCU Core Command', () => {
  test('generates one canonical i2c Core pair from the iic input alias', async () => {
    const result = await generateCore({ peripheral: 'iic', platform: 'stm32f4' });
    expect(result.peripheral).toBe('i2c');
    expect(result.files).toHaveLength(2);
  });
});
