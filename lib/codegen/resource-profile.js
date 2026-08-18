const RESOURCE_KINDS = Object.freeze(['gpio', 'bus', 'dma', 'irq', 'osal', 'clock', 'memory', 'power']);

function createResourceProfile(resources = []) {
  const values = Array.isArray(resources) ? resources : [resources];
  const normalized = values.map((resource) => {
    if (!resource || typeof resource !== 'object') throw new Error('Resource profile entries must be objects.');
    const kind = String(resource.kind || '').trim().toLowerCase();
    if (!RESOURCE_KINDS.includes(kind)) throw new Error(`Unsupported resource kind: ${resource.kind}`);
    return {
      kind,
      name: String(resource.name || '').trim(),
      owner: resource.owner || 'unresolved',
      context: resource.context || null,
      verified: resource.verified === true
    };
  });
  return {
    schemaVersion: 'resource-profile-v1',
    resources: normalized,
    unresolved: normalized.filter((resource) => !resource.verified).map((resource) =>
      `UNRESOLVED_RESOURCE: ${resource.kind}/${resource.name || '<unnamed>'}`)
  };
}

module.exports = { RESOURCE_KINDS, createResourceProfile };
