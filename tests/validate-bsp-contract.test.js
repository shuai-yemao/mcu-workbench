const path = require('path');

const FIXTURE_ROOT = path.join(__dirname, 'bsp-fixtures');

describe('validateBspContract', () => {
  test('accepts an instance-only Driver that exposes only its constructor', () => {
    const { validateBspContract } = require('../scripts/validate-bsp-contract');

    const result = validateBspContract({
      driverHeader: path.join(FIXTURE_ROOT, 'aht21', 'good', 'bsp_aht21_driver.h'),
      driverSource: path.join(FIXTURE_ROOT, 'aht21', 'good', 'bsp_aht21_driver.c'),
      apiPolicy: 'instance_only'
    });

    expect(result.errors).toEqual([]);
  });

  test('rejects an instance-only Driver that exports a module-level read function', () => {
    const { validateBspContract } = require('../scripts/validate-bsp-contract');

    const result = validateBspContract({
      driverHeader: path.join(FIXTURE_ROOT, 'aht21', 'bad-extra-export', 'bsp_aht21_driver.h'),
      driverSource: path.join(FIXTURE_ROOT, 'aht21', 'bad-extra-export', 'bsp_aht21_driver.c'),
      apiPolicy: 'instance_only'
    });

    expect(result.errors).toEqual([expect.stringContaining('forbidden functions')]);
  });

  test('rejects a Driver that bypasses injected interfaces or omits its instance contract', () => {
    const { validateBspContract } = require('../scripts/validate-bsp-contract');
    const result = validateBspContract({
      driverHeader: path.join(FIXTURE_ROOT, 'w25qxx', 'bad-hal-and-state', 'bsp_w25qxx_driver.h'),
      driverSource: path.join(FIXTURE_ROOT, 'w25qxx', 'bad-hal-and-state', 'bsp_w25qxx_driver.c'),
      apiPolicy: 'instance_only'
    });

    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('must not include HAL'),
      expect.stringContaining('is_inited'),
      expect.stringContaining('pf_*')
    ]));
  });

  test('enforces Handler Ops registration and ISR deferral boundaries', () => {
    const { validateBspContract } = require('../scripts/validate-bsp-contract');
    const result = validateBspContract({
      handlerHeader: path.join(FIXTURE_ROOT, 'mpu6050', 'bad-handler-boundary', 'bsp_imu_handle.h'),
      handlerSource: path.join(FIXTURE_ROOT, 'mpu6050', 'bad-handler-boundary', 'bsp_imu_handle.c'),
      apiPolicy: 'instance_only'
    });

    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('handler_driver_ops_t'),
      expect.stringContaining('must not include a concrete Driver'),
      expect.stringContaining('FromISR')
    ]));
  });

  test('enforces Port composition and keeps Wrapper independent from implementation layers', () => {
    const { validateBspContract } = require('../scripts/validate-bsp-contract');
    const result = validateBspContract({
      portSource: path.join(FIXTURE_ROOT, 'st7789', 'bad-adapter-boundary', 'bsp_display_port.c'),
      wrapperSource: path.join(FIXTURE_ROOT, 'st7789', 'bad-adapter-boundary', 'bsp_display_wrapper.c'),
      apiPolicy: 'instance_only'
    });

    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('Port must construct the Driver'),
      expect.stringContaining('Port must construct the Handle'),
      expect.stringContaining('Port must register Driver Ops'),
      expect.stringContaining('Wrapper must not include Driver, Handle, HAL, or RTOS headers')
    ]));
  });

  test('parses the documented command-line file arguments', () => {
    const { parseArgs } = require('../scripts/validate-bsp-contract');
    expect(parseArgs([
      '--driver-header', 'driver.h', '--driver-source', 'driver.c',
      '--handler-header', 'handle.h', '--handler-source', 'handle.c',
      '--port-source', 'port.c', '--wrapper-source', 'wrapper.c',
      '--api-policy', 'instance_only'
    ])).toMatchObject({ apiPolicy: 'instance_only', driverHeader: expect.stringContaining('driver.h') });
  });

  test('reports a missing four-level acceptance record when requested', () => {
    const { validateBspContract } = require('../scripts/validate-bsp-contract');
    expect(validateBspContract({ acceptancePath: path.join(FIXTURE_ROOT, 'st7789', 'missing-acceptance.md') }).errors)
      .toEqual([expect.stringContaining('Acceptance record not found')]);
  });
});
