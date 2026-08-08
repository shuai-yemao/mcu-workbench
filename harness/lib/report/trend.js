/**
 * 历史趋势:多次 run 的指标序列(engine/target/dataset 维度)。
 */

/**
 * @param {{ store: object, runIds: string[] }} input
 * @returns {object[]} 按 runId 顺序的指标点
 */
function trendRuns({ store, runIds }) {
  const points = [];
  for (const runId of runIds) {
    let run;
    try {
      run = store.loadRun(runId);
    } catch {
      continue;
    }
    const evalStage = run.stages.find((s) => s.id === 'eval' && s.status === 'completed');
    if (!evalStage || !evalStage.artifactId) continue;
    const found = store.findMetaById(evalStage.artifactId);
    if (!found) continue;
    const report = JSON.parse(store.readContent({ id: evalStage.artifactId, path: found.dir }).toString('utf8'));
    points.push({
      runId,
      engine: report.engine,
      target: report.target,
      dataset: report.dataset,
      accuracy: report.accuracy,
      latencyMs: report.latencyMs,
      ramBytes: report.ramBytes,
      flashBytes: report.flashBytes,
      measurement: report.measurement,
      at: run.createdAt
    });
  }
  return points;
}

module.exports = { trendRuns };
