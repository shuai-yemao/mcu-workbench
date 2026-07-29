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
    'Bsp/Port/sensor_port.c': 'int sensor_port_init(void) { return 0; }',
    'Bsp/Wrapper/sensor.h': 'int sensor_read_latest(void *value);',
    'Middlewares/os_adapter/shared/src/osal_task.c': 'int osal_task_create(void) { return os_task_create_impl(); }',
    'Middlewares/os_adapter/FreeRTOS/src/os_impl_task.c': 'int os_task_create_impl(void) { return xTaskCreate(0, 0, 0, 0, 0, 0); }'
  }, (root) => {
    const result = validateArchitectureContract({ root });

    expect(result).toEqual({
      root: path.resolve(root),
      summary: { files: 8, errors: 0, warnings: 0 },
      errors: [],
      warnings: [],
      findings: []
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
      'int sensor_port_init(void) { return HAL_I2C_Init(0); }',
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
      'BSP_PORT_VENDOR_CALL',
      'BSP_PORT_SOFT_I2C_PRIMITIVE',
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
      expect.objectContaining({ ruleId: 'BSP_PORT_VENDOR_CALL' })
    ]);
  }));

  test('treats a null layout as the default layout', () => withFixture({
    'Bsp/Port/sensor_port.c': 'int init(void) { return HAL_I2C_Init(0); }'
  }, (root) => {
    const result = validateArchitectureContract({ root, layout: null });
    expect(result.errors).toEqual([
      expect.objectContaining({ ruleId: 'BSP_PORT_VENDOR_CALL' })
    ]);
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
