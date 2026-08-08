/**
 * 数据集管理单测:importDir / splitDataset / 校准集挂载与血缘。
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { RunStore } = require('../lib/pipeline/run-store');
const dataset = require('../lib/dataset/dataset-manager');

describe('dataset-manager', () => {
  let baseDir;
  let store;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-ds-'));
    store = new RunStore({ baseDir }).ensure();
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  test('importDir 登记文件清单与哈希,不复制文件', async () => {
    const dataDir = path.join(baseDir, 'raw');
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'a.wav'), 'aaa');
    fs.writeFileSync(path.join(dataDir, 'b.wav'), 'bbbb');

    const ref = await dataset.importDir({ store, runId: 'r1', dir: dataDir, split: 'train' });
    const meta = store.readMeta(ref);
    expect(meta.kind).toBe('dataset');
    expect(meta.labels.split).toBe('train');
    const content = JSON.parse(store.readContent(ref).toString('utf8'));
    expect(content.total).toBe(2);
    expect(content.files.map((f) => f.name).sort()).toEqual(['a.wav', 'b.wav']);
    // 哈希已登记(防篡改)
    expect(content.files[0].sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  test('splitDataset 划分 train/val/test 且血缘指向父集', async () => {
    const dataDir = path.join(baseDir, 'raw2');
    fs.mkdirSync(dataDir, { recursive: true });
    for (let i = 0; i < 10; i += 1) fs.writeFileSync(path.join(dataDir, `f${i}.bin`), String(i));

    const parent = await dataset.importDir({ store, runId: 'r1', dir: dataDir });
    const parts = await dataset.splitDataset({ store, runId: 'r1', datasetRef: parent });

    expect(parts.train).toBeTruthy();
    expect(parts.val).toBeTruthy();
    expect(parts.test).toBeTruthy();
    const trainMeta = store.readMeta(parts.train);
    expect(trainMeta.lineage).toEqual([parent.id]);
    const trainData = JSON.parse(store.readContent(parts.train).toString('utf8'));
    const valData = JSON.parse(store.readContent(parts.val).toString('utf8'));
    const testData = JSON.parse(store.readContent(parts.test).toString('utf8'));
    expect(trainData.total + valData.total + testData.total).toBe(10);
    expect(trainData.split).toBe('train');
    expect(valData.split).toBe('val');
    expect(testData.split).toBe('test');
  });

  test('校准集:makeCalibrationSet + resolveCalibrationSet(自身为 calibration)', async () => {
    const dataDir = path.join(baseDir, 'raw3');
    fs.mkdirSync(dataDir, { recursive: true });
    for (let i = 0; i < 10; i += 1) fs.writeFileSync(path.join(dataDir, `f${i}.bin`), String(i));
    const parent = await dataset.importDir({ store, runId: 'r1', dir: dataDir });

    const cal = await dataset.makeCalibrationSet({ store, runId: 'r1', datasetRef: parent, count: 4 });
    const calMeta = store.readMeta(cal);
    expect(calMeta.labels.split).toBe('calibration');
    expect(calMeta.lineage).toEqual([parent.id]);

    // 给定 parent,能解析到 calibration 子集
    const resolved = await dataset.resolveCalibrationSet({ store, datasetRef: parent });
    expect(resolved.id).toBe(cal.id);
    // 给定 calibration 自身,返回自身
    const self = await dataset.resolveCalibrationSet({ store, datasetRef: cal });
    expect(self.id).toBe(cal.id);
  });
});
