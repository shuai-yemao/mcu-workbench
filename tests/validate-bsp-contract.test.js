const path = require('path');

const FIXTURE_ROOT = path.join(__dirname, 'bsp-fixtures');

describe('validateBspContract', () => {
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
