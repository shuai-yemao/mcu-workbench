/**
 * RunStore —— Run/Artifact 存储(ADR H04/H09)。
 * - Artifact 不可变:内容寻址(id = sha256 前缀 12 位),已存在则复用,绝不覆盖
 * - 血缘:lineage 由调用方(Stage)提供,回答"从哪来"
 * - Run 记录:baseDir/runs/<ts>-<pipeline>-<runId>.json,与 agent-artifacts 协议同目录风格
 * - baseDir 由调用方注入(目标工程 .mcu-workbench/ 或测试临时目录)
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { validateArtifactMeta, computeChecksum } = require('../validate/artifact-validator');

/** 产物 schema 版本(与 contracts/artifact-schema.ts 的 schemaVersion 语义一致) */
const ARTIFACT_SCHEMA_VERSION = '1.0';

class RunStore {
  /**
   * @param {{ baseDir: string }} opts
   */
  constructor({ baseDir }) {
    this.baseDir = baseDir;
    this.runsDir = path.join(baseDir, 'runs');
    this.artifactsDir = path.join(baseDir, 'artifacts');
  }

  /** 确保目录存在(幂等) */
  ensure() {
    fs.mkdirSync(this.runsDir, { recursive: true });
    fs.mkdirSync(this.artifactsDir, { recursive: true });
    return this;
  }

  /**
   * 写入产物(内容寻址,不可变)。
   * @param {{ kind: string, content: string | Buffer, lineage: string[], producer: { stage: string, runId: string, engine?: string }, labels?: Record<string, string> }} input
   * @returns {{ id: string, path: string }}
   */
  writeArtifact({ kind, content, lineage, producer, labels }) {
    this.ensure();
    const buf = Buffer.isBuffer(content) ? content : Buffer.from(String(content));
    const checksum = computeChecksum(buf);
    const id = checksum.slice(0, 12);
    const dir = path.join(this.artifactsDir, kind, id);

    // 不可变:已存在直接复用(同内容同 id)
    const metaPath = path.join(dir, 'meta.json');
    if (fs.existsSync(metaPath)) {
      return { id, path: dir };
    }

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'payload.bin'), buf);
    const meta = {
      kind,
      schemaVersion: ARTIFACT_SCHEMA_VERSION,
      id,
      checksum,
      size: buf.length,
      lineage,
      producer,
      createdAt: new Date().toISOString(),
      labels
    };
    const verdict = validateArtifactMeta(meta);
    if (!verdict.ok) {
      fs.rmSync(dir, { recursive: true, force: true });
      throw new Error(`invalid artifact meta rejected: ${verdict.errors.join('; ')}`);
    }
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    return { id, path: dir };
  }

  /**
   * 读取产物元数据。
   * @param {{ id: string, path?: string }} ref
   * @returns {object} meta
   */
  readMeta(ref) {
    const metaPath = path.join(ref.path || this.artifactDir(ref), 'meta.json');
    if (!fs.existsSync(metaPath)) throw new Error(`artifact meta not found: ${ref.id}`);
    return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  }

  /**
   * 读取产物内容。
   * @param {{ id: string, path?: string }} ref
   * @returns {Buffer}
   */
  readContent(ref) {
    const dir = ref.path || this.artifactDir(ref);
    const payloadPath = path.join(dir, 'payload.bin');
    if (!fs.existsSync(payloadPath)) throw new Error(`artifact payload not found: ${ref.id}`);
    return fs.readFileSync(payloadPath);
  }

  /**
   * 按 kind+id 定位产物目录。
   * @param {{ id: string }} ref
   */
  artifactDir(ref) {
    const meta = this.findMetaById(ref.id);
    if (!meta) throw new Error(`artifact not found: ${ref.id}`);
    return path.join(this.artifactsDir, meta.kind, meta.id);
  }

  /** 全库查找 id(跨 kind 搜索,保证引用可解析) */
  findMetaById(id) {
    if (!fs.existsSync(this.artifactsDir)) return undefined;
    const kinds = fs.readdirSync(this.artifactsDir);
    for (const kind of kinds) {
      const dir = path.join(this.artifactsDir, kind, id);
      const metaPath = path.join(dir, 'meta.json');
      if (fs.existsSync(metaPath)) {
        return { meta: JSON.parse(fs.readFileSync(metaPath, 'utf8')), dir };
      }
    }
    return undefined;
  }

  /**
   * 创建 Run 记录。
   * @param {{ runId: string, pipelineName: string, planStages: object[] }} input
   */
  createRun({ runId, pipelineName, planStages }) {
    this.ensure();
    const run = {
      runId,
      pipeline: pipelineName,
      status: 'running',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stages: planStages.map((s) => ({
        id: s.id,
        engine: s.engineId,
        target: s.targetId,
        status: 'pending',
        artifactId: undefined,
        gate: undefined,
        error: undefined,
        startedAt: undefined,
        finishedAt: undefined
      }))
    };
    this._writeRun(run);
    return run;
  }

  /** 更新 Run 记录(整体覆写,记录为单一事实源) */
  updateRun(run) {
    run.updatedAt = new Date().toISOString();
    this._writeRun(run);
    return run;
  }

  /** 按 runId 加载 Run 记录 */
  loadRun(runId) {
    const file = this._runFile(runId);
    if (!fs.existsSync(file)) throw new Error(`run not found: ${runId}`);
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  /** 列出全部 runId */
  listRuns() {
    if (!fs.existsSync(this.runsDir)) return [];
    return fs.readdirSync(this.runsDir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
  }

  _runFile(runId) {
    return path.join(this.runsDir, `${runId}.json`);
  }

  _writeRun(run) {
    const file = this._runFile(run.runId);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(run, null, 2));
  }

  /** 生成新的 runId */
  static newRunId() {
    return `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  }
}

module.exports = { RunStore, ARTIFACT_SCHEMA_VERSION };
