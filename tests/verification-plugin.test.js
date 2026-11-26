'use strict';

const { descriptor, createVerificationPlugin } = require('../plugins/mcu-workbench-verification');
const { validateDescriptor } = require('../packages/contracts');

describe('verification plugin package', () => {
  test('exposes a valid verification descriptor', () => {
    expect(descriptor.id).toBe('mcu-workbench-verification');
    expect(validateDescriptor(descriptor).valid).toBe(true);
  });

  test('declares canonical and assigned external Skills', () => {
    expect(createVerificationPlugin().sourceSkills).toEqual([
      'tools-quality',
      'tools-verification',
      'embedded-unit-test-generator',
      'static-analysis',
      'embedded-bug-hunter',
      'memory-analysis'
    ]);
  });

  test('supports idempotent disposal', () => {
    const plugin = createVerificationPlugin();
    expect(plugin.disposed).toBe(false);
    plugin.dispose();
    plugin.dispose();
    expect(plugin.disposed).toBe(true);
  });
});
