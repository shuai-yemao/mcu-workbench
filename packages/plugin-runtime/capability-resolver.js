'use strict';

const { validateCapability, validateSpecFrontmatter } = require('../contracts');

class CapabilityResolverError extends Error {
  constructor(message, code = 'CAPABILITY_RESOLVER_ERROR') {
    super(message);
    this.name = 'CapabilityResolverError';
    this.code = code;
  }
}

function parseRequested(value) {
  const match = /^([^@]+)(?:@(.+))?$/.exec(value);
  if (!match) throw new CapabilityResolverError(`invalid capability request: ${value}`, 'INVALID_REQUEST');
  return { id: match[1], version: match[2] || null };
}

class CapabilityResolver {
  constructor(capabilities = []) {
    this.capabilities = new Map();
    for (const capability of capabilities) this.add(capability);
  }

  add(capability) {
    const checked = validateCapability(capability);
    if (!checked.valid) throw new CapabilityResolverError(`invalid capability: ${checked.errors.join('; ')}`, 'INVALID_CAPABILITY');
    const existing = this.capabilities.get(capability.id);
    if (existing && existing.ownerPlugin !== capability.ownerPlugin) {
      throw new CapabilityResolverError(`duplicate capability owner: ${capability.id}`, 'DUPLICATE_CAPABILITY_OWNER');
    }
    this.capabilities.set(capability.id, capability);
    return capability;
  }

  resolve(specFrontmatter, context = {}) {
    const specChecked = validateSpecFrontmatter(specFrontmatter);
    if (!specChecked.valid) {
      return { ok: false, errors: specChecked.errors.map((message) => ({ code: 'INVALID_SPEC', message })), warnings: [], plugins: [], capabilities: [] };
    }
    const permissions = new Set(Array.isArray(context.permissions) ? context.permissions : []);
    const errors = [];
    const warnings = [];
    const selected = [];
    const plugins = [];

    const select = (requested, required) => {
      const parsed = parseRequested(requested);
      const capability = this.capabilities.get(parsed.id);
      if (!capability) {
        const item = { code: required ? 'REQUIRED_CAPABILITY_MISSING' : 'OPTIONAL_CAPABILITY_MISSING', capability: parsed.id };
        (required ? errors : warnings).push(item);
        return;
      }
      if (parsed.version && capability.version !== parsed.version) {
        errors.push({ code: 'CAPABILITY_VERSION_INCOMPATIBLE', capability: parsed.id, requested: parsed.version, actual: capability.version });
        return;
      }
      const missingPermissions = capability.permissions.filter((permission) => !permissions.has(permission));
      if (missingPermissions.length) {
        errors.push({ code: 'CAPABILITY_PERMISSION_DENIED', capability: parsed.id, missingPermissions });
        return;
      }
      selected.push(capability);
      if (!plugins.includes(capability.ownerPlugin)) plugins.push(capability.ownerPlugin);
    };

    specFrontmatter.requiredCapabilities.forEach((capability) => select(capability, true));
    specFrontmatter.optionalCapabilities.forEach((capability) => select(capability, false));
    return { ok: errors.length === 0, errors, warnings, plugins: errors.length ? [] : plugins, capabilities: errors.length ? [] : selected };
  }
}

module.exports = { CapabilityResolver, CapabilityResolverError };
