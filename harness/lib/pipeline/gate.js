/**
 * Gate —— 三层门禁判定(ADR H08)。
 *   1. schema 校验:ArtifactMeta 字段 + schemaVersion(复用 artifact-validator)
 *   2. checksum 校验:内容哈希与 meta 一致(防篡改)
 *   3. 声明式阈值:pipeline.json 的 gates(minAccuracy/maxLatencyMs/...)对 eval-report 数值判定
 *      + 可编程验证器(stage.validate,可选,阶段 1 最小实现暂不接入 stage 级 validate)
 */

const { validateArtifactMeta, verifyChecksum } = require('../validate/artifact-validator');

/**
 * 评估单个产物的门禁判定。
 * @param {{ artifactRef: { id: string, path?: string }, store: object, rules?: object | null }} input
 * @returns {{ pass: boolean, reasons: string[], evidence?: string }}
 */
function evaluateGate({ artifactRef, store, rules }) {
  const meta = store.readMeta(artifactRef);

  // 第 1 层:schema 校验
  const schema = validateArtifactMeta(meta);
  if (!schema.ok) {
    return { pass: false, reasons: schema.errors, evidence: 'schema' };
  }

  // 第 2 层:checksum 防篡改
  const content = store.readContent(artifactRef);
  if (!verifyChecksum(meta, content)) {
    return { pass: false, reasons: ['checksum mismatch'], evidence: 'checksum' };
  }

  // 第 3 层:声明式阈值(仅对 eval-report 生效)
  if (rules) {
    const threshold = checkRules(meta, content, rules);
    if (!threshold.pass) {
      return { pass: false, reasons: threshold.reasons, evidence: 'threshold' };
    }
  }

  return { pass: true, reasons: [], evidence: undefined };
}

/**
 * 阈值判定(仅 eval-report)。
 * @param {object} meta
 * @param {Buffer} content
 * @param {object} rules
 * @returns {{ pass: boolean, reasons: string[] }}
 */
function checkRules(meta, content, rules) {
  if (meta.kind !== 'eval-report') {
    return { pass: true, reasons: [] };
  }
  const report = JSON.parse(content.toString('utf8'));
  const reasons = [];
  if (rules.minAccuracy !== undefined && typeof report.accuracy === 'number' && report.accuracy < rules.minAccuracy) {
    reasons.push(`accuracy ${report.accuracy} < min ${rules.minAccuracy}`);
  }
  if (rules.maxLatencyMs !== undefined && typeof report.latencyMs === 'number' && report.latencyMs > rules.maxLatencyMs) {
    reasons.push(`latency ${report.latencyMs}ms > max ${rules.maxLatencyMs}ms`);
  }
  if (rules.maxRamBytes !== undefined && typeof report.ramBytes === 'number' && report.ramBytes > rules.maxRamBytes) {
    reasons.push(`ram ${report.ramBytes}B > max ${rules.maxRamBytes}B`);
  }
  if (rules.maxFlashBytes !== undefined && typeof report.flashBytes === 'number' && report.flashBytes > rules.maxFlashBytes) {
    reasons.push(`flash ${report.flashBytes}B > max ${rules.maxFlashBytes}B`);
  }
  return { pass: reasons.length === 0, reasons };
}

module.exports = { evaluateGate, checkRules };
