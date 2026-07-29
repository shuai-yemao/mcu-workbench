const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  compareExpectedSource,
  parseArgs,
  runArchitectureValidation
} = require('../scripts/validate-architecture');

describe('architecture validation CLI', () => {
  test('parses root, layout config, expected manifest, and JSON output', () => {
    expect(parseArgs([
      '--root', 'firmware',
      '--config', 'layout.json',
      '--expect', 'expected.json',
      '--json'
    ], 'C:\\workspace')).toEqual({
      root: path.resolve('C:\\workspace', 'firmware'),
      config: path.resolve('C:\\workspace', 'layout.json'),
      expect: path.resolve('C:\\workspace', 'expected.json'),
      json: true
    });
  });

  test('returns success only when reviewed findings match exactly', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'architecture-cli-'));
    try {
      const source = path.join(root, 'Bsp', 'Driver', 'sensor.c');
      fs.mkdirSync(path.dirname(source), { recursive: true });
      fs.writeFileSync(source, 'int read(void) { return HAL_I2C_Init(0); }\n');
      const expected = {
        findings: [{
          ruleId: 'BSP_VENDOR_CALL', severity: 'error', file: 'Bsp/Driver/sensor.c', line: 1
        }]
      };

      expect(runArchitectureValidation({ root, expected }).exitCode).toBe(0);
      expect(runArchitectureValidation({ root, expected: { findings: [] } }).exitCode).toBe(1);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('compares the pinned commit when the manifest declares one', () => {
    const expected = { source: { commit: 'ABCDEF' }, findings: [] };
    expect(compareExpectedSource(expected, 'abcdef')).toEqual({
      matches: true,
      expectedCommit: 'abcdef',
      actualCommit: 'abcdef'
    });
    expect(compareExpectedSource(expected, null)).toEqual({
      matches: false,
      expectedCommit: 'abcdef',
      actualCommit: null
    });
  });
});
