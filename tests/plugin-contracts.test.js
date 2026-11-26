const {
  assertValid,
  validateCapability,
  validateDescriptor,
  validateResource,
  validateSpecFrontmatter
} = require('../packages/contracts');

const capability = {
  id: 'workflow-route',
  ownerPlugin: 'mcu-workbench-workflow',
  version: '1.0.0',
  permissions: ['read-spec']
};

describe('plugin contracts', () => {
  test('accepts a valid descriptor and capability', () => {
    expect(validateCapability(capability).valid).toBe(true);
    expect(validateDescriptor({
      id: 'mcu-workbench-workflow',
      version: '1.0.0',
      capabilities: [capability],
      dependencies: ['mcu-workbench-verification'],
      lifecycle: { load: 'load-workflow', dispose: 'dispose-workflow' }
    }).valid).toBe(true);
  });

  test('rejects missing fields, duplicate ids and incompatible versions', () => {
    expect(validateDescriptor({ id: 'Bad_ID', version: '1', capabilities: [], dependencies: [], lifecycle: {} }).valid).toBe(false);
    expect(validateCapability({ ...capability, id: 'workflow_route' }).valid).toBe(false);
    expect(validateDescriptor({
      id: 'mcu-workbench-workflow', version: '1.0.0', capabilities: [capability, capability],
      dependencies: [], lifecycle: { load: 'load-workflow', dispose: 'dispose-workflow' }
    }).valid).toBe(false);
  });

  test('rejects required/optional capability overlap', () => {
    expect(validateSpecFrontmatter({
      requestId: 'REQ-PLUGIN-SPLIT-20261123', version: '1.0.0',
      requiredCapabilities: ['workflow-route'], optionalCapabilities: ['workflow-route']
    }).valid).toBe(false);
  });

  test('accepts all declared resource kinds and requires evidence', () => {
    expect(validateResource({ id: 'workflow-route-skill', kind: 'skill', version: '1.0.0', ownerPlugin: 'mcu-workbench-workflow', evidence: ['skills/workflow'] }).valid).toBe(true);
    expect(validateResource({ id: 'workflow-route-skill', kind: 'unknown', version: '1.0.0', ownerPlugin: 'mcu-workbench-workflow', evidence: [] }).valid).toBe(false);
  });

  test('assertValid throws a deterministic error for invalid input', () => {
    expect(() => assertValid({}, validateCapability, 'capability')).toThrow(/capability is invalid/);
  });
});
