/**
 * Artifact 校验器 —— 产物契约的运行时镜像。
 * 类型同步源:../contracts/artifact-schema.ts(tsconfig checkJs 绑定,漂移即 tsc 报错)。
 * 覆盖:meta 字段校验、checksum 校验(门禁第 1/2 层)、schemaVersion 兼容判定。
 */

const crypto = require('crypto');

/** @type {string[]} 合法产物类型 —— 与 artifact-schema.ts 的 ArtifactKind 同步 */
const ARTIFACT_KINDS = [
  'dataset',
  'model',
  'converted-model',
  'quantized-model',
  'generated-code',
  'runtime-bundle',
  'eval-report'
];

/** @type {string[]} 合法阶段 id —— 与 artifact-schema.ts 的 StageId 同步 */
const STAGE_IDS = ['collect', 'train', 'quantize', 'integrate', 'eval'];

/** 语义化版本号:主.次 */
const SCHEMA_VERSION_RE = /^\d+\.\d+$/;

/** 内容寻址 id:sha256 前缀 12-64 位十六进制 */
const ID_RE = /^[0-9a-f]{12,64}$/;

/** 完整 sha256:64 位十六进制 */
const CHECKSUM_RE = /^[0-9a-f]{64}$/;

/**
 * 校验 ArtifactMeta 字段(门禁第 1 层:schema 校验)。
 * @param {unknown} meta
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validateArtifactMeta(meta) {
  const errors = [];
  if (meta === null || typeof meta !== 'object' || Array.isArray(meta)) {
    return { ok: false, errors: ['meta must be a plain object'] };
  }
  const m = /** @type {Record<string, unknown>} */ (meta);

  if (!ARTIFACT_KINDS.includes(String(m.kind))) {
    errors.push(`invalid kind: ${String(m.kind)}`);
  }
  if (typeof m.schemaVersion !== 'string' || !SCHEMA_VERSION_RE.test(m.schemaVersion)) {
    errors.push(`invalid schemaVersion: ${String(m.schemaVersion)}`);
  }
  if (typeof m.id !== 'string' || !ID_RE.test(m.id)) {
    errors.push(`invalid id: ${String(m.id)}`);
  }
  if (typeof m.checksum !== 'string' || !CHECKSUM_RE.test(m.checksum)) {
    errors.push(`invalid checksum: ${String(m.checksum)}`);
  }
  if (typeof m.size !== 'number' || !Number.isInteger(m.size) || m.size < 0) {
    errors.push(`invalid size: ${String(m.size)}`);
  }
  if (!Array.isArray(m.lineage) || m.lineage.some((l) => typeof l !== 'string')) {
    errors.push('invalid lineage: must be string[]');
  }
  const producer = m.producer;
  if (producer === null || typeof producer !== 'object' || Array.isArray(producer)) {
    errors.push('invalid producer: must be an object');
  } else {
    const p = /** @type {Record<string, unknown>} */ (producer);
    if (!STAGE_IDS.includes(String(p.stage))) {
      errors.push(`invalid producer.stage: ${String(p.stage)}`);
    }
    if (typeof p.runId !== 'string' || p.runId.length === 0) {
      errors.push('invalid producer.runId: must be a non-empty string');
    }
  }
  if (typeof m.createdAt !== 'string' || Number.isNaN(Date.parse(m.createdAt))) {
    errors.push(`invalid createdAt: ${String(m.createdAt)}`);
  }
  return { ok: errors.length === 0, errors };
}

/**
 * 计算内容 sha256(与 meta.checksum 同规格)。
 * @param {string | Buffer} content
 * @returns {string}
 */
function computeChecksum(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * checksum 校验(门禁第 2 层:防篡改)。
 * @param {{ checksum: string }} meta
 * @param {string | Buffer} content
 * @returns {boolean}
 */
function verifyChecksum(meta, content) {
  return meta.checksum === computeChecksum(content);
}

/**
 * schemaVersion 兼容判定:主版本必须相同,次版本 target <= actual 视为兼容。
 * @param {string} actual 产物自带版本,如 "1.2"
 * @param {string} required 消费者要求版本,如 "1.0"
 * @returns {boolean}
 */
function isSchemaCompatible(actual, required) {
  if (!SCHEMA_VERSION_RE.test(actual) || !SCHEMA_VERSION_RE.test(required)) return false;
  const [aMajor, aMinor] = actual.split('.').map(Number);
  const [rMajor, rMinor] = required.split('.').map(Number);
  return aMajor === rMajor && aMinor >= rMinor;
}

module.exports = {
  ARTIFACT_KINDS,
  STAGE_IDS,
  validateArtifactMeta,
  computeChecksum,
  verifyChecksum,
  isSchemaCompatible
};
