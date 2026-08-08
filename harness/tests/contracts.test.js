/**
 * 契约校验单测 —— 阶段 0 验收 A2。
 * 覆盖:①合法 artifact ②checksum 不符 ③schemaVersion 不兼容
 *       ④capabilities 不满足(量化方案/算子/目标)⑤合法/非法 pipeline。
 */

const {
  validateArtifactMeta,
  computeChecksum,
  verifyChecksum,
  isSchemaCompatible
} = require('../lib/validate/artifact-validator');
const {
  validateEngineCapabilities,
  engineSupports,
  targetSupports
} = require('../lib/validate/capability-validator');
const { validatePipeline } = require('../lib/validate/pipeline-validator');

/** 构造一份合法 ArtifactMeta(checksum 与 content 真实匹配) */
function makeValidMeta(overrides = {}) {
  const content = 'model-bytes-v1';
  const meta = {
    kind: 'quantized-model',
    schemaVersion: '1.0',
    id: 'a'.repeat(12),
    checksum: computeChecksum(content),
    size: Buffer.byteLength(content),
    lineage: ['b'.repeat(12)],
    producer: { stage: 'quantize', runId: 'run-001', engine: 'tflm' },
    createdAt: '2026-08-08T12:00:00.000Z'
  };
  return { meta: { ...meta, ...overrides }, content };
}

describe('artifact-validator', () => {
  test('① 合法 ArtifactMeta 通过', () => {
    const { meta } = makeValidMeta();
    const result = validateArtifactMeta(meta);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('① 缺失必需字段被拒绝', () => {
    const { meta } = makeValidMeta();
    const result = validateArtifactMeta({ ...meta, checksum: undefined });
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('checksum'));
  });

  test('① 未知 kind 被拒绝', () => {
    const { meta } = makeValidMeta({ kind: 'brain-dump' });
    const result = validateArtifactMeta(meta);
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('kind'));
  });

  test('② checksum 与内容不符被拒绝', () => {
    const { meta, content } = makeValidMeta();
    expect(verifyChecksum(meta, content)).toBe(true);
    expect(verifyChecksum(meta, 'tampered-bytes')).toBe(false);
  });

  test('③ schemaVersion 主版本不同视为不兼容', () => {
    expect(isSchemaCompatible('1.2', '1.0')).toBe(true);
    expect(isSchemaCompatible('1.0', '1.2')).toBe(false);
    expect(isSchemaCompatible('2.0', '1.0')).toBe(false);
    expect(isSchemaCompatible('bad', '1.0')).toBe(false);
  });
});

describe('capability-validator', () => {
  const engine = {
    id: 'tflm',
    version: '1.0',
    inputFormats: ['tflite'],
    outputFormats: ['c-array'],
    quantSchemes: ['int8'],
    ops: ['CONV_2D', 'DEPTHWISE_CONV_2D', 'FULLY_CONNECTED'],
    compatibleTargets: ['host', 'board']
  };

  test('① 合法引擎能力声明通过', () => {
    expect(validateEngineCapabilities(engine).ok).toBe(true);
  });

  test('④ 需求量化方案不被支持 → 拒绝', () => {
    const result = engineSupports(engine, { quantScheme: 'fp16' });
    expect(result.ok).toBe(false);
    expect(result.missing).toContain('quantScheme fp16');
  });

  test('④ 需求算子缺失 → 拒绝', () => {
    const result = engineSupports(engine, { ops: ['CONV_2D', 'TRANSPOSE'] });
    expect(result.ok).toBe(false);
    expect(result.missing).toContain('op TRANSPOSE');
  });

  test('④ 需求目标不兼容 → 拒绝', () => {
    const result = engineSupports(engine, { targetId: 'qemu-stm32f4' });
    expect(result.ok).toBe(false);
    expect(result.missing).toContain('target qemu-stm32f4');
  });

  test('④ 全部满足 → 通过', () => {
    const result = engineSupports(engine, {
      quantScheme: 'int8',
      ops: ['CONV_2D'],
      targetId: 'host'
    });
    expect(result.ok).toBe(true);
  });

  test('④ 目标缺少所需指标 → 拒绝', () => {
    const target = { id: 'host', kind: 'host', toolchains: ['gcc'], measurable: ['accuracy'] };
    expect(targetSupports(target, { metrics: ['power'] }).ok).toBe(false);
    expect(targetSupports(target, { metrics: ['accuracy'] }).ok).toBe(true);
  });
});

describe('pipeline-validator', () => {
  const validPipeline = {
    schemaVersion: '1.0',
    name: 'keyword-spotting-gr5526',
    project: './target',
    stages: [
      { id: 'collect', target: 'board-gr5526', config: { samples: 5000 } },
      { id: 'train', executor: 'local:python3 train.py' },
      { id: 'quantize', engine: 'tflm', scheme: 'int8' },
      { id: 'integrate', engine: 'tflm' },
      { id: 'eval', engine: 'tflm', target: 'host', metrics: ['accuracy', 'latency', 'ram'] }
    ],
    gates: { minAccuracy: 0.9, maxLatencyMs: 50 }
  };

  test('⑤ 合法 pipeline 通过', () => {
    const result = validatePipeline(validPipeline);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('⑤ schemaVersion 不合法 → 拒绝', () => {
    const result = validatePipeline({ ...validPipeline, schemaVersion: '0.9' });
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('schemaVersion'));
  });

  test('⑤ 空 stages → 拒绝', () => {
    const result = validatePipeline({ ...validPipeline, stages: [] });
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('stages'));
  });

  test('⑤ 未知 stage id → 拒绝', () => {
    const pipeline = { ...validPipeline, stages: [{ id: 'deploy' }] };
    const result = validatePipeline(pipeline);
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('unknown stage'));
  });

  test('⑤ 重复 stage id → 拒绝', () => {
    const pipeline = {
      ...validPipeline,
      stages: [{ id: 'train' }, { id: 'train' }]
    };
    const result = validatePipeline(pipeline);
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('duplicate'));
  });

  test('⑤ 未知 gate → 拒绝', () => {
    const result = validatePipeline({ ...validPipeline, gates: { maxTps: 100 } });
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('unknown gate'));
  });

  test('⑤ stage 未知字段 → 拒绝', () => {
    const pipeline = {
      ...validPipeline,
      stages: [{ id: 'train', executor: 'local:x', magic: true }]
    };
    const result = validatePipeline(pipeline);
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('unknown field'));
  });
});
