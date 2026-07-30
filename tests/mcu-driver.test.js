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
});
