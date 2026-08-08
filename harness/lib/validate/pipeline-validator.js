/**
 * Pipeline 校验器 —— pipeline.json 结构校验(阶段 0 只做结构,规划期语义校验归阶段 1 planner)。
 * 格式依据:docs/embedded-ai-harness-plan.md §6。
 * 合法值镜像:../contracts/artifact-schema.ts(StageId)。
 */

const { STAGE_IDS } = require('./artifact-validator');

/** 当前 pipeline schema 版本 */
const PIPELINE_SCHEMA_VERSION = '1.0';

/** @type {string[]} stage 条目允许出现的字段 */
const STAGE_FIELDS = ['id', 'engine', 'target', 'scheme', 'metrics', 'executor', 'config', 'measurement'];

/** @type {string[]} gates 字段值必须为非负数字 */
const GATE_NUMERIC_FIELDS = ['minAccuracy', 'maxLatencyMs', 'maxRamBytes', 'maxFlashBytes'];

/** @type {string[]} baseline 字段(第 4 层基线回归,D3-3) */
const BASELINE_FIELDS = ['enabled', 'maxAccuracyDrop', 'maxLatencyRise'];

/**
 * 校验 pipeline.json。
 * @param {unknown} pipeline
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validatePipeline(pipeline) {
  const errors = [];
  if (pipeline === null || typeof pipeline !== 'object' || Array.isArray(pipeline)) {
    return { ok: false, errors: ['pipeline must be a plain object'] };
  }
  const p = /** @type {Record<string, unknown>} */ (pipeline);

  if (p.schemaVersion !== PIPELINE_SCHEMA_VERSION) {
    errors.push(`unsupported schemaVersion: ${String(p.schemaVersion)} (expected ${PIPELINE_SCHEMA_VERSION})`);
  }
  if (typeof p.name !== 'string' || p.name.length === 0) {
    errors.push('invalid name: must be a non-empty string');
  }
  if (p.project !== undefined && (typeof p.project !== 'string' || p.project.length === 0)) {
    errors.push('invalid project: must be a non-empty string');
  }
  if (!Array.isArray(p.stages) || p.stages.length === 0) {
    errors.push('invalid stages: must be a non-empty array');
  } else {
    const seen = new Set();
    p.stages.forEach((stage, index) => {
      const prefix = `stages[${index}]`;
      if (stage === null || typeof stage !== 'object' || Array.isArray(stage)) {
        errors.push(`${prefix}: must be an object`);
        return;
      }
      const s = /** @type {Record<string, unknown>} */ (stage);
      if (!STAGE_IDS.includes(String(s.id))) {
        errors.push(`${prefix}.id: unknown stage ${String(s.id)}`);
      } else if (seen.has(s.id)) {
        errors.push(`${prefix}.id: duplicate stage ${String(s.id)}`);
      } else {
        seen.add(s.id);
      }
      for (const field of Object.keys(s)) {
        if (!STAGE_FIELDS.includes(field)) {
          errors.push(`${prefix}.${field}: unknown field`);
        }
      }
      if (s.engine !== undefined && (typeof s.engine !== 'string' || s.engine.length === 0)) {
        errors.push(`${prefix}.engine: must be a non-empty string`);
      }
      if (s.target !== undefined && (typeof s.target !== 'string' || s.target.length === 0)) {
        errors.push(`${prefix}.target: must be a non-empty string`);
      }
      if (s.scheme !== undefined && typeof s.scheme !== 'string') {
        errors.push(`${prefix}.scheme: must be a string`);
      }
      if (s.metrics !== undefined && (!Array.isArray(s.metrics) || s.metrics.some((v) => typeof v !== 'string'))) {
        errors.push(`${prefix}.metrics: must be string[]`);
      }
      if (s.executor !== undefined && typeof s.executor !== 'string') {
        errors.push(`${prefix}.executor: must be a string`);
      }
      if (s.measurement !== undefined && typeof s.measurement !== 'string') {
        errors.push(`${prefix}.measurement: must be a string (mock / local:<cmd>)`);
      }
      if (s.config !== undefined && (s.config === null || typeof s.config !== 'object' || Array.isArray(s.config))) {
        errors.push(`${prefix}.config: must be an object`);
      }
    });
  }
  if (p.gates !== undefined) {
    if (p.gates === null || typeof p.gates !== 'object' || Array.isArray(p.gates)) {
      errors.push('invalid gates: must be an object');
    } else {
      const g = /** @type {Record<string, unknown>} */ (p.gates);
      for (const key of Object.keys(g)) {
        if (!GATE_NUMERIC_FIELDS.includes(key)) {
          errors.push(`gates.${key}: unknown gate`);
        } else if (typeof g[key] !== 'number' || Number.isNaN(Number(g[key])) || Number(g[key]) < 0) {
          errors.push(`gates.${key}: must be a non-negative number`);
        }
      }
    }
  }
  if (p.baseline !== undefined) {
    if (p.baseline === null || typeof p.baseline !== 'object' || Array.isArray(p.baseline)) {
      errors.push('invalid baseline: must be an object');
    } else {
      const b = /** @type {Record<string, unknown>} */ (p.baseline);
      for (const key of Object.keys(b)) {
        if (!BASELINE_FIELDS.includes(key)) {
          errors.push(`baseline.${key}: unknown field`);
        } else if (key === 'enabled') {
          if (typeof b[key] !== 'boolean') errors.push('baseline.enabled: must be a boolean');
        } else if (typeof b[key] !== 'number' || Number.isNaN(Number(b[key])) || Number(b[key]) < 0) {
          errors.push(`baseline.${key}: must be a non-negative number`);
        }
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

module.exports = {
  PIPELINE_SCHEMA_VERSION,
  validatePipeline
};
