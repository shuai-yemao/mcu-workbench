/**
 * 多 run 对比聚合(D2-2:不做矩阵 DSL,agent 编排多次 run 后聚合)。
 * 输入:多个 runId(不同引擎/目标组合);输出:对比行 + 最优摘要。
 */

/**
 * @param {{ store: object, runIds: string[] }} input
 * @returns {{ rows: object[], summary?: object }}
 */
function compareRuns({ store, runIds }) {
  const rows = [];
  for (const runId of runIds) {
    let run;
    try {
      run = store.loadRun(runId);
    } catch {
      continue; // 无效/不存在的 runId 直接跳过
    }
    const evalStage = run.stages.find((s) => s.id === 'eval' && s.status === 'completed');
    if (!evalStage || !evalStage.artifactId) continue;
    const found = store.findMetaById(evalStage.artifactId);
    if (!found) continue;
    const report = JSON.parse(store.readContent({ id: evalStage.artifactId, path: found.dir }).toString('utf8'));
    rows.push({
      runId,
      pipeline: run.pipeline,
      engine: report.engine,
      target: report.target,
      accuracy: report.accuracy,
      latencyMs: report.latencyMs,
      ramBytes: report.ramBytes,
      flashBytes: report.flashBytes,
      artifactId: evalStage.artifactId
    });
  }
  if (rows.length === 0) return { rows: [], summary: undefined };

  const best = rows.reduce((acc, row) => (row.accuracy > acc.accuracy ? row : acc), rows[0]);
  return {
    rows,
    summary: {
      bestEngine: best.engine,
      bestTarget: best.target,
      bestAccuracy: best.accuracy,
      fastestLatencyMs: Math.min(...rows.map((r) => r.latencyMs)),
      minRamBytes: Math.min(...rows.map((r) => r.ramBytes))
    }
  };
}

module.exports = { compareRuns };
