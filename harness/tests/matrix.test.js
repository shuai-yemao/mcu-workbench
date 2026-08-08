/**
 * 矩阵单测:引擎/目标可替换 + 可用性探测(D2-1)。
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { createHarness, createDefaultRegistry } = require('../lib/index');

const DEMO_PIPELINE = {
  schemaVersion: '1.0',
  name: 'matrix-demo',
  stages: [
    { id: 'collect', config: { samples: 100 } },
    { id: 'train', executor: 'mock' },
    { id: 'quantize', engine: 'cubeai', scheme: 'int8' },
    { id: 'integrate', engine: 'cubeai' },
    { id: 'eval', engine: 'cubeai', target: 'qemu-stm32f4', metrics: ['accuracy', 'latency', 'ram'] }
  ],
  gates: { minAccuracy: 0.9 }
};

function makeHarness(registry) {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-matrix-'));
  return { h: createHarness({ baseDir, registry }), baseDir };
}

describe('引擎/目标矩阵', () => {
  test('默认注册表含 3 引擎 × 3 目标,可用性按探测决定', () => {
    const registry = createDefaultRegistry({ probe: () => true }); // 工具链全齐
    expect(registry.listEngines().sort()).toEqual(['cubeai', 'espdl', 'tflm']);
    expect(registry.listTargets().sort()).toEqual(['board-stm32f4', 'host', 'qemu-stm32f4']);
    expect(registry.listAvailableEngines()).toHaveLength(3);
  });

  test('cubeai × qemu-stm32f4 组合规划通过(兼容组合)', () => {
    const registry = createDefaultRegistry({ probe: () => true });
    const { h } = makeHarness(registry);
    h.createPipeline(DEMO_PIPELINE);
    const plan = h.plan();
    expect(plan.ok).toBe(true);
  });

  test('tflm × qemu-stm32f4 组合规划失败(引擎不兼容该目标)', () => {
    const registry = createDefaultRegistry({ probe: () => true });
    const { h } = makeHarness(registry);
    h.createPipeline({
      ...DEMO_PIPELINE,
      stages: DEMO_PIPELINE.stages.map((s) => ({ ...s, engine: 'tflm' }))
    });
    const plan = h.plan();
    expect(plan.ok).toBe(false);
    expect(plan.errors.join()).toContain('not supported by engine');
  });

  test('工具链缺失 → engine not available(规划期失败)', () => {
    const registry = createDefaultRegistry({ probe: (cmd) => cmd !== 'stedgeai' }); // cubeai 不可用
    const { h } = makeHarness(registry);
    expect(registry.getEngine('cubeai').available).toBe(false);
    h.createPipeline(DEMO_PIPELINE);
    const plan = h.plan();
    expect(plan.ok).toBe(false);
    expect(plan.errors.join()).toContain('engine not available: cubeai');
    expect(plan.errors.join()).toContain('stedgeai');
  });

  test('工具链缺失的目标同理报 target not available', () => {
    const registry = createDefaultRegistry({ probe: (cmd) => cmd !== 'qemu-system-arm' });
    const { h } = makeHarness(registry);
    expect(registry.getTarget('qemu-stm32f4').available).toBe(false);
    h.createPipeline(DEMO_PIPELINE);
    expect(h.plan().errors.join()).toContain('target not available: qemu-stm32f4');
  });

  test('cubeai × qemu 全链执行跑通(可用时)', async () => {
    const registry = createDefaultRegistry({ probe: () => true });
    const { h } = makeHarness(registry);
    h.createPipeline(DEMO_PIPELINE);
    const run = await h.run();
    expect(run.status).toBe('completed');
    const evalStage = run.stages.find((s) => s.id === 'eval');
    expect(evalStage.status).toBe('completed');
  });

  test('board 目标工厂参数化', () => {
    const { createBoardTarget } = require('../adapters/target/board');
    const target = createBoardTarget({ id: 'board-esp32', mcu: 'ESP32', toolchain: 'xtensa-esp32-elf', flasher: 'esptool' });
    expect(target.capabilities().kind).toBe('board');
    expect(target.capabilities().measurable).toContain('power');
    expect(target.requires).toEqual(['esptool']);
  });
});
