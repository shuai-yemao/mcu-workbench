'use strict';

const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const SCHEMA_VERSION = '1.0.0';
const RESOURCE_KINDS = new Set(['skill', 'agent', 'rule', 'hook', 'mcp', 'evidence']);

function result(errors = []) {
  return { valid: errors.length === 0, errors };
}

function requiredObject(value, name) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? []
    : [`${name} must be an object`];
}

function requiredString(value, name, pattern = null) {
  const errors = typeof value === 'string' && value.length > 0 ? [] : [`${name} must be a non-empty string`];
  if (errors.length === 0 && pattern && !pattern.test(value)) errors.push(`${name} has an invalid format`);
  return errors;
}

function stringArray(value, name, pattern = null) {
  if (!Array.isArray(value)) return [`${name} must be an array`];
  const errors = [];
  value.forEach((item, index) => {
    errors.push(...requiredString(item, `${name}[${index}]`, pattern));
  });
  if (new Set(value).size !== value.length) errors.push(`${name} must not contain duplicates`);
  return errors;
}

function validateSemver(version, name = 'version') {
  return result(requiredString(version, name, SEMVER_RE));
}

function validateCapability(value) {
  const errors = [
    ...requiredObject(value, 'capability')
  ];
  if (errors.length) return result(errors);
  errors.push(...requiredString(value.id, 'capability.id', ID_RE));
  errors.push(...requiredString(value.ownerPlugin, 'capability.ownerPlugin', ID_RE));
  errors.push(...requiredString(value.version, 'capability.version', SEMVER_RE));
  errors.push(...stringArray(value.permissions || [], 'capability.permissions', ID_RE));
  return result(errors);
}

function validateDescriptor(value) {
  const errors = [...requiredObject(value, 'descriptor')];
  if (errors.length) return result(errors);
  errors.push(...requiredString(value.id, 'descriptor.id', ID_RE));
  errors.push(...requiredString(value.version, 'descriptor.version', SEMVER_RE));
  if (!Array.isArray(value.capabilities)) errors.push('descriptor.capabilities must be an array');
  else {
    const ids = [];
    value.capabilities.forEach((capability, index) => {
      const checked = validateCapability(capability);
      checked.errors.forEach((error) => errors.push(`descriptor.capabilities[${index}]: ${error}`));
      if (capability && capability.id) ids.push(capability.id);
    });
    if (new Set(ids).size !== ids.length) errors.push('descriptor.capabilities must not contain duplicate ids');
  }
  errors.push(...stringArray(value.dependencies || [], 'descriptor.dependencies', ID_RE));
  if (!value.lifecycle || typeof value.lifecycle !== 'object' || Array.isArray(value.lifecycle)) {
    errors.push('descriptor.lifecycle must be an object');
  } else {
    errors.push(...requiredString(value.lifecycle.load, 'descriptor.lifecycle.load', ID_RE));
    errors.push(...requiredString(value.lifecycle.dispose, 'descriptor.lifecycle.dispose', ID_RE));
  }
  return result(errors);
}

function validateSpecFrontmatter(value) {
  const errors = [...requiredObject(value, 'specFrontmatter')];
  if (errors.length) return result(errors);
  errors.push(...requiredString(value.requestId, 'specFrontmatter.requestId', /^[A-Z0-9][A-Z0-9-]+$/));
  errors.push(...requiredString(value.version, 'specFrontmatter.version', SEMVER_RE));
  errors.push(...stringArray(value.requiredCapabilities || [], 'specFrontmatter.requiredCapabilities', ID_RE));
  errors.push(...stringArray(value.optionalCapabilities || [], 'specFrontmatter.optionalCapabilities', ID_RE));
  const required = new Set(value.requiredCapabilities || []);
  (value.optionalCapabilities || []).forEach((id) => {
    if (required.has(id)) errors.push(`capability ${id} cannot be both required and optional`);
  });
  return result(errors);
}

function validateResource(value) {
  const errors = [...requiredObject(value, 'resource')];
  if (errors.length) return result(errors);
  errors.push(...requiredString(value.id, 'resource.id', ID_RE));
  errors.push(...requiredString(value.kind, 'resource.kind'));
  if (!RESOURCE_KINDS.has(value.kind)) errors.push(`resource.kind must be one of ${[...RESOURCE_KINDS].join(', ')}`);
  errors.push(...requiredString(value.version, 'resource.version', SEMVER_RE));
  errors.push(...requiredString(value.ownerPlugin, 'resource.ownerPlugin', ID_RE));
  errors.push(...stringArray(value.evidence || [], 'resource.evidence'));
  return result(errors);
}

function assertValid(value, validator, label) {
  const checked = validator(value);
  if (!checked.valid) throw new TypeError(`${label} is invalid: ${checked.errors.join('; ')}`);
  return value;
}

module.exports = {
  ID_RE,
  RESOURCE_KINDS,
  SCHEMA_VERSION,
  assertValid,
  validateCapability,
  validateDescriptor,
  validateResource,
  validateSemver,
  validateSpecFrontmatter
};
