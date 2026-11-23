const assert = require('assert');
const { createVerificationPlugin, createVerificationReport } = require('../plugins/verification');
const testFramework = typeof describe === 'function' ? { describe, test } : require('node:test');

testFramework.describe('verification pilot', () => {
  testFramework.test('wraps verification capabilities without copying existing skills', () => {
    const plugin = createVerificationPlugin();
    assert.equal(plugin.descriptor.id, 'mcu-workbench-verification');
    assert.deepEqual(plugin.descriptor.capabilities.map((capability) => capability.id), ['verification-run']);
    assert.equal(plugin.sourceSkills[0], 'tools-quality');
    assert.equal(plugin.sourceSkills[1], 'tools-verification');
  });

  testFramework.test('runs pass/fail fixtures and emits evidence-bearing reports', () => {
    const result = createVerificationPlugin().run([
      { name: 'valid-fixture', execute: () => ({ passed: true }) },
      { name: 'failure-injection', execute: () => { throw new Error('injected failure'); } }
    ], { cwd: 'C:/workspace', command: 'node verification-pilot', evidenceLevel: 'host' });
    assert.equal(result.passed, false);
    assert.equal(result.cases.length, 2);
    assert.equal(result.cases[1].error, 'injected failure');
    const report = createVerificationReport(result);
    assert.equal(report.json.evidence.cwd, 'C:/workspace');
    assert.match(report.junit, /failure-injection/);
    assert.match(report.markdown, /host/);
  });
});
