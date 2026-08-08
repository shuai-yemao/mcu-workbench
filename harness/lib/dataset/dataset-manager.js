/**
 * DatasetManager —— 数据集版本与血缘管理(D2-4)。
 * - importDir:登记本地目录文件清单(name/size/sha256),不复制大文件(防篡改靠哈希)
 * - splitDataset:按 ratios 划分为 train/val/test 子集,血缘链到父数据集
 * - makeCalibrationSet:切出校准子集(labels.split='calibration'),供 quantize 挂载
 * - resolveCalibrationSet:给定数据集,解析其校准子集(自身或血缘内)
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/** 数据集 split 类型 */
const SPLITS = ['train', 'val', 'test', 'calibration'];

/**
 * 导入本地数据目录为 dataset artifact(仅登记清单,不复制文件)。
 * @param {{ store: object, runId: string, dir: string, split?: string, maxFiles?: number }} input
 */
async function importDir({ store, runId, dir, split = 'train', maxFiles = 1000 }) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error(`dataset dir not found: ${dir}`);
  }
  const files = [];
  const entries = fs.readdirSync(dir, { recursive: true });
  for (const entry of entries) {
    if (files.length >= maxFiles) break;
    const full = path.join(dir, entry);
    let stat;
    try {
      stat = fs.statSync(full);
    } catch {
      continue;
    }
    if (!stat.isFile()) continue;
    const content = fs.readFileSync(full);
    files.push({
      name: path.relative(dir, full).replace(/\\/g, '/'),
      size: stat.size,
      sha256: crypto.createHash('sha256').update(content).digest('hex')
    });
  }
  const content = JSON.stringify({ source: dir, files, total: files.length, split });
  return store.writeArtifact({
    kind: 'dataset',
    content,
    lineage: [],
    labels: { split },
    producer: { stage: 'collect', runId }
  });
}

/**
 * 按 ratios 划分数据集为 train/val/test 子集。
 * @param {{ store: object, runId: string, datasetRef: object, ratios?: { train: number, val: number, test: number } }} input
 */
async function splitDataset({ store, runId, datasetRef, ratios = { train: 0.8, val: 0.1, test: 0.1 } }) {
  const meta = store.readMeta(datasetRef);
  if (meta.kind !== 'dataset') throw new Error(`not a dataset artifact: ${meta.kind}`);
  const data = JSON.parse(store.readContent(datasetRef).toString('utf8'));
  const files = data.files || [];
  const sum = ratios.train + ratios.val + ratios.test;
  const trainCount = Math.floor((files.length * ratios.train) / sum);
  const valCount = Math.floor((files.length * ratios.val) / sum);

  const parts = {
    train: files.slice(0, trainCount),
    val: files.slice(trainCount, trainCount + valCount),
    test: files.slice(trainCount + valCount)
  };
  const refs = {};
  for (const split of SPLITS.slice(0, 3)) {
    const content = JSON.stringify({ source: data.source, files: parts[split], total: parts[split].length, split });
    refs[split] = await store.writeArtifact({
      kind: 'dataset',
      content,
      lineage: [meta.id],
      labels: { split },
      producer: { stage: 'collect', runId }
    });
  }
  return refs;
}

/**
 * 从数据集切出校准子集(quantize 用)。
 * @param {{ store: object, runId: string, datasetRef: object, count?: number }} input
 */
async function makeCalibrationSet({ store, runId, datasetRef, count = 32 }) {
  const meta = store.readMeta(datasetRef);
  const data = JSON.parse(store.readContent(datasetRef).toString('utf8'));
  const files = (data.files || []).slice(0, count);
  const content = JSON.stringify({ source: data.source, files, total: files.length, split: 'calibration' });
  return store.writeArtifact({
    kind: 'dataset',
    content,
    lineage: [meta.id],
    labels: { split: 'calibration' },
    producer: { stage: 'collect', runId }
  });
}

/**
 * 解析给定数据集的校准子集:自身是 calibration 则返回自身;否则在血缘内查找。
 * @param {{ store: object, datasetRef?: object }} input
 * @returns {Promise<object | undefined>}
 */
async function resolveCalibrationSet({ store, datasetRef }) {
  if (!datasetRef) return undefined;
  const meta = store.readMeta(datasetRef);
  if (meta.labels && meta.labels.split === 'calibration') {
    const found = store.findMetaById(meta.id);
    return { id: meta.id, path: found.dir };
  }
  // 在 store 全库找该数据集血缘内的 calibration 子集
  const datasetsDir = path.join(store.baseDir, 'artifacts', 'dataset');
  if (!fs.existsSync(datasetsDir)) return undefined;
  for (const id of fs.readdirSync(datasetsDir)) {
    const metaPath = path.join(datasetsDir, id, 'meta.json');
    if (!fs.existsSync(metaPath)) continue;
    const candidate = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    if (candidate.labels && candidate.labels.split === 'calibration' && candidate.lineage.includes(meta.id)) {
      return { id: candidate.id, path: path.join(datasetsDir, id) };
    }
  }
  return undefined;
}

module.exports = { SPLITS, importDir, splitDataset, makeCalibrationSet, resolveCalibrationSet };
