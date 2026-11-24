'use strict';

const { validateDescriptor } = require('../../packages/contracts');
const descriptor = require('./descriptor.json');

const sourceSkills = [
  'tools-build', 'tools-linker', 'tools-flash', 'tools-git', 'tools-release'
];

function createDevopsPlugin() {
  const checked = validateDescriptor(descriptor);
  if (!checked.valid) {
    throw new TypeError('DevOps descriptor is invalid: ' + checked.errors.join('; '));
  }
  return { descriptor, sourceSkills: [...sourceSkills] };
}

module.exports = { descriptor, createDevopsPlugin };
