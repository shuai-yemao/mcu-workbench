const assert = require('assert');
const { PluginRuntime, PluginRuntimeError } = require('../packages/plugin-runtime');
const testFramework = typeof describe === 'function' ? { describe, test } : require('node:test');

const descriptor = (id, dependencies = []) => ({
  id,
  version: '1.0.0',
  capabilities: [],
  dependencies,
  lifecycle: { load: 'load', dispose: 'dispose' }
});

function instance(events, extra = {}) {
  const { ops: extraOps = {}, ...extraFields } = extra;
  return {
    base: { id: 'base' },
    cfg: { mode: 'test' },
    ctx: { host: 'test' },
    data: {},
    ops: {
      load: () => events.push('load'),
      dispose: () => events.push('dispose'),
      ...extraOps
    },
    ...extraFields
  };
}

testFramework.describe('plugin runtime', () => {
  testFramework.test('registers four-tuple instances and rejects duplicates', () => {
    const runtime = new PluginRuntime();
    const events = [];
    const registered = runtime.register(descriptor('plugin-a'), instance(events));
    assert.equal(registered.id, 'plugin-a');
    assert.equal(runtime.registry.get('plugin-a').cfg.mode, 'test');
    assert.throws(() => runtime.register(descriptor('plugin-a'), instance(events)), PluginRuntimeError);
  });

  testFramework.test('checks dependencies and rolls back a failed load', () => {
    const runtime = new PluginRuntime();
    runtime.register(descriptor('base-plugin'), instance([]));
    assert.throws(() => runtime.register(descriptor('needs-plugin', ['missing-plugin']), instance([])), /dependency/);
    assert.throws(() => runtime.register(descriptor('bad-plugin'), instance([], { ops: { load: () => { throw new Error('load failed'); } } })), /load failed/);
    assert.equal(runtime.registry.has('bad-plugin'), false);
  });

  testFramework.test('disposes idempotently and resolves a loaded profile', () => {
    const runtime = new PluginRuntime();
    const events = [];
    runtime.register(descriptor('plugin-a'), instance(events));
    runtime.register(descriptor('plugin-b', ['plugin-a']), instance(events));
    assert.equal(runtime.resolveProfile({ plugins: ['plugin-a', 'plugin-b'] }).length, 2);
    runtime.dispose('plugin-b');
    runtime.dispose('plugin-b');
    assert.deepEqual(events, ['load', 'load', 'dispose']);
  });

  testFramework.test('forwards bridge evidence without business logic', () => {
    const runtime = new PluginRuntime();
    const result = runtime.bridge.forward('plugin-a', 'test.event', { value: 1 }, { source: 'fixture', command: 'host-test' });
    assert.deepEqual(result, {
      pluginId: 'plugin-a',
      event: 'test.event',
      payload: { value: 1 },
      evidence: { source: 'fixture', command: 'host-test' }
    });
  });
});
