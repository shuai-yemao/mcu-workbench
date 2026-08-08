/**
 * Registry —— 引擎/目标/阶段注册表(参照 skills/catalog.js 的"定义数组 + map"模式)。
 * 阶段 1 内置:tflm 引擎、host 目标、5 个 stage;第三方适配器后续按同契约注册。
 */

const collectStage = require('./stage/collect');
const trainStage = require('./stage/train');
const quantizeStage = require('./stage/quantize');
const integrateStage = require('./stage/integrate');
const evalStage = require('./stage/eval');

const { createTflmEngine } = require('../adapters/engine/tflm');
const { createHostTarget } = require('../adapters/target/host');

class Registry {
  constructor() {
    this.engines = new Map();
    this.targets = new Map();
    this.stages = new Map();
  }

  /** @param {import('./contracts/engine-contract').EngineAdapter} engine */
  registerEngine(engine) {
    this.engines.set(engine.id, engine);
    return this;
  }

  /** @param {import('./contracts/target-contract').TargetAdapter} target */
  registerTarget(target) {
    this.targets.set(target.id, target);
    return this;
  }

  /** @param {{ id: string }} stage */
  registerStage(stage) {
    this.stages.set(stage.id, stage);
    return this;
  }

  getEngine(id) {
    return this.engines.get(id);
  }

  getTarget(id) {
    return this.targets.get(id);
  }

  getStage(id) {
    return this.stages.get(id);
  }

  listEngines() {
    return [...this.engines.keys()];
  }

  listTargets() {
    return [...this.targets.keys()];
  }

  listStages() {
    return [...this.stages.keys()];
  }
}

/** 阶段 1 默认注册表(tflm × host + 5 stage) */
function createDefaultRegistry() {
  const registry = new Registry();
  registry
    .registerEngine(createTflmEngine())
    .registerTarget(createHostTarget())
    .registerStage(collectStage)
    .registerStage(trainStage)
    .registerStage(quantizeStage)
    .registerStage(integrateStage)
    .registerStage(evalStage);
  return registry;
}

module.exports = { Registry, createDefaultRegistry };
