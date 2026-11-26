const {
  generate,
  listCapabilities,
  listRenderers
} = require('../lib/codegen');

describe('Unified Codegen Runtime', () => {
  test('reports the complete layer catalog without claiming unsupported renderers', () => {
    const capabilities = Object.fromEntries(listCapabilities().map((item) => [item.id, item]));
    expect(capabilities.platform_common).toMatchObject({
      status: 'partial',
      renderer: 'platform-common.foundation'
    });
    expect(capabilities.impl_mcu).toMatchObject({
      status: 'missing-contract',
      renderer: 'contract.impl_mcu'
    });
    expect(capabilities.impl_board).toMatchObject({
      status: 'partial',
      renderer: 'impl-board.composition'
    });
    expect(capabilities.platform_mcu).toMatchObject({
      status: 'partial',
      renderer: 'platform-mcu.core'
    });
    expect(capabilities.impl_bsp_driver.renderer).toBe('impl-bsp.driver');
    expect(capabilities.impl_bsp_handle.renderer).toBe('impl-bsp.handle');
    expect(capabilities.impl_bsp_port.renderer).toBe('impl-bsp.port');
    expect(capabilities.platform_os.renderer).toBe('contract.platform_os');
    expect(capabilities.impl_os.renderer).toBe('contract.impl_os');
    expect(capabilities.impl_mcu.renderer).toBe('contract.impl_mcu');
  });

  test('registers the current Core and BSP renderers centrally', () => {
    const ids = listRenderers().map((renderer) => renderer.id);
    expect(ids).toEqual(expect.arrayContaining([
      'platform-mcu.core',
      'impl-bsp.model-first',
      'platform-bsp.model',
      'impl-bsp.driver',
      'impl-bsp.handle',
      'impl-bsp.port',
      'contract.platform_os',
      'contract.impl_os',
      'contract.impl_mcu'
    ]));
  });

  test('generates Core output through the unified request interface', async () => {
    const files = await generate({
      kind: 'core',
      peripheral: 'gpio',
      platform: 'stm32f4'
    });
    expect(files.map((file) => file.path)).toEqual([
      '03_Platform/platform_mcu/Inc/platform_gpio.h',
      '03_Platform/platform_mcu/Src/platform_gpio.c'
    ]);
    expect(files.manifest).toMatchObject({
      schemaVersion: 'codegen-manifest-v1',
      kind: 'core',
      renderer: { id: 'platform-mcu.core' },
      requestedLayers: ['platform_mcu']
    });
  });

  test('generates the platform_common foundation from its explicit file contract', async () => {
    const files = await generate({ kind: 'platform_common' });
    expect(files).toHaveLength(16);
    expect(files.filter((file) => file.path.endsWith('.c'))).toHaveLength(6);
    expect(files.map((file) => file.path)).toEqual(expect.arrayContaining([
      '03_Platform/platform_common/core/platform_error.h',
      '03_Platform/platform_common/object/src/platform_object.c',
      '03_Platform/platform_common/manager/src/device_manager.c',
      '03_Platform/platform_common/diag/platform_version.c'
    ]));
    expect(files.manifest).toMatchObject({
      kind: 'platform_common',
      renderer: { id: 'platform-common.foundation' },
      generatedFileHashes: expect.objectContaining({
        '03_Platform/platform_common/core/platform_error.h': expect.any(String)
      }),
      unresolved: expect.arrayContaining([
        expect.stringContaining('UNRESOLVED_VERSION_CONFIG_API')
      ])
    });
    expect(files.every((file) => !/FreeRTOS|RTOS|stm32|HAL_/i.test(file.content))).toBe(true);
    const generatedText = files.map((file) => file.content).join('\n');
    expect(generatedText).toContain('platform_err_t (*wakeup)(void *p_self)');
    expect(generatedText).toContain('PLATFORM_ERR_NOT_FOUND');
    expect(generatedText).toContain('PLATFORM_SERVICE_CLASS_DIAGNOSIS');
    expect(generatedText).not.toContain('supported_actions');
    expect(generatedText).not.toContain('platform_lifecycle_action_t');
    expect(generatedText).not.toContain('platform_assert');
  });

  test('generates an impl_board composition root that only calls Port registration', async () => {
    const files = await generate({
      kind: 'impl_board',
      board: 'stm32f411ceu6',
      deviceTypes: ['sensor', 'externflash']
    });
    expect(files).toHaveLength(2);
    expect(files.map((file) => file.path)).toEqual([
      '04_Impl/impl_board/Inc/impl_board_stm32f411ceu6_bsp.h',
      '04_Impl/impl_board/Src/impl_board_stm32f411ceu6_bsp.c'
    ]);
    expect(files[1].content).toContain('impl_sensor_handle_port_register');
    expect(files[1].content).toContain('impl_externflash_handle_port_register');
    expect(files[1].content).not.toMatch(/HAL_|FreeRTOS|stm32f4.*hal/i);
    expect(files.manifest).toMatchObject({
      kind: 'impl_board',
      renderer: { id: 'impl-board.composition' },
      unresolved: expect.arrayContaining([
        expect.stringContaining('UNRESOLVED_BOARD_RESOURCE_API')
      ])
    });
  });

  test.each([
    ['platform_os', 'contract.platform_os', 'platform_os', 'UNRESOLVED_PLATFORM_OS_PUBLIC_HEADER'],
    ['impl_os', 'contract.impl_os', 'impl_os', 'UNRESOLVED_IMPL_OS_BACKEND'],
    ['impl_mcu', 'contract.impl_mcu', 'impl_mcu', 'UNRESOLVED_IMPL_MCU_BACKEND_CONTRACT'],
    ['platform_middleware', 'contract.platform_middleware', 'platform_middleware', 'UNRESOLVED_PLATFORM_MIDDLEWARE_CONTRACT'],
    ['impl_middleware', 'contract.impl_middleware', 'impl_middleware', 'UNRESOLVED_MIDDLEWARE_VENDOR_MAPPING'],
    ['app', 'contract.app', 'app', 'UNRESOLVED_APP_PROFILE'],
    ['service', 'contract.service', 'service', 'UNRESOLVED_SERVICE_PROFILE'],
    ['vendor', 'contract.vendor', 'vendor', 'UNRESOLVED_VENDOR_SOURCE_MAPPING'],
    ['build', 'contract.build', 'build', 'UNRESOLVED_BUILD_ENTRY']
  ])('generates a contract artifact for %s without claiming C output', async (kind, renderer, layer, unresolved) => {
    const files = await generate({ kind, name: 'baseline', evidence: [{ id: 'source', status: 'unverified' }] });
    expect(files).toHaveLength(1);
    expect(files[0].path).toContain(`00_Docs/05_Codegen_Contracts/${layer}/baseline.codegen.json`);
    expect(files[0].content).toContain('codegen-contract-v1');
    expect(files[0].content).toContain(unresolved);
    expect(files[0].content).not.toMatch(/#include|xTaskCreate|xQueueCreate|CMakeLists/i);
    expect(files.manifest).toMatchObject({
      kind,
      renderer: { id: renderer },
      requestedLayers: [layer],
      contractOnly: true,
      validation: { status: 'unverified' }
    });
  });

  test('generates BSP output through the unified request interface', async () => {
    const files = await generate({
      kind: 'bsp',
      deviceType: 'sensor',
      device: 'AHT21',
      cores: ['i2c'],
      platform: 'stm32f4'
    });
    expect(files).toHaveLength(9);
    expect(files.manifest).toMatchObject({
      schemaVersion: 'codegen-manifest-v1',
      kind: 'bsp',
      renderer: { id: 'impl-bsp.model-first' },
      requestedLayers: ['platform_bsp']
    });
  });

  test.each([
    ['bsp_model', 'platform-bsp.model', 'platform_bsp', 2],
    ['bsp_driver', 'impl-bsp.driver', 'impl_bsp_driver', 3],
    ['bsp_handle', 'impl-bsp.handle', 'impl_bsp_handle', 2],
    ['bsp_port', 'impl-bsp.port', 'impl_bsp_port', 2]
  ])('generates the %s BSP part independently', async (kind, renderer, layer, count) => {
    const files = await generate({
      kind,
      deviceType: 'sensor',
      device: 'AHT21',
      cores: ['i2c'],
      platform: 'stm32f4'
    });
    expect(files).toHaveLength(count);
    expect(files.manifest).toMatchObject({
      kind,
      renderer: { id: renderer },
      requestedLayers: [layer],
      ir: { unresolved: expect.any(Array) }
    });
    expect(files.manifest.bspPart).toBe(kind.replace('bsp_', ''));
  });

  test('orchestrates multiple layer requests and emits one manifest', async () => {
    const files = await generate({
      requests: [
        { kind: 'core', peripheral: 'gpio', platform: 'stm32f4' },
        { kind: 'bsp', deviceType: 'sensor', device: 'AHT21', cores: ['i2c'], platform: 'stm32f4' }
      ]
    });
    expect(files).toHaveLength(11);
    expect(files.manifest).toMatchObject({
      schemaVersion: 'codegen-manifest-v1',
      requestCount: 2,
      requests: [
        { kind: 'core', renderer: { id: 'platform-mcu.core' } },
        { kind: 'bsp', renderer: { id: 'impl-bsp.model-first' } }
      ]
    });
  });

  test('rejects duplicate generated paths across renderers', async () => {
    await expect(generate({
      requests: [
        { kind: 'core', peripheral: 'gpio', platform: 'stm32f4' },
        { kind: 'core', peripheral: 'gpio', platform: 'stm32f4' }
      ]
    })).rejects.toMatchObject({ code: 'CODEGEN_OUTPUT_COLLISION' });
  });

  test('rejects unsupported layers before invoking a renderer', async () => {
    await expect(generate({
      kind: 'core',
      peripheral: 'gpio',
      platform: 'stm32f4',
      requestedLayers: ['service']
    })).rejects.toThrow('must include the platform_mcu layer');
  });
});
