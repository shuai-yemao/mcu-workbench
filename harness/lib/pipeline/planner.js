/**
 * Planner —— 规划期静态校验(ADR H02:不兼容在规划期失败,不拖到运行期)。
 * 输入:已验证结构的 pipeline.json + registry
 * 输出:{ ok, errors, plan:{ stages: [{id, engineId, targetId, scheme, metrics, executor, config}] } }
 * 校验:引擎存在、目标存在、capabilities 满足(量化方案/兼容目标/可测指标)、stage 注册。
 */

const { engineSupports, targetSupports } = require('../validate/capability-validator');

/**
 * @param {{ pipeline: object, registry: object }} input
 * @returns {{ ok: boolean, errors: string[], plan?: { stages: object[] } }}
 */
function planPipeline({ pipeline, registry }) {
  const errors = [];
  const plan = { stages: [] };

  for (const stageSpec of pipeline.stages) {
    const entry = { id: stageSpec.id, config: stageSpec.config };
    const stageDef = registry.getStage(stageSpec.id);
    if (!stageDef) {
      errors.push(`stage not registered: ${stageSpec.id}`);
      continue;
    }

    if (stageSpec.engine !== undefined) {
      const engine = registry.getEngine(stageSpec.engine);
      if (!engine) {
        errors.push(`engine not found: ${stageSpec.engine}`);
      } else if (engine.available === false) {
        errors.push(`engine not available: ${stageSpec.engine}(需要 ${(engine.requires || []).join(' / ')})`);
      } else {
        entry.engineId = stageSpec.engine;
        entry.engineCaps = engine.capabilities();
        if (stageSpec.scheme !== undefined) {
          const r = engineSupports(entry.engineCaps, { quantScheme: stageSpec.scheme });
          if (!r.ok) errors.push(`stage ${stageSpec.id}: ${r.missing.join(', ')} not supported by ${stageSpec.engine}`);
          else entry.scheme = stageSpec.scheme;
        }
      }
    }

    if (stageSpec.target !== undefined) {
      const target = registry.getTarget(stageSpec.target);
      if (!target) {
        errors.push(`target not found: ${stageSpec.target}`);
      } else if (target.available === false) {
        errors.push(`target not available: ${stageSpec.target}(需要 ${(target.requires || []).join(' / ')})`);
      } else {
        entry.targetId = stageSpec.target;
        entry.targetCaps = target.capabilities();
        if (entry.engineCaps) {
          const r = engineSupports(entry.engineCaps, { targetId: stageSpec.target });
          if (!r.ok) errors.push(`stage ${stageSpec.id}: ${r.missing.join(', ')} not supported by engine`);
        }
        if (stageSpec.metrics !== undefined) {
          const m = targetSupports(entry.targetCaps, { metrics: stageSpec.metrics });
          if (!m.ok) errors.push(`stage ${stageSpec.id}: ${m.missing.join(', ')} not measurable by ${stageSpec.target}`);
          else entry.metrics = stageSpec.metrics;
        }
      }
    }

    if (stageSpec.executor !== undefined) entry.executor = stageSpec.executor;
    if (stageSpec.measurement !== undefined) entry.measurement = stageSpec.measurement;
    plan.stages.push(entry);
  }

  return { ok: errors.length === 0, errors, plan: errors.length === 0 ? plan : undefined };
}

module.exports = { planPipeline };
