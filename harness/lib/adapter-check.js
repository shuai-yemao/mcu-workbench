/**
 * AdapterCheck —— 适配器结构级校验(D5-2)。
 * 校验范围(与契约 contracts/engine-contract.ts / target-contract.ts 对齐):
 *   - id / requires 声明
 *   - capabilities 字段合法性(数组字段、version、kind)
 *   - 必需方法签名存在
 * 不做运行时深度校验(契约类型已由 tsc/checkJs 兜底)。
 */

const ENGINE_METHODS = ['convert', 'quantize', 'generateCode', 'run'];
const TARGET_METHODS = ['build', 'flash', 'exec', 'measure'];
const ENGINE_ARRAY_FIELDS = ['inputFormats', 'outputFormats', 'quantSchemes', 'ops', 'compatibleTargets'];
const TARGET_ARRAY_FIELDS = ['toolchains', 'measurable'];

/** 校验数组字段为 string[] */
function checkStringArray(value, field, errors) {
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    errors.push(`${field}: must be string[]`);
  }
}

/**
 * 校验引擎适配器。
 * @param {unknown} adapter
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validateEngineAdapter(adapter) {
  const errors = [];
  if (adapter === null || typeof adapter !== 'object') {
    return { ok: false, errors: ['adapter must be an object'] };
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);

  if (typeof a.id !== 'string' || a.id.length === 0) errors.push('invalid id: must be a non-empty string');
  if (a.requires !== undefined && (!Array.isArray(a.requires) || a.requires.some((r) => typeof r !== 'string'))) {
    errors.push('invalid requires: must be string[]');
  }

  const caps = typeof a.capabilities === 'function' ? a.capabilities() : undefined;
  if (caps === null || typeof caps !== 'object') {
    errors.push('capabilities() must return an object');
  } else {
    const c = /** @type {Record<string, unknown>} */ (caps);
    if (typeof c.version !== 'string' || c.version.length === 0) errors.push('capabilities.version: must be a non-empty string');
    for (const field of ENGINE_ARRAY_FIELDS) checkStringArray(c[field], `capabilities.${field}`, errors);
  }

  for (const method of ENGINE_METHODS) {
    if (typeof a[method] !== 'function') errors.push(`missing method: ${method}()`);
  }
  return { ok: errors.length === 0, errors };
}

/**
 * 校验目标适配器。
 * @param {unknown} adapter
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validateTargetAdapter(adapter) {
  const errors = [];
  if (adapter === null || typeof adapter !== 'object') {
    return { ok: false, errors: ['adapter must be an object'] };
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);

  if (typeof a.id !== 'string' || a.id.length === 0) errors.push('invalid id: must be a non-empty string');
  if (a.requires !== undefined && (!Array.isArray(a.requires) || a.requires.some((r) => typeof r !== 'string'))) {
    errors.push('invalid requires: must be string[]');
  }

  const caps = typeof a.capabilities === 'function' ? a.capabilities() : undefined;
  if (caps === null || typeof caps !== 'object') {
    errors.push('capabilities() must return an object');
  } else {
    const c = /** @type {Record<string, unknown>} */ (caps);
    if (!['host', 'sim', 'board'].includes(String(c.kind))) errors.push(`capabilities.kind: invalid ${String(c.kind)}(host|sim|board)`);
    for (const field of TARGET_ARRAY_FIELDS) checkStringArray(c[field], `capabilities.${field}`, errors);
  }

  for (const method of TARGET_METHODS) {
    if (typeof a[method] !== 'function') errors.push(`missing method: ${method}()`);
  }
  return { ok: errors.length === 0, errors };
}

module.exports = { validateEngineAdapter, validateTargetAdapter, ENGINE_METHODS, TARGET_METHODS };
