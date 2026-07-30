const {
  generateBspDriver,
  generateCorePeripheral,
  normalizeCoreList
} = require('../lib/generator');

describe('Generator Module', () => {
  test('normalizes iic and removes duplicate Core selectors', () => {
    expect(normalizeCoreList(['iic', 'spi', 'i2c'])).toEqual(['i2c', 'spi']);
  });

  test('generates exactly one Core C/H pair for an MCU peripheral', async () => {
    const files = await generateCorePeripheral('iic', 'stm32f4');
    expect(files.map((file) => file.path)).toEqual([
      'Core/Inc/core_i2c.h',
      'Core/Src/core_i2c.c'
    ]);
    expect(files[0].content).not.toMatch(/stm32|FreeRTOS|I2C_HandleTypeDef/i);
    expect(files[1].content).toContain('core_i2c_dma_irq_dispatch');
  });

  test('generates the fixed layered BSP output without System files', async () => {
    const files = await generateBspDriver({
      deviceType: 'externflash',
      device: 'W25Q64',
      cores: ['spi'],
      platform: 'stm32f4'
    });

    expect(files).toHaveLength(9);
    expect(files.map((file) => file.path)).toEqual(expect.arrayContaining([
      'Bsp/BoardDriver/externflash/Driver/W25Q64/Inc/bsp_w25q64_config.h',
      'Bsp/BoardDriver/externflash/Handle/Src/bsp_externflash_handle.c',
      'Bsp/Porting/externflash/Src/drv_adapter_port_externflash.c',
      'Bsp/Wrapper/externflash/Src/drv_adapter_wrapper_externflash.c'
    ]));
    expect(files.some((file) => file.path.startsWith('System/'))).toBe(false);
  });

  test('enforces known device profiles and requires custom opt-in for unknown devices', async () => {
    await expect(generateBspDriver({
      deviceType: 'sensor', device: 'MPU6050', cores: ['spi'], platform: 'stm32f4'
    })).rejects.toThrow('requires --device-type sensor and --core i2c');
    await expect(generateBspDriver({
      deviceType: 'sensor', device: 'CUSTOM01', cores: ['i2c'], platform: 'stm32f4'
    })).rejects.toThrow('Unknown device');
    await expect(generateBspDriver({
      deviceType: 'sensor', device: 'CUSTOM01', cores: ['i2c'], platform: 'stm32f4', allowCustomDevice: true
    })).resolves.toHaveLength(9);
  });
});
