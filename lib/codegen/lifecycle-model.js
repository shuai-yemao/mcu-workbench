const LIFECYCLE_ACTIONS = Object.freeze(['init', 'start', 'process', 'stop', 'sleep', 'wakeup', 'deinit']);

function createLifecycleModel(actions = LIFECYCLE_ACTIONS) {
  const selected = [...new Set((Array.isArray(actions) ? actions : [actions])
    .map((action) => String(action).trim().toLowerCase()))];
  const unknown = selected.filter((action) => !LIFECYCLE_ACTIONS.includes(action));
  if (unknown.length) throw new Error(`Unsupported lifecycle actions: ${unknown.join(', ')}`);
  return {
    schemaVersion: 'lifecycle-model-v1',
    actions: selected,
    blocking: [],
    isrSafe: [],
    ownership: 'caller owns the object; Board/Manager owns registration'
  };
}

module.exports = { LIFECYCLE_ACTIONS, createLifecycleModel };
