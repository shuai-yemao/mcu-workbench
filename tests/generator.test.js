const {
  generateBspDriver,
  generateCorePeripheral,
  normalizeCoreList,
  formatExistingCode
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
      '04_Impl/impl_bsp/impl_bsp_handle/externflash/Src/impl_externflash_handle.c',
      '04_Impl/impl_bsp/impl_bsp_port/externflash/Src/impl_externflash_handle_port.c',
      '03_Platform/platform_bsp/externflash/Src/platform_externflash_model.c'
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
      osalResources: [],
      styleProfile: 'style-profile'
    });
    expect(byPath['04_Impl/impl_bsp/impl_bsp_handle/display/Inc/impl_display_handle.h'])
      .toContain('driver_count');
    expect(byPath['04_Impl/impl_bsp/impl_bsp_port/display/Src/impl_display_handle_port.c'])
      .toContain('platform_display_register_default');
    expect(byPath['04_Impl/impl_bsp/impl_bsp_port/display/Src/impl_display_handle_port.c'])
      .toContain('impl_display_handle_read_id');
    expect(byPath['03_Platform/platform_bsp/display/Inc/platform_display_model.h'])
      .toContain('platform_display_device_t');
    expect(byPath['03_Platform/platform_bsp/display/Src/platform_display_wrapper.c']).toBeUndefined();
    for (const file of files) {
      expect(file.content).toContain('@file');
      expect(file.content).toContain('@par 依赖关系');
      expect(file.content).toContain('处理流程：');
      expect(file.content).toContain('Copyright (C) 2024 ProjectName, Inc.(Gmbh) or its affiliates.');
      expect(file.content).toContain('All Rights Reserved.');
    }
    expect(byPath['03_Platform/platform_bsp/display/Inc/platform_display_model.h'])
      .toContain('backend_context');
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
      const paddedComments = lines.filter((line) => /\/\*.*-{5,}.*\*\//.test(line));
      expect(paddedComments
        .filter((line) => /\/\* (?:包含文件|公开|私有)/.test(line))
        .every((line) => line.length === 80)).toBe(true);
      expect(paddedComments
        .filter((line) => /\/\* (?:返回值|超时值|事件|配置|默认值|初始化|读写|回调|辅助|接口)/.test(line))
        .filter((line) => /^\/\*/.test(line))
        .filter((line) => line.slice(line.indexOf('/*')).length > 30)
        .every((line) => line.slice(line.indexOf('/*')).length === 60)).toBe(true);
      expect(lines
        .filter((line) => /\/\* (?:清理|事件|回调|转发|校验|状态|处理) -+ \*\//.test(line))
        .filter((line) => /^\s+\/\*/.test(line))
        .filter((line) => line.slice(line.indexOf('/*')).length > 30)
        .every((line) => line.slice(line.indexOf('/*')).length === 40)).toBe(true);
    }
  });

  test('fails closed when clang-format cannot format a generated file', async () => {
    const previous = process.env.MCUWB_CLANG_FORMAT;
    process.env.MCUWB_CLANG_FORMAT = 'missing-clang-format-for-regression-test';
    try {
      await expect(generateCorePeripheral('spi', 'stm32f4')).rejects.toMatchObject({ code: 'FORMAT' });
    } finally {
      if (previous === undefined) delete process.env.MCUWB_CLANG_FORMAT;
      else process.env.MCUWB_CLANG_FORMAT = previous;
    }
  });

  test('preserves existing Doxygen meaning while completing missing API tags', () => {
    const source = [
      '/**',
      ' * @brief 业务层已有的读取说明。',
      ' * @note 该说明不能被质量管线删除。',
      ' */',
      'int demo_read(int value) { return value; }',
      ''
    ].join('\n');

    const formatted = formatExistingCode(source, 'demo.c');

    expect(formatted).toContain('@brief 业务层已有的读取说明。');
    expect(formatted).toContain('@note 该说明不能被质量管线删除。');
    expect(formatted).toContain('@file demo.c');
    expect(formatted).toMatch(/@param\s+\[in\]\s+value/);
    expect(formatted).toContain('int demo_read(int value)');
  });

  test('regenerates existing comment widths and aligns type-member comments', () => {
    const source = [
      '/* 公开类型 --------------------------------------------------------------------- */',
      '/** @brief 已有类型说明。 */',
      'typedef struct {',
      '    uint8_t short_name; /**< 短字段 */',
      '    uint32_t longer_name; /**< 长字段 */',
      '} demo_config_t;',
      '',
      'int demo_read(void) {',
      '    /* 校验 ---------------- */',
      '    return 0;',
      '}',
      ''
    ].join('\n');

    const formatted = formatExistingCode(source, 'demo.c');
    const lines = formatted.split(/\r?\n/);
    const secondary = lines.find((line) => line.includes('/* 初始化 '));
    const tertiary = lines.find((line) => line.includes('/* 校验 '));
    const memberComments = lines.filter((line) => line.includes('/**<'));

    expect(lines.some((line) => line.includes('/* 公开类型 '))).toBe(true);
    expect(tertiary.slice(tertiary.indexOf('/*')).length).toBe(40);
    expect(memberComments.map((line) => line.indexOf('/**<'))).toEqual([
      memberComments[0].indexOf('/**<'),
      memberComments[0].indexOf('/**<')
    ]);
    expect(secondary).toBeUndefined();
  });

  test('generates complete semantic comments without documenting calls as functions', async () => {
    const files = await generateBspDriver({
      deviceType: 'externflash', device: 'W25Q64', cores: ['spi'], platform: 'stm32f4'
    });
    const port = files.find((file) => file.path.endsWith('impl_externflash_handle_port.c')).content;
    const driver = files.find((file) => file.path.endsWith('impl_w25q64_driver.c')).content;
    const driverHeader = files.find((file) => file.path.endsWith('impl_w25q64_driver.h')).content;

    expect(driver).toContain('@note 缩进使用 4 个空格，禁止使用 TAB。');
    expect(driver).toContain('@brief 读取设备标识。');
    expect(driver).toMatch(/\/\* 转发 -+ \*\//);
    expect(driver).toContain('调用注入的底层操作并传播结果。');
    expect(driver).not.toContain('入口检查与核心处理');
    expect(driver).not.toContain('成员或枚举值说明');
    expect(driverHeader).toContain('#endif /* IMPL_W25Q64_DRIVER_H */');
    expect(port).not.toMatch(/\{\s*\/\*\*[^]*?\*\/\s*return\s+[A-Za-z_]\w*\(/);
  });

  test('uses semantic member comments and padded section banners', async () => {
    const files = await generateCorePeripheral('spi', 'stm32f4');
    const header = files.find((file) => file.path.endsWith('platform_spi.h')).content;
    const source = files.find((file) => file.path.endsWith('platform_spi.c')).content;

    expect(header).toContain('/* 包含文件 ');
    expect(header).not.toContain('/* Includes');
    expect(header).toContain('/* 初始化 ');
    expect(header).toContain('/* 读写 ');
    expect(header).toContain('/* 回调 ');
    expect(header).toMatch(/event_id;\s+\/\*\*< 待处理的事件标识。/);
    expect(header).toMatch(/status;\s+\/\*\*< 事件处理状态。/);
    expect(header).toMatch(/PLATFORM_ERR_OK\s+= 0,.*\n\s+PLATFORM_ERR_PARAM\s+= 3,/);
    expect(header).not.toContain('成员或枚举值说明');
    expect(source).toContain('/* IRQ 功能开关或事件标识 ');
    expect(source).toContain('event->event_id = PLATFORM_SPI_EVENT_IRQ;');
    expect(source).toContain('event->status   = PLATFORM_ERR_OK;');
    expect(source).toContain('event->sequence += 1U;');
    expect(source).toMatch(/\/\* 事件 -+ \*\/[\s\S]*event->event_id = PLATFORM_SPI_EVENT_IRQ;/);
    expect(source).toMatch(/\/\* 状态 -+ \*\/[\s\S]*event->status\s+= PLATFORM_ERR_OK;/);
    expect(source).toContain('检查输入参数、依赖和前置状态。');
    expect(header).toContain('#endif /* PLATFORM_SPI_H */');
    expect(source).toContain('if (instance == NULL || instance->pf_init == NULL) {');
  });
});
