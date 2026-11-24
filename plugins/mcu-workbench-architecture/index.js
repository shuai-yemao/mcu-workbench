'use strict';

const { validateDescriptor } = require('../../packages/contracts');
const descriptor = require('./descriptor.json');

function createArchitecturePlugin() {
  const checked = validateDescriptor(descriptor);
  if (!checked.valid) {
    throw new TypeError('Architecture descriptor is invalid: ' + checked.errors.join('; '));
  }
  let disposed = false;
  return {
    descriptor,
    dispose() { disposed = true; },
    get disposed() { return disposed; }
  };
}

module.exports = { descriptor, createArchitecturePlugin };
