'use strict';

const { validateDescriptor } = require('../../packages/contracts');
const descriptor = require('./descriptor.json');

function createObservabilityPlugin() {
  const checked = validateDescriptor(descriptor);
  if (!checked.valid) {
    throw new TypeError('observability descriptor is invalid: ' + checked.errors.join('; '));
  }
  let disposed = false;
  return {
    descriptor,
    sourceSkills: [
      'tools-debug',
      'tools-observability',
      'debug-gdb-openocd',
      'debug-jlink',
      'debug-platformio',
      'logic-analyzer',
      'rtos-debug',
      'serial-monitor',
      'serial-shell',
      'can-debug',
      'modbus-debug',
      'visa-debug'
    ],
    dispose() {
      disposed = true;
    },
    get disposed() {
      return disposed;
    }
  };
}

module.exports = {
  descriptor,
  createObservabilityPlugin
};
