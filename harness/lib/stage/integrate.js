/**
 * integrate 阶段 —— 集成(引擎生成代码 → 打包 runtime-bundle)。
 * 产物链:quantized-model → generated-code → runtime-bundle(血缘完整)。
 */

module.exports = {
  id: 'integrate',
  inputs: ['quantized-model'],
  output: 'runtime-bundle',

  /**
   * @param {{ stage: object, registry: object, store: object, run: object, inputs: object }} ctx
   */
  async run(ctx) {
    const engine = ctx.registry.getEngine(ctx.stage.engineId);
    if (!engine) throw new Error(`engine not found: ${ctx.stage.engineId}`);
    const model = ctx.inputs['quantized-model'];
    if (!model) throw new Error('integrate requires a completed quantize stage');

    const code = await engine.generateCode({
      artifact: model,
      config: { outputDir: 'host' }
    });
    const codeRef = await ctx.store.writeArtifact({
      kind: code.kind,
      content: code.content,
      labels: code.labels,
      lineage: [model.id],
      producer: { stage: 'integrate', runId: ctx.run.runId, engine: engine.id }
    });

    return ctx.store.writeArtifact({
      kind: 'runtime-bundle',
      content: JSON.stringify({
        engine: engine.id,
        code: codeRef.id,
        source: model.id,
        note: 'MVP: host 运行时 bundle(阶段 3 接入真实 target 构建)'
      }),
      lineage: [model.id, codeRef.id],
      producer: { stage: 'integrate', runId: ctx.run.runId, engine: engine.id }
    });
  }
};
