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
      '03_Platform/platform_mcu/Inc/platform_i2c.h',
      '03_Platform/platform_mcu/Src/platform_i2c.c'
    ]);
    expect(files[0].content).not.toMatch(/stm32|FreeRTOS|I2C_HandleTypeDef/i);
    expect(files[1].content).toContain('platform_i2c_dma_irq_dispatch');
  });

  test('generates a pin-level GPIO Core pair without transaction semantics', async () => {
    const files = await generateCorePeripheral('gpio', 'stm32f4');
    const header = files[0].content;
    const source = files[1].content;
    expect(files.map((file) => file.path)).toEqual([
      '03_Platform/platform_mcu/Inc/platform_gpio.h',
      '03_Platform/platform_mcu/Src/platform_gpio.c'
    ]);
    expect(header).not.toMatch(/stm32|FreeRTOS|GPIO_TypeDef|HAL_/i);
    expect(header).toContain('platform_gpio_configure');
    expect(header).toContain('platform_gpio_set_pin');
    expect(header).toContain('platform_gpio_get_pin');
    expect(header).toContain('platform_gpio_toggle_pin');
    expect(header).toContain('PLATFORM_GPIO_MODE_OUTPUT');
    expect(header).not.toContain('pf_transfer');
    expect(header).not.toContain('pf_start_async');
    expect(source).toContain('platform_gpio_toggle_pin');
    expect(source).toContain('PLATFORM_ERR_PARAM');
  });

  test('emits double-underscore-free guards and platform error baseline', async () => {
    const files = await generateCorePeripheral('i2c', 'stm32f4');
    const header = files[0].content;
    expect(header).toContain('#ifndef PLATFORM_I2C_H');
    expect(header).not.toMatch(/__[A-Z0-9_]+_H__/);
    expect(header).toMatch(/PLATFORM_ERR_OK\s*=\s*0/);
    expect(header).toContain('PLATFORM_ERR_BUSY');
    expect(header).toContain('PLATFORM_ERR_PARAM');
    expect(header).not.toContain('PLATFORM_ERR_IO');
    expect(header).not.toContain('platform_error_t');
    expect(header).not.toContain('core_status_t');
  });

  test('generates the fixed layered BSP output under the numbered hierarchy', async () => {
    const files = await generateBspDriver({
      deviceType: 'externflash',
      device: 'W25Q64',
      cores: ['spi'],
      platform: 'stm32f4'
    });

    expect(files).toHaveLength(9);
    expect(files.map((file) => file.path)).toEqual(expect.arrayContaining([
      '04_Impl/impl_bsp/externflash/W25Q64/Inc/impl_w25q64_config.h',
      '04_Impl/impl_bsp_handler/externflash/Src/impl_externflash_handle.c',
      '04_Impl/impl_board/externflash/Src/impl_externflash_port.c',
      '03_Platform/platform_bsp/externflash/Src/platform_externflash_wrapper.c'
    ]));
    expect(files.every((file) => file.path.match(/^(?:0[0-9]|99)_/))).toBe(true);
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
      styleProfile: 'style-profile'
    });
    expect(byPath['04_Impl/impl_bsp_handler/display/Inc/impl_display_handle.h'])
      .not.toContain('impl_ssd1306_');
    expect(byPath['04_Impl/impl_board/display/Src/impl_display_port.c'])
      .toContain('osal_mutex_create');
    expect(byPath['04_Impl/impl_board/display/Src/impl_display_port.c'])
      .toMatch(/if \(platform_display_wrapper_register\(&wrapper_ops\) != 0\)\s+goto cleanup_mutex;/);
    expect(byPath['04_Impl/impl_board/display/Src/impl_display_port.c'])
      .not.toMatch(/\(\s*int32_t\s*\(\s*\*/);
    expect(byPath['04_Impl/impl_bsp/display/SSD1306/Inc/impl_ssd1306_config.h'])
      .toContain('IMPL_SSD1306_COLUMN_OFFSET');
    for (const file of files) {
      expect(file.content).toContain('@file');
      expect(file.content).toContain('@par dependencies');
      expect(file.content).toContain('Processing flow');
    }
    expect(byPath['03_Platform/platform_bsp/display/Inc/platform_display_wrapper.h'])
      .toContain('void *p_context');
  });

  test('formats every generated file with the current header date and 80-column layout', async () => {
    const files = [
      ...(await generateCorePeripheral('spi', 'stm32f4')),
      ...(await generateBspDriver({
        deviceType: 'externflash', device: 'W25Q64', cores: ['spi'], platform: 'stm32f4'
      })),
      ...(await generateBspDriver({
        deviceType: 'display', device: 'SSD1306', cores: ['i2c'], platform: 'stm32f4'
      }))
    ];
    const currentDate = new Date().toISOString().slice(0, 10);

    for (const file of files) {
      const lines = file.content.split(/\r?\n/);
      expect(file.content).toContain(`@version V1.0 ${currentDate}`);
      expect(lines.some((line) => line.length > 80)).toBe(false);
      expect(lines.some((line) => line.includes('\t'))).toBe(false);
      expect(lines.some((line) => /typedef\s+(?:struct|enum)\s*\{/.test(line))).toBe(false);
      expect(lines.some((line) => /^\s*(?:static\s+)?[A-Za-z_][\w\s*]*\s+[A-Za-z_]\w*\s*\([^;{}]*\)\s*\{/.test(line))).toBe(false);
      expect(lines.some((line) => /\/\*\*<.*\*\//.test(line) && line.lastIndexOf('*/') !== 78)).toBe(false);
    }
  });
});
