'use strict';

const { validateDescriptor } = require('../contracts');

class PluginRuntimeError extends Error {
  constructor(message, code = 'PLUGIN_RUNTIME_ERROR') {
    super(message);
    this.name = 'PluginRuntimeError';
    this.code = code;
  }
}

function parseDependency(value) {
  const match = /^([^@]+)(?:@(.+))?$/.exec(value);
  if (!match) throw new PluginRuntimeError(`invalid dependency: ${value}`, 'INVALID_DEPENDENCY');
  return { id: match[1], version: match[2] || null };
}

function requireTuple(instance) {
  if (!instance || typeof instance !== 'object') throw new PluginRuntimeError('plugin instance must be an object', 'INVALID_INSTANCE');
  for (const field of ['base', 'cfg', 'ctx', 'data', 'ops']) {
    if (!(field in instance)) throw new PluginRuntimeError(`plugin instance missing ${field}`, 'INVALID_INSTANCE');
  }
  if (!instance.ops || typeof instance.ops.load !== 'function' || typeof instance.ops.dispose !== 'function') {
    throw new PluginRuntimeError('plugin instance ops.load and ops.dispose are required', 'INVALID_INSTANCE');
  }
  return instance;
}

class PluginRegistry {
  constructor() {
    this.entries = new Map();
  }

  has(id) {
    return this.entries.has(id);
  }

  get(id) {
    return this.entries.get(id)?.instance;
  }

  register(descriptor, instance) {
    const checked = validateDescriptor(descriptor);
    if (!checked.valid) throw new PluginRuntimeError(`invalid descriptor: ${checked.errors.join('; ')}`, 'INVALID_DESCRIPTOR');
    if (this.has(descriptor.id)) throw new PluginRuntimeError(`plugin already registered: ${descriptor.id}`, 'DUPLICATE_PLUGIN');
    requireTuple(instance);

    const dependencies = descriptor.dependencies.map(parseDependency);
    for (const dependency of dependencies) {
      const loaded = this.entries.get(dependency.id);
      if (!loaded) throw new PluginRuntimeError(`missing dependency: ${dependency.id}`, 'MISSING_DEPENDENCY');
      if (dependency.version && loaded.descriptor.version !== dependency.version) {
        throw new PluginRuntimeError(`dependency version conflict: ${dependency.id}@${dependency.version}`, 'DEPENDENCY_VERSION_CONFLICT');
      }
    }

    const entry = { descriptor, instance, disposed: false };
    this.entries.set(descriptor.id, entry);
    try {
      instance.ops.load(instance);
    } catch (error) {
      this.entries.delete(descriptor.id);
      throw error;
    }
    return { id: descriptor.id, version: descriptor.version };
  }

  dispose(id) {
    const entry = this.entries.get(id);
    if (!entry || entry.disposed) return { id, disposed: false, idempotent: true };
    entry.instance.ops.dispose(entry.instance);
    entry.disposed = true;
    this.entries.delete(id);
    return { id, disposed: true, idempotent: false };
  }
}

class BridgeCore {
  forward(pluginId, event, payload, evidence = {}) {
    if (typeof pluginId !== 'string' || typeof event !== 'string') {
      throw new PluginRuntimeError('bridge pluginId and event are required', 'INVALID_BRIDGE_EVENT');
    }
    return { pluginId, event, payload, evidence };
  }
}

class PluginRuntime {
  constructor() {
    this.registry = new PluginRegistry();
    this.bridge = new BridgeCore();
  }

  register(descriptor, instance) {
    return this.registry.register(descriptor, instance);
  }

  dispose(id) {
    return this.registry.dispose(id);
  }

  resolveProfile(profile) {
    if (!profile || !Array.isArray(profile.plugins)) throw new PluginRuntimeError('profile.plugins must be an array', 'INVALID_PROFILE');
    const resolved = [];
    for (const id of profile.plugins) {
      if (!this.registry.has(id)) throw new PluginRuntimeError(`profile plugin is not loaded: ${id}`, 'PROFILE_PLUGIN_MISSING');
      resolved.push({ id, instance: this.registry.get(id) });
    }
    return resolved;
  }
}

module.exports = { BridgeCore, PluginRegistry, PluginRuntime, PluginRuntimeError };
