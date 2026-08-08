/**
 * 能力校验器 —— 规划期静态校验(ADR H02:不兼容在规划期失败,不拖到运行期)。
 * 类型同步源:../contracts/engine-contract.ts / target-contract.ts。
 * 覆盖:引擎能力声明合法性、引擎 × 需求(量化方案/算子/目标)匹配、目标 × 指标匹配。
 */

/**
 * 校验引擎能力声明本身是否合法。
 * @param {import('../contracts/engine-contract').EngineCapabilities} caps
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validateEngineCapabilities(caps) {
  const errors = [];
  if (caps === null || typeof caps !== 'object') {
    return { ok: false, errors: ['engine capabilities must be an object'] };
  }
  if (typeof caps.id !== 'string' || caps.id.length === 0) errors.push('invalid id');
  if (typeof caps.version !== 'string' || caps.version.length === 0) errors.push('invalid version');
  for (const field of ['inputFormats', 'outputFormats', 'quantSchemes', 'ops', 'compatibleTargets']) {
    const value = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (caps))[field];
    if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
      errors.push(`invalid ${field}: must be string[]`);
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * 引擎 × 需求匹配:量化方案、算子集合、兼容目标全部满足才算通过。
 * @param {import('../contracts/engine-contract').EngineCapabilities} engine
 * @param {{ quantScheme?: string, ops?: string[], targetId?: string }} requirement
 * @returns {{ ok: boolean, missing: string[] }}
 */
function engineSupports(engine, requirement) {
  const missing = [];
  if (requirement.quantScheme !== undefined && !engine.quantSchemes.includes(requirement.quantScheme)) {
    missing.push(`quantScheme ${requirement.quantScheme}`);
  }
  for (const op of requirement.ops || []) {
    if (!engine.ops.includes(op)) missing.push(`op ${op}`);
  }
  if (requirement.targetId !== undefined && !engine.compatibleTargets.includes(requirement.targetId)) {
    missing.push(`target ${requirement.targetId}`);
  }
  return { ok: missing.length === 0, missing };
}

/**
 * 目标 × 需求匹配:所需指标必须可测量。
 * @param {import('../contracts/target-contract').TargetCapabilities} target
 * @param {{ metrics?: string[] }} requirement
 * @returns {{ ok: boolean, missing: string[] }}
 */
function targetSupports(target, requirement) {
  const missing = [];
  for (const metric of requirement.metrics || []) {
    if (!target.measurable.includes(metric)) missing.push(`metric ${metric}`);
  }
  return { ok: missing.length === 0, missing };
}

module.exports = {
  validateEngineCapabilities,
  engineSupports,
  targetSupports
};
