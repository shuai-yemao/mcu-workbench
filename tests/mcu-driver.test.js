const { generateDriver, rejectLegacyPeripheral } = require('../commands/mcu-driver');

describe('MCU Driver Command', () => {
  test('generates the W25Q64 layered BSP slice', async () => {
    const result = await generateDriver({
      deviceType: 'externflash', device: 'W25Q64', core: ['spi'], platform: 'stm32f4'
    });
    expect(result.success).toBe(true);
    expect(result.files).toHaveLength(9);
    expect(result.files.some((file) => file.path.includes('drv_adapter_wrapper_externflash'))).toBe(true);
  });

  test('hard rejects the removed --peripheral option with migration help', () => {
    expect(() => rejectLegacyPeripheral({ peripheral: 'oled' })).toThrow('MCUWB_E_DEPRECATED_PERIPHERAL');
  });

  test('returns the SSD1306 generation manifest with the layered files', async () => {
    const result = await generateDriver({
      deviceType: 'display', device: 'SSD1306', core: ['i2c'], platform: 'stm32f4'
    });
    expect(result.files).toHaveLength(9);
    expect(result.manifest).toMatchObject({
      osalResources: ['mutex'],
      commentProfile: 'workflow-full-doc'
    });
    expect(result.manifest.unresolved[0]).toContain('UNRESOLVED_OSAL_API');
  });
});
