const assert = require('assert');
const { CapabilityResolver } = require('../packages/plugin-runtime/capability-resolver');
const testFramework = typeof describe === 'function' ? { describe, test } : require('node:test');

const capabilities = [
  { id: 'workflow-route', ownerPlugin: 'mcu-workbench-workflow', version: '1.0.0', permissions: ['read-spec'] },
  { id: 'verification-run', ownerPlugin: 'mcu-workbench-verification', version: '1.0.0', permissions: ['run-test'] }
];

testFramework.describe('capability resolver', () => {
  testFramework.test('resolves a valid profile and optional absence as warning', () => {
    const resolver = new CapabilityResolver(capabilities);
    const result = resolver.resolve({
      requestId: 'REQ-PLUGIN-SPLIT-20261123', version: '1.0.0',
      requiredCapabilities: ['workflow-route'], optionalCapabilities: ['missing-capability']
    }, { permissions: ['read-spec'] });
    assert.equal(result.ok, true);
    assert.deepEqual(result.plugins, ['mcu-workbench-workflow']);
    assert.equal(result.warnings[0].code, 'OPTIONAL_CAPABILITY_MISSING');
  });

  testFramework.test('fails closed for required missing, version mismatch and permission denial', () => {
    const resolver = new CapabilityResolver(capabilities);
    assert.equal(resolver.resolve({ requestId: 'REQ-X', version: '1.0.0', requiredCapabilities: ['missing'], optionalCapabilities: [] }, { permissions: [] }).ok, false);
    assert.equal(resolver.resolve({ requestId: 'REQ-X', version: '1.0.0', requiredCapabilities: ['workflow-route@2.0.0'], optionalCapabilities: [] }, { permissions: ['read-spec'] }).ok, false);
    assert.equal(resolver.resolve({ requestId: 'REQ-X', version: '1.0.0', requiredCapabilities: ['workflow-route'], optionalCapabilities: [] }, { permissions: [] }).ok, false);
  });

  testFramework.test('rejects duplicate capability ownership at construction', () => {
    assert.throws(() => new CapabilityResolver([
      capabilities[0],
      { ...capabilities[0], ownerPlugin: 'other-plugin' }
    ]), /duplicate capability owner/);
  });
});
