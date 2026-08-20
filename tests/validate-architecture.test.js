const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  compareExpectedFindings,
  validateArchitectureContract
} = require('../lib/architecture-contract');

function withFixture(files, callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'architecture-contract-'));
  try {
    for (const [relativePath, content] of Object.entries(files)) {
      const target = path.join(root, relativePath);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content, 'utf8');
    }
    return callback(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

describe('validateArchitectureContract', () => {
  test('accepts a layered firmware and returns the documented result shape', () => withFixture({
    'Core/Inc/core_i2c.h': 'int core_i2c_write(unsigned bus, const void *data, unsigned timeout_ms);',
    'Core/Port/core_i2c_hw.c': 'int core_i2c_hw_write(void) { return HAL_I2C_Master_Transmit(0, 0, 0, 0, 1); }',
    'Bsp/Driver/sensor_driver.c': '#include "core_i2c.h"\nint sensor_read(void) { return core_i2c_write(0, 0, 10); }',
    'Bsp/Handler/sensor_handler.c': 'int sensor_request(void) { return osal_queue_send(0, 0, 10); }',
    'Bsp/Port/sensor_port.c': 'int sensor_port_init(void) { return HAL_I2C_Init(0); }',
    'Bsp/Wrapper/sensor.h': 'int sensor_read_latest(void *value);',
    'Middlewares/os_adapter/shared/src/osal_task.c': 'int osal_task_create(void) { return os_task_create_impl(); }',
    'Middlewares/os_adapter/FreeRTOS/src/os_impl_task.c': 'int os_task_create_impl(void) { return xTaskCreate(0, 0, 0, 0, 0, 0); }'
  }, (root) => {
    const result = validateArchitectureContract({ root });

    expect(result).toEqual({
      root: path.resolve(root),
      summary: { files: 8, errors: 1, warnings: 0 },
      errors: [expect.objectContaining({ ruleId: 'BSP_PORT_HAL_CALL' })],
      warnings: [],
      findings: [expect.objectContaining({ ruleId: 'BSP_PORT_HAL_CALL' })]
    });
  }));

  test('reports generic layer violations without device-specific names', () => withFixture({
    'Core/Inc/core_bus.h': [
      'I2C_HandleTypeDef *core_bus_native_handle(void);',
      'SemaphoreHandle_t core_bus_lock(void);',
      'int core_i2c_soft_start(unsigned bus);'
    ].join('\n'),
    'Bsp/Driver/sensor_driver.c': [
      '#include "FreeRTOS.h"',
      'int sensor_read(void) { return HAL_I2C_Master_Receive(0, 0, 0, 0, 1); }',
      'int i2c_soft_start(void) { return 0; }'
    ].join('\n'),
    'Bsp/Port/sensor_port.c': [
      'static sensor_driver_t s_driver;',
      'int sensor_port_init(void) { return HAL_I2C_Init(0); }',
      'int sensor_port_read(void) { return HAL_I2C_Master_Receive(0, 0, 0, 0, 1); }',
      'int sensor_port_start(void) { return i2c_soft_start(0); }'
    ].join('\n'),
    'Bsp/Wrapper/sensor.h': 'typedef struct sensor_driver_t sensor_driver_t;',
    'App/main.c': 'int app_start(void) { return HAL_Init(); }',
    'Middlewares/filter/filter.c': '#include "FreeRTOS.h"\nint filter(void) { return HAL_GetTick(); }',
    'Middlewares/os_adapter/shared/src/osal_task.c': [
      'int osal_task_create(void) { return xTaskCreate(0, 0, 0, 0, 0, 0); }',
      'int legacy(void) { return os_impl_task_create(); }'
    ].join('\n')
  }, (root) => {
    const result = validateArchitectureContract({ root });
    const ruleIds = result.errors.map((finding) => finding.ruleId);

    expect(ruleIds).toEqual(expect.arrayContaining([
      'CORE_PUBLIC_VENDOR_TYPE',
      'CORE_PUBLIC_NATIVE_RTOS_TYPE',
      'CORE_PUBLIC_SOFT_I2C_PRIMITIVE',
      'BSP_NATIVE_RTOS',
      'BSP_VENDOR_CALL',
      'BSP_SOFT_I2C_BACKEND',
      'BSP_PORT_SOFT_I2C_PRIMITIVE',
      'BSP_PORT_HAL_CALL',
      'WRAPPER_CONCRETE_TYPE',
      'APP_VENDOR_CALL',
      'MIDDLEWARE_VENDOR_CALL',
      'MIDDLEWARE_NATIVE_RTOS',
      'OS_WRAPPER_NATIVE_RTOS',
      'OS_IMPL_NAMING'
    ]));
    expect(result.findings).toEqual([...result.findings].sort((left, right) => (
      left.file.localeCompare(right.file) || left.line - right.line || left.ruleId.localeCompare(right.ruleId)
    )));
  }));

  test('reports timeout, ISR-token, and logging lock risks as warnings', () => withFixture({
    'Bsp/Handler/sensor_handler.c': 'int sensor_wait(unsigned timeout) { return osal_queue_receive(0, 0, timeout); }',
    'Core/Port/irq_forward.c': 'void irq_forward(void) {\n  taskENTER_CRITICAL_FROM_ISR();\n}',
    'Debug/Port/log_port.c': 'void log_lock(void) { __disable_irq(); }'
  }, (root) => {
    const result = validateArchitectureContract({ root });

    expect(result.summary).toEqual({ files: 3, errors: 0, warnings: 3 });
    expect(result.warnings.map((finding) => finding.ruleId)).toEqual(expect.arrayContaining([
      'AMBIGUOUS_TIMEOUT_UNIT',
      'ISR_CRITICAL_TOKEN_IGNORED',
      'LOG_GLOBAL_IRQ_LOCK'
    ]));
  }));

  test('reports const-qualified OSAL output buffers', () => withFixture({
    'Middlewares/os_adapter/inc/osal_queue.h': [
      'int osal_queue_receive(void *queue,',
      '  const void *data, unsigned timeout_ms);'
    ].join('\n')
  }, (root) => {
    const result = validateArchitectureContract({ root });
    expect(result.warnings).toEqual([
      expect.objectContaining({ ruleId: 'OSAL_CONST_OUTPUT_PARAMETER', line: 1 })
    ]);
  }));

  test('recognizes canonical OS and Core paths while retaining legacy layouts', () => withFixture({
    'OS/Wrapper/osal_task.c': 'int osal_task_create(void) { return xTaskCreate(0, 0, 0, 0, 0, 0); }',
    'OS/Port/freertos_task.c': 'int os_task_create_impl(void) { return xTaskCreate(0, 0, 0, 0, 0, 0); }',
    'Core/Public/core_bus.h': '#include "stm32f4xx_hal.h"'
  }, (root) => {
    const errors = validateArchitectureContract({ root }).errors;
    expect(errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ file: 'OS/Wrapper/osal_task.c', ruleId: 'OS_WRAPPER_NATIVE_RTOS' }),
      expect.objectContaining({ file: 'Core/Public/core_bus.h', ruleId: 'CORE_PUBLIC_VENDOR_INCLUDE' })
    ]));
    expect(errors).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ file: 'OS/Port/freertos_task.c' })
    ]));
  }));

  test('recognizes flat Platform MCU headers as public contracts', () => withFixture({
    '03_Platform/platform_mcu/plat_i2c.h': '#include "stm32f4xx_hal.h"\nplatform_err_t plat_i2c_write(void);',
    '03_Platform/platform_mcu/plat_spi.h': 'typedef I2C_HandleTypeDef leaked_handle_t;'
  }, (root) => {
    const errors = validateArchitectureContract({ root }).errors;
    expect(errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ file: '03_Platform/platform_mcu/plat_i2c.h', ruleId: 'CORE_PUBLIC_VENDOR_INCLUDE' }),
      expect.objectContaining({ file: '03_Platform/platform_mcu/plat_spi.h', ruleId: 'CORE_PUBLIC_VENDOR_TYPE' })
    ]));
  }));

  test('allows Platform public contracts in BSP Drivers and recognizes Impl OS backend headers', () => withFixture({
    '04_Impl/impl_bsp/display/Inc/impl_display_driver.h': [
      '#include "platform_gpio.h"',
      '#include "platform_spi.h"',
      '#include "platform_tick.h"'
    ].join('\n'),
    '04_Impl/impl_bsp/display/Src/impl_display_driver.c': '#include "impl_display_driver.h"',
    '04_Impl/impl_bsp/display/Src/impl_bad_driver.c': [
      '#include "FreeRTOS.h"',
      '#include "stm32f4xx_hal.h"'
    ].join('\n'),
    '04_Impl/impl_os/inc/impl_os_freertos.h': [
      '#include "FreeRTOS.h"',
      '#include "task.h"'
    ].join('\n')
  }, (root) => {
    const result = validateArchitectureContract({ root });

    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        file: '04_Impl/impl_bsp/display/Src/impl_bad_driver.c',
        ruleId: 'BSP_NATIVE_RTOS'
      }),
      expect.objectContaining({
        file: '04_Impl/impl_bsp/display/Src/impl_bad_driver.c',
        ruleId: 'BSP_HAL_DRIVER_CONCRETE_DEPENDENCY'
      })
    ]));
    expect(result.findings).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        file: '04_Impl/impl_bsp/display/Inc/impl_display_driver.h',
        ruleId: 'BSP_HAL_DRIVER_CONCRETE_DEPENDENCY'
      }),
      expect.objectContaining({
        file: '04_Impl/impl_os/inc/impl_os_freertos.h',
        ruleId: 'OS_WRAPPER_NATIVE_RTOS'
      })
    ]));
  }));

  test('requires OS Wrapper public calls to forward to their matching internal implementation', () => withFixture({
    'OS/Wrapper/osal_task.c': 'int osal_task_create(void) { return unrelated_call(); }',
    'OS/Wrapper/osal_queue.c': 'int osal_queue_create(void) { return os_queue_create_impl(); }',
    'OS/Wrapper/osal_timer.c': [
      'int osal_timer_create(int invalid) {',
      '  const char *closing_brace = "}";',
      '  if (invalid) { return -1; }',
      '  return os_timer_create_impl();',
      '}'
    ].join('\n'),
    'Middlewares/os_adapter/shared/src/osal_mutex.c': 'int osal_mutex_create(void) { return os_mutex_create_impl(); }',
    'OS/Port/freertos_task.c': 'int os_task_create_impl(void) { return xTaskCreate(0, 0, 0, 0, 0, 0); }'
  }, (root) => {
    const errors = validateArchitectureContract({ root }).errors;
    expect(errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ file: 'OS/Wrapper/osal_task.c', ruleId: 'OS_WRAPPER_IMPL_FORWARDING' })
    ]));
    expect(errors).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ file: 'OS/Wrapper/osal_queue.c', ruleId: 'OS_WRAPPER_IMPL_FORWARDING' }),
      expect.objectContaining({ file: 'Middlewares/os_adapter/shared/src/osal_mutex.c', ruleId: 'OS_WRAPPER_IMPL_FORWARDING' }),
      expect.objectContaining({ file: 'OS/Port/freertos_task.c', ruleId: 'OS_WRAPPER_IMPL_FORWARDING' })
    ]));
    expect(errors).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ file: 'OS/Wrapper/osal_timer.c', ruleId: 'OS_WRAPPER_IMPL_FORWARDING' })
    ]));
  }));

  test('requires Port injections on the registration path rather than in dead static helpers', () => withFixture({
    'Bsp/Port/sensor_port.c': [
      'static void sensor_inject_everything(void) {',
      '  sensor_driver_register_core_ops(&core_ops);',
      '  sensor_driver_register_mcu_ops(&mcu_ops);',
      '  sensor_handler_register_osal_ops(&osal_ops);',
      '  sensor_handler_register_driver(&driver_ops);',
      '}',
      'int sensor_port_register(void) { return 0; }'
    ].join('\n')
  }, (root) => {
    const ruleIds = validateArchitectureContract({ root }).errors.map((finding) => finding.ruleId);
    expect(ruleIds).toEqual(expect.arrayContaining([
      'BSP_PORT_CORE_OPS_INJECTION',
      'BSP_PORT_MCU_OPS_INJECTION',
      'BSP_PORT_OS_WRAPPER_OPS_INJECTION',
      'BSP_PORT_HAL_DRIVER_OPS_INJECTION'
    ]));
  }));

  test('does not count injection helpers reachable only through an always-false branch', () => withFixture({
    'Bsp/Port/sensor_port.c': [
      'static void sensor_inject_everything(void) {',
      '  sensor_driver_register_core_ops(&core_ops);',
      '  sensor_driver_register_mcu_ops(&mcu_ops);',
      '  sensor_handler_register_osal_ops(&osal_ops);',
      '  sensor_handler_register_driver(&driver_ops);',
      '}',
      'int sensor_port_register(void) {',
      '  if (0) { sensor_inject_everything(); }',
      '  return 0;',
      '}'
    ].join('\n')
  }, (root) => {
    const ruleIds = validateArchitectureContract({ root }).errors.map((finding) => finding.ruleId);
    expect(ruleIds).toEqual(expect.arrayContaining([
      'BSP_PORT_CORE_OPS_INJECTION',
      'BSP_PORT_MCU_OPS_INJECTION',
      'BSP_PORT_OS_WRAPPER_OPS_INJECTION',
      'BSP_PORT_HAL_DRIVER_OPS_INJECTION'
    ]));
  }));

  test('ignores comments, preserved ISR tokens, and vendored source trees', () => withFixture({
    'Bsp/Handler/sensor_handler.c': [
      '/* unsigned timeout; taskENTER_CRITICAL_FROM_ISR(); */',
      'unsigned token = taskENTER_CRITICAL_FROM_ISR();'
    ].join('\n'),
    'Middlewares/Third_Party/FreeRTOS/tasks.c': 'unsigned timeout; taskENTER_CRITICAL_FROM_ISR();'
  }, (root) => {
    const result = validateArchitectureContract({ root });

    expect(result).toEqual(expect.objectContaining({
      summary: { files: 1, errors: 0, warnings: 0 },
      findings: []
    }));
  }));

  test('supports project-specific directory layouts without changing rules', () => withFixture({
    'Board/Adapter/sensor_port.c': 'int init(void) { return HAL_I2C_Init(0); }'
  }, (root) => {
    const result = validateArchitectureContract({
      root,
      layout: {
        bsp: ['^Board/'],
        bspPort: ['^Board/Adapter/']
      }
    });

    expect(result.errors).toEqual([
      expect.objectContaining({ ruleId: 'BSP_PORT_HAL_CALL' })
    ]);
  }));

  test('treats a null layout as the default layout', () => withFixture({
    'Bsp/Port/sensor_port.c': 'int init(void) { return HAL_I2C_Init(0); }'
  }, (root) => {
    const result = validateArchitectureContract({ root, layout: null });
    expect(result.errors).toEqual([
      expect.objectContaining({ ruleId: 'BSP_PORT_HAL_CALL' })
    ]);
  }));

  test('allows Port Driver instances and generic HAL Bus Ops but rejects bit timing and duplicate caches', () => withFixture({
    'Bsp/Port/sensor_port.c': [
      'static sensor_driver_t s_driver;',
      'static float s_latest_temperature;',
      'int init(void) { return HAL_GPIO_Init(0, 0); }',
      'int read(void) { return HAL_I2C_Master_Transmit(0, 0, 0, 0, 1); }',
      'int start(void) { return i2c_soft_start(0); }'
    ].join('\n')
  }, (root) => {
    const result = validateArchitectureContract({ root });

    expect(result.errors.map((finding) => finding.ruleId)).toEqual(expect.arrayContaining([
      'BSP_PORT_SOFT_I2C_PRIMITIVE',
      'BSP_PORT_DUPLICATE_DEVICE_CACHE',
      'BSP_PORT_HAL_CALL'
    ]));
  }));

  test('keeps production and Fake Port assembly contracts interchangeable for one Wrapper', () => {
    const registrationContract = 'int sensor_wrapper_reg(const sensor_drv_t *drv);';
    const productionPort = [
      '#include "sensor_port.h"',
      'int sensor_port_init(void) {',
      '  HAL_GPIO_Init(0, 0);',
      '  return core_i2c_bind(0);',
      '}',
      'int sensor_port_register(void) {',
      '  sensor_driver_register_core_ops(&core_ops);',
      '  sensor_driver_register_mcu_ops(&mcu_ops);',
      '  sensor_handler_register_osal_ops(&osal_ops);',
      '  sensor_handler_register_driver(&driver_ops);',
      '  sensor_drv_t drv = { sensor_port_init };',
      '  return sensor_wrapper_reg(&drv);',
      '}'
    ].join('\n');
    const fakePort = [
      '#include "sensor_port.h"',
      'int sensor_fake_init(void) { return fake_i2c_bind(0); }',
      'int sensor_port_register(void) {',
      '  sensor_driver_register_core_ops(&core_ops);',
      '  sensor_driver_register_mcu_ops(&mcu_ops);',
      '  sensor_handler_register_osal_ops(&osal_ops);',
      '  sensor_handler_register_driver(&driver_ops);',
      '  sensor_drv_t drv = { sensor_fake_init };',
      '  return sensor_wrapper_reg(&drv);',
      '}'
    ].join('\n');

    expect(productionPort).toContain('sensor_wrapper_reg(&drv)');
    expect(fakePort).toContain('sensor_wrapper_reg(&drv)');
    return withFixture({
      'Bsp/Port/production/sensor_port.c': productionPort,
      'Bsp/Port/fake/sensor_port.c': fakePort,
      'Bsp/Wrapper/sensor_wrapper.c': [
        'typedef struct { int (*init)(void); } sensor_drv_t;',
        'static sensor_drv_t s_sensor;',
        registrationContract,
        'int sensor_wrapper_reg(const sensor_drv_t *drv) {',
        '  s_sensor = *drv;',
        '  return 0;',
        '}'
      ].join('\n')
    }, (root) => {
      const result = validateArchitectureContract({ root });
      expect(result.errors).toEqual([
        expect.objectContaining({
          file: 'Bsp/Port/production/sensor_port.c',
          ruleId: 'BSP_PORT_HAL_CALL'
        })
      ]);
      expect(result.warnings).toEqual([]);
    });
  });

  test('keeps Wrapper platform-free and treats User_Task platform ports as APP Facades', () => withFixture({
    'Bsp/Wrapper/sensor_wrapper.c': '#include "drv_adapter_port_sensor.h"\nint sensor_wrapper(void) { return 0; }',
    'User_Task/User_Sensor/Platform/temphumi_port/temphumi_port.c': [
      '#include "drv_adapter_wapper_temp_humi.h"',
      'int temphumi_read_temp(void) { return drv_adapter_temphumi_read_temp(); }'
    ].join('\n'),
    'User_Task/User_Sensor/Platform/display_port/display_port.c': '#include "bsp_st7789_driver.h"\nint draw(void) { return 0; }'
  }, (root) => {
    const result = validateArchitectureContract({ root });
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'WRAPPER_PLATFORM_DEPENDENCY' }),
      expect.objectContaining({ ruleId: 'APP_FACADE_CONCRETE_DEPENDENCY' })
    ]));
    expect(result.findings).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ file: 'User_Task/User_Sensor/Platform/temphumi_port/temphumi_port.c' })
    ]));
  }));

  test('allows Port OSAL resource creation but rejects worker entry definitions and configured protocol patterns', () => withFixture({
    'Bsp/Port/flash_port.c': [
      'int flash_port_init(void) {',
      '  return osal_task_create("Flash", flash_handler_thread, 256, 16, 0);',
      '}',
      'int flash_port_command(void) { return AHT21_CMD_TRIGGER; }'
    ].join('\n'),
    'Bsp/Handler/flash_handler.c': 'void flash_handler_thread(void *arg) { while (1) { osal_queue_receive(0, 0, 0); } }',
    'Bsp/Port/bad_thread_port.c': 'static void sensor_worker_thread(void *arg) { while (1) { } }'
  }, (root) => {
    const result = validateArchitectureContract({
      root,
      layout: {
        portDeviceProtocolPatterns: [{
          id: 'sensor-command',
          pattern: '\\bAHT21_CMD_[A-Z0-9_]+\\b',
          message: 'Device commands belong in Driver.'
        }]
      }
    });
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'BSP_PORT_HANDLER_THREAD_BODY' }),
      expect.objectContaining({ ruleId: 'BSP_PORT_DEVICE_PROTOCOL_CALL' })
    ]));
    expect(result.findings).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ file: 'Bsp/Port/flash_port.c', ruleId: 'BSP_PORT_HANDLER_THREAD_BODY' })
    ]));
  }));

  test('compares a reviewed finding manifest exactly by rule, severity, file, and line', () => {
    const findings = [{
      ruleId: 'BSP_VENDOR_CALL', severity: 'error', file: 'Bsp/Driver/sensor.c', line: 7,
      message: 'details may evolve', evidence: 'HAL_I2C_Init(0);'
    }];
    const expected = {
      source: { commit: 'fixed-commit' },
      findings: [{
        ruleId: 'BSP_VENDOR_CALL', severity: 'error', file: 'Bsp/Driver/sensor.c', line: 7
      }]
    };

    expect(compareExpectedFindings(findings, expected)).toEqual({
      matches: true,
      missing: [],
      unexpected: []
    });
    expect(compareExpectedFindings([{ ...findings[0], line: 8 }], expected)).toEqual({
      matches: false,
      missing: expected.findings,
      unexpected: [{
        ruleId: 'BSP_VENDOR_CALL', severity: 'error', file: 'Bsp/Driver/sensor.c', line: 8
      }]
    });
    expect(compareExpectedFindings(findings, {
      findings: [expected.findings[0], expected.findings[0]]
    }).matches).toBe(false);
  });

  test('enforces Wrapper independence and injection-only BSP implementation roles', () => withFixture({
    'Bsp/Wrapper/sensor_wrapper.c': '#include "drv_adapter_port_sensor.h"\nint sensor_wrapper(void) { return 0; }',
    'Bsp/Handler/sensor_handler.c': '#include "core_i2c.h"\nint sensor_handler(void) { return 0; }',
    'Bsp/Driver/sensor_driver.c': '#include "stm32f4xx_hal.h"\nint sensor_driver(void) { return HAL_I2C_Init(0); }',
    'Bsp/Port/sensor_port.c': [
      'int sensor_port_register(void) {',
      '  return sensor_wrapper_register(0);',
      '}'
    ].join('\n')
  }, (root) => {
    const ruleIds = validateArchitectureContract({ root }).errors.map((finding) => finding.ruleId);

    expect(ruleIds).toEqual(expect.arrayContaining([
      'BSP_WRAPPER_CONCRETE_DEPENDENCY',
      'BSP_HANDLER_INJECTION_DEPENDENCY',
      'BSP_HAL_DRIVER_CONCRETE_DEPENDENCY',
      'BSP_PORT_CORE_OPS_INJECTION',
      'BSP_PORT_MCU_OPS_INJECTION',
      'BSP_PORT_OS_WRAPPER_OPS_INJECTION',
      'BSP_PORT_HAL_DRIVER_OPS_INJECTION'
    ]));
  }));

  test('keeps the pinned source manifest reviewable and exact', () => {
    const manifestPath = path.join(
      __dirname, 'fixtures', 'architecture', 'sensor-temp-humi-eb5f38b.expected.json'
    );
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    expect(manifest.source).toEqual(expect.objectContaining({
      branch: 'Sensor_temp_humi',
      commit: 'eb5f38b3acb55063b6a3e2777aae2fb983cda8bf'
    }));
    expect(manifest.findings).toHaveLength(
      manifest.summary.errors + manifest.summary.warnings
    );
    expect(manifest.findings.every((finding) => (
      finding.ruleId && finding.severity && finding.file && Number.isInteger(finding.line)
    ))).toBe(true);
  });
});
