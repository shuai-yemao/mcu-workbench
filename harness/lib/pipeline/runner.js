/**
 * Runner —— Pipeline 执行状态机(ADR H04)。
 *   created → planned → running(stage…) → gated → completed
 *                                └─ failed → resume 从失败 stage 续跑
 * 要点:
 * - 阶段产物先写 store,再过 Gate(三层);gate 不通过 → stage=gated、run=failed
 * - Run 记录自包含(gates 已内嵌),resume 不依赖外部 pipeline 文件
 * - 部分执行:run({ stages: [...] }) 按 plan 顺序过滤
 */

const { evaluateGate } = require('./gate');
const { RunStore } = require('./run-store');
const { baselineKey } = require('../baseline/baseline-store');

class Runner {
  /**
   * @param {{ registry: object, store: object, baselineStore?: object }} opts
   */
  constructor({ registry, store, baselineStore }) {
    this.registry = registry;
    this.store = store;
    this.baselineStore = baselineStore;
  }

  /**
   * 执行流水线。
   * @param {{ pipeline: object, plan: { stages: object[] }, stages?: string[] }} input
   * @returns {Promise<object>} run 记录
   */
  async run({ pipeline, plan, stages }) {
    const runId = RunStore.newRunId();
    const run = this.store.createRun({
      runId,
      pipelineName: pipeline.name,
      planStages: plan.stages
    });
    run.gates = pipeline.gates || undefined;
    run.baseline = pipeline.baseline || undefined;

    const selected = stages && stages.length ? plan.stages.filter((s) => stages.includes(s.id)) : plan.stages;
    await this._execute(run, selected, pipeline);
    return run;
  }

  /**
   * 断点续跑:从 run 记录中第一个未完成的 stage 继续。
   * @param {{ runId: string }} input
   * @returns {Promise<object>}
   */
  async resume({ runId }) {
    const run = this.store.loadRun(runId);
    const planStages = run.stages.map((s) => ({
      id: s.id,
      engineId: s.engine,
      targetId: s.target,
      config: undefined,
      scheme: undefined,
      metrics: undefined,
      executor: undefined,
      measurement: undefined
    }));
    const pending = run.stages.filter((s) => s.status !== 'completed');
    const pipeline = { name: run.pipeline, gates: run.gates, baseline: run.baseline };
    run.status = 'running';
    await this._execute(run, planStages, pipeline, { onlyPending: true });
    return run;
  }

  /**
   * 汇总报告:run 记录 + 最终 eval-report 摘要。
   * @param {{ runId: string }} input
   */
  report({ runId }) {
    const run = this.store.loadRun(runId);
    let evalReport;
    const evalStage = run.stages.find((s) => s.id === 'eval' && s.status === 'completed');
    if (evalStage && evalStage.artifactId) {
      const found = this.store.findMetaById(evalStage.artifactId);
      if (found) {
        evalReport = JSON.parse(this.store.readContent({ id: evalStage.artifactId, path: found.dir }).toString('utf8'));
      }
    }
    return { run, evalReport };
  }

  async _execute(run, planStages, pipeline, opts = {}) {
    for (const planEntry of planStages) {
      if (opts.onlyPending) {
        const record = run.stages.find((s) => s.id === planEntry.id);
        if (record.status === 'completed') continue;
      }
      const stageRecord = run.stages.find((s) => s.id === planEntry.id);
      const stageDef = this.registry.getStage(planEntry.id);
      if (!stageDef) {
        stageRecord.status = 'failed';
        stageRecord.error = `stage not registered: ${planEntry.id}`;
        run.status = 'failed';
        this.store.updateRun(run);
        return run;
      }

      stageRecord.status = 'running';
      stageRecord.startedAt = new Date().toISOString();
      this.store.updateRun(run);

      const ctx = {
        pipeline,
        stage: planEntry,
        registry: this.registry,
        store: this.store,
        run,
        inputs: this._collectInputs(run, stageDef.output)
      };

      try {
        const artifactRef = await stageDef.run(ctx);
        stageRecord.artifactId = artifactRef.id;

        // 三层 gate(阈值)+ 第 4 层基线回归(D3-3)
        let verdict = evaluateGate({ artifactRef, store: this.store, rules: pipeline.gates });
        if (verdict.pass && stageDef.id === 'eval' && this.baselineStore && pipeline.baseline && pipeline.baseline.enabled) {
          verdict = this._checkBaseline({ artifactRef, run, pipeline, stageRecord });
        }
        if (!verdict.pass) {
          stageRecord.status = 'gated';
          stageRecord.gate = verdict;
          run.status = 'failed';
        } else {
          stageRecord.status = 'completed';
          stageRecord.gate = verdict;
        }
      } catch (err) {
        stageRecord.status = 'failed';
        stageRecord.error = err.message;
        run.status = 'failed';
      }
      stageRecord.finishedAt = new Date().toISOString();
      if (run.status !== 'failed') run.status = 'running';
      this.store.updateRun(run);

      if (stageRecord.status !== 'completed') break;
    }

    const allCompleted = run.stages.every((s) => s.status === 'completed');
    if (allCompleted) {
      run.status = 'completed';
      run.finishedAt = new Date().toISOString();
    } else if (run.status !== 'failed') {
      run.status = 'failed';
    }
    this.store.updateRun(run);
    return run;
  }

  /**
   * 基线回归判定(第 4 层 gate):首次建基线,后续超阈值 → 失败。
   * @param {{ artifactRef: object, run: object, pipeline: object, stageRecord: object }} input
   */
  _checkBaseline({ artifactRef, run, pipeline, stageRecord }) {
    const report = JSON.parse(this.store.readContent(artifactRef).toString('utf8'));
    const key = baselineKey(report);
    const baseline = this.baselineStore.load(key);
    if (!baseline) {
      this.baselineStore.save(key, { ...report, runId: run.runId });
      return { pass: true, reasons: [`baseline created: ${key}`], evidence: 'baseline-created' };
    }
    const cmp = this.baselineStore.compare(report, baseline, pipeline.baseline);
    if (!cmp.pass) {
      return { pass: false, reasons: cmp.reasons, evidence: 'baseline' };
    }
    this.baselineStore.save(key, { ...report, runId: run.runId });
    return { pass: true, reasons: [], evidence: 'baseline-ok' };
  }

  /**
   * 按产物类型收集已完成阶段的产物引用。
   * @param {object} run
   * @param {string} currentOutput 当前 stage 的输出 kind(其前序产物才需要)
   */
  _collectInputs(run, currentOutput) {
    const inputs = {};
    for (const record of run.stages) {
      if (record.status !== 'completed' || !record.artifactId) continue;
      const def = this.registry.getStage(record.id);
      if (!def) continue;
      if (def.output === currentOutput) continue;
      const found = this.store.findMetaById(record.artifactId);
      if (!found) continue;
      inputs[def.output] = { id: record.artifactId, path: found.dir };
    }
    return inputs;
  }
}

module.exports = { Runner };
