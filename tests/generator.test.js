const { generateBspDriver, generateSystemAdapter } = require('../lib/generator');

describe('Generator Module', () => {
  test('generateBspDriver returns driver files for oled', async () => {
    const files = await generateBspDriver('oled', 'stm32f4');
    expect(Array.isArray(files)).toBe(true);
    expect(files.length).toBeGreaterThan(0);

    const headerFile = files.find(f => f.path.includes('bsp_oled_driver.h'));
    expect(headerFile).toBeDefined();
    expect(headerFile.content).toContain('oled_operations_t');
  });

  test('generateSystemAdapter returns adapter files for stm32f4', async () => {
    const files = await generateSystemAdapter('stm32f4');
    expect(Array.isArray(files)).toBe(true);

    const adapterFile = files.find(f => f.path.includes('system_oled.c'));
    expect(adapterFile).toBeDefined();
    expect(adapterFile.content).toContain('oled_operations_myown');
  });

  test('generateBspDriver throws for unsupported peripheral', async () => {
    await expect(generateBspDriver('unsupported', 'stm32f4'))
      .rejects.toThrow('Unsupported peripheral');
  });
});
