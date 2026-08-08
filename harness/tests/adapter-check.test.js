/**
 * 适配器校验单测:合法/非法引擎与目标;并用内置适配器验证校验器不过严。
 */

const { validateEngineAdapter, validateTargetAdapter } = require('../lib/adapter-check');
const { createHarness, createDefaultRegistry } = require('../lib/index');
const { createTflmEngine } = require('../adapters/engine/tflm');
const { createCubeaiEngine } = require('../adapters/engine/cubeai');
const { createHostTarget } = require('../adapters/target/host');
const { createBoardTarget } = require('../adapters/target/board');
const { createMyEngine } = require('../examples/my-engine');

describe('validateEngineAdapter', () => {
  test('合法引擎(内置 tflm/cubeai + 示例 my-engine)通过', () => {
    for (const engine of [createTflmEngine(), createCubeaiEngine(), createMyEngine()]) {
      const verdict = validateEngineAdapter(engine);
      expect(verdict.ok).toBe(true);
      expect(verdict.errors).toHaveLength(0);
    }
  });

  test('缺 id → 拒绝', () => {
    const engine = createTflmEngine();
    delete engine.id;
    expect(validateEngineAdapter(engine).ok).toBe(false);
  });

  test('requires 非数组 → 拒绝', () => {
    const engine = createTflmEngine();
    engine.requires = 'stedgeai';
    expect(validateEngineAdapter(engine).ok).toBe(false);
  });

  test('capabilities 字段非法(string[] 缺失)→ 拒绝', () => {
    const engine = createTflmEngine();
    engine.capabilities = () => ({ id: 'x', version: '1', ops: 'CONV_2D' });
    const verdict = validateEngineAdapter(engine);
    expect(verdict.ok).toBe(false);
    expect(verdict.errors.join()).toContain('inputFormats');
  });

  test('capabilities.version 缺失 → 拒绝', () => {
    const engine = createTflmEngine();
    engine.capabilities = () => ({ id: 'x', inputFormats: [], outputFormats: [], quantSchemes: [], ops: [], compatibleTargets: [] });
    expect(validateEngineAdapter(engine).ok).toBe(false);
  });

  test('缺必需方法 → 拒绝并指明方法名', () => {
    const engine = createTflmEngine();
    delete engine.convert;
    const verdict = validateEngineAdapter(engine);
    expect(verdict.ok).toBe(false);
    expect(verdict.errors.join()).toContain('convert()');
  });
});

describe('validateTargetAdapter', () => {
  test('合法目标(内置 host/board + 模板)通过', () => {
    for (const target of [createHostTarget(), createBoardTarget({ id: 'board-x', mcu: 'X', toolchain: 'gcc', flasher: 'st-flash' })]) {
      expect(validateTargetAdapter(target).ok).toBe(true);
    }
  });

  test('capabilities.kind 非法 → 拒绝', () => {
    const target = createHostTarget();
    target.capabilities = () => ({ id: 'x', kind: 'cloud', toolchains: [], measurable: [] });
    expect(validateTargetAdapter(target).ok).toBe(false);
  });

  test('缺 build 方法 → 拒绝', () => {
    const target = createHostTarget();
    delete target.build;
    expect(validateTargetAdapter(target).ok).toBe(false);
  });

  test('measurable 非数组 → 拒绝', () => {
    const target = createHostTarget();
    target.capabilities = () => ({ id: 'x', kind: 'host', toolchains: [], measurable: 'accuracy' });
    expect(validateTargetAdapter(target).ok).toBe(false);
  });
});

describe('第三方接入端到端(D5-5)', () => {
  test('my-engine 显式注册 → plan → run 全链跑通', async () => {
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-e2e-'));
    try {
      // 显式注入(D5-1):默认注册表 + 第三方引擎
      const registry = createDefaultRegistry({ probe: () => true }).registerEngine(createMyEngine());
      const h = createHarness({ baseDir, registry });

      h.createPipeline({
        schemaVersion: '1.0',
        name: 'vendor-y-demo',
        stages: [
          { id: 'collect', config: { samples: 50 } },
          { id: 'train', executor: 'mock' },
          { id: 'quantize', engine: 'my-engine', scheme: 'int8' },
          { id: 'integrate', engine: 'my-engine' },
          { id: 'eval', engine: 'my-engine', target: 'host', metrics: ['accuracy'] }
        ],
        gates: { minAccuracy: 0.85 }
      });
      const plan = h.plan();
      expect(plan.ok).toBe(true); // 规划期能力校验通过
      const run = await h.run();
      expect(run.status).toBe('completed');
      const { evalReport } = h.report({ runId: run.runId });
      expect(evalReport.engine).toBe('my-engine');
      expect(evalReport.accuracy).toBeGreaterThanOrEqual(0.85);
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
    }
  });
});
