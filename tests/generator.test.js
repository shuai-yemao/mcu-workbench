const {
  generateBspDriver,
  generateCorePeripheral,
  normalizeCoreList
} = require('../lib/generator');

describe('Generator Module', () => {
  test('normalizes and deduplicates Core selectors', () => {
    expect(normalizeCoreList(['i2c', 'spi', 'i2c'])).toEqual(['i2c', 'spi']);
    expect(() => normalizeCoreList(['iic'])).toThrow('Unsupported Core peripheral: iic');
  });

  test('generates exactly one Core C/H pair for an MCU peripheral', async () => {
    const files = await generateCorePeripheral('i2c', 'stm32f4');
    expect(files.map((file) => file.path)).toEqual([
      'Core/Inc/core_i2c.h',
      'Core/Src/core_i2c.c'
    ]);
    expect(files[0].content).not.toMatch(/stm32|FreeRTOS|I2C_HandleTypeDef/i);
    expect(files[1].content).toContain('core_i2c_dma_irq_dispatch');
  });

  test('generates a pin-level GPIO Core pair without transaction semantics', async () => {
    const files = await generateCorePeripheral('gpio', 'stm32f4');
    const header = files[0].content;
    const source = files[1].content;
    expect(files.map((file) => file.path)).toEqual([
      'Core/Inc/core_gpio.h',
      'Core/Src/core_gpio.c'
    ]);
    expect(header).not.toMatch(/stm32|FreeRTOS|GPIO_TypeDef|HAL_/i);
    expect(header).toContain('core_gpio_configure');
    expect(header).toContain('core_gpio_set_pin');
    expect(header).toContain('core_gpio_get_pin');
    expect(header).toContain('core_gpio_toggle_pin');
    expect(header).toContain('CORE_GPIO_MODE_OUTPUT');
    expect(header).not.toContain('pf_transfer');
    expect(header).not.toContain('pf_start_async');
    expect(source).toContain('core_gpio_toggle_pin');
    expect(source).toContain('CORE_STATUS_INVALID_ARGUMENT');
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

  test('generates the SSD1306 display slice with a manifest and context-first layers', async () => {
    const files = await generateBspDriver({
      deviceType: 'display', device: 'SSD1306', cores: ['i2c'], platform: 'stm32f4'
    });
    const byPath = Object.fromEntries(files.map((file) => [file.path, file.content]));

    expect(files).toHaveLength(9);
    expect(files.manifest).toMatchObject({
      device: 'SSD1306',
      deviceType: 'display',
      osalResources: ['mutex'],
      commentProfile: 'workflow-full-doc'
    });
    expect(byPath['Bsp/BoardDriver/display/Handle/Inc/bsp_display_handle.h'])
      .not.toContain('bsp_ssd1306_');
    expect(byPath['Bsp/Porting/display/Src/drv_adapter_port_display.c'])
      .toContain('osal_mutex_create');
    expect(byPath['Bsp/Porting/display/Src/drv_adapter_port_display.c'])
      .toContain('if (drv_adapter_wrapper_display_register(&wrapper_ops) != 0) goto cleanup_mutex;');
    expect(byPath['Bsp/Porting/display/Src/drv_adapter_port_display.c'])
      .not.toMatch(/\(\s*int32_t\s*\(\s*\*/);
    expect(byPath['Bsp/BoardDriver/display/Driver/SSD1306/Inc/bsp_ssd1306_config.h'])
      .toContain('BSP_SSD1306_COLUMN_OFFSET');
    for (const file of files) {
      expect(file.content).toContain('@file');
      expect(file.content).toContain('@par dependencies');
      expect(file.content).toContain('Processing flow');
    }
    expect(byPath['Bsp/Wrapper/display/Inc/drv_adapter_wrapper_display.h'])
      .toContain('void *p_context');
  });
});
