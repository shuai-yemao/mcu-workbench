/**
 * RunStore 单测:内容寻址、不可变、血缘、meta 校验、run 记录读写。
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { RunStore } = require('../lib/pipeline/run-store');

describe('RunStore', () => {
  let baseDir;
  let store;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-store-'));
    store = new RunStore({ baseDir });
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  test('内容寻址:相同内容产出相同 id(不可变)', () => {
    const producer = { stage: 'collect', runId: 'r1' };
    const a = store.writeArtifact({ kind: 'dataset', content: 'hello', lineage: [], producer });
    const b = store.writeArtifact({ kind: 'dataset', content: 'hello', lineage: [], producer });
    expect(a.id).toBe(b.id);
    expect(a.id).toHaveLength(12);
    // 已存在则复用,不重复写
    expect(fs.readdirSync(path.join(baseDir, 'artifacts', 'dataset'))).toHaveLength(1);
  });

  test('不同内容产出不同 id', () => {
    const producer = { stage: 'collect', runId: 'r1' };
    const a = store.writeArtifact({ kind: 'dataset', content: 'aaa', lineage: [], producer });
    const b = store.writeArtifact({ kind: 'dataset', content: 'bbb', lineage: [], producer });
    expect(a.id).not.toBe(b.id);
  });

  test('meta 可读且 checksum 与内容一致', () => {
    const producer = { stage: 'quantize', runId: 'r1', engine: 'tflm' };
    const ref = store.writeArtifact({ kind: 'quantized-model', content: 'payload', lineage: ['x'], producer });
    const meta = store.readMeta(ref);
    expect(meta.kind).toBe('quantized-model');
    expect(meta.lineage).toEqual(['x']);
    expect(meta.checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(store.readContent(ref).toString('utf8')).toBe('payload');
  });

  test('非法 meta(producer.runId 缺失)写入被拒绝并回滚', () => {
    expect(() =>
      store.writeArtifact({ kind: 'model', content: 'x', lineage: [], producer: { stage: 'train', runId: '' } })
    ).toThrow(/invalid artifact meta/);
    // 目录已回滚
    const modelDir = path.join(baseDir, 'artifacts', 'model');
    expect(fs.existsSync(modelDir) && fs.readdirSync(modelDir).length).toBe(0);
  });

  test('run 记录创建/更新/加载/列表', () => {
    const run = store.createRun({
      runId: 'run-001',
      pipelineName: 'demo',
      planStages: [{ id: 'collect', engineId: undefined, targetId: undefined }]
    });
    expect(run.status).toBe('running');
    store.updateRun({ ...run, status: 'completed' });
    const loaded = store.loadRun('run-001');
    expect(loaded.status).toBe('completed');
    expect(store.listRuns()).toContain('run-001');
  });
});
