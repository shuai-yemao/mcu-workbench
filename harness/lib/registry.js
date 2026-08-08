/**
 * Registry —— 引擎/目标/阶段注册表(参照 skills/catalog.js 的"定义数组 + map"模式)。
 * D2-1:注册时按适配器 requires 声明做工具链可用性探测;不可用适配器仍注册但标记
 *       available=false,planner 报 "engine not available: id(需要 xxx)",不拖到运行期。
 */

const fs = require('fs');
const path = require('path');

const collectStage = require('./stage/collect');
const trainStage = require('./stage/train');
const quantizeStage = require('./stage/quantize');
const integrateStage = require('./stage/integrate');
const evalStage = require('./stage/eval');

const { createTflmEngine } = require('../adapters/engine/tflm');
const { createCubeaiEngine } = require('../adapters/engine/cubeai');
const { createEspdlEngine } = require('../adapters/engine/espdl');
const { createHostTarget } = require('../adapters/target/host');
const { createQemuTarget } = require('../adapters/target/qemu');
const { createBoardTarget } = require('../adapters/target/board');

/** 命令可用性探测:在 PATH 中查找可执行文件(Windows 兼容 .exe/.cmd/.bat) */
function commandExists(cmd) {
  const exts = process.platform === 'win32' ? ['.exe', '.cmd', '.bat', ''] : [''];
  const dirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    for (const ext of exts) {
      try {
        if (fs.statSync(path.join(dir, cmd + ext)).isFile()) return true;
      } catch {
        /* 继续查找 */
      }
    }
  }
  return false;
}

class Registry {
  /** @param {{ probe?: (cmd: string) => boolean }} opts 探测函数可注入(测试用) */
  constructor({ probe = commandExists } = {}) {
    this.probe = probe;
    this.engines = new Map();
    this.targets = new Map();
    this.stages = new Map();
  }

  /** @param {import('./contracts/engine-contract').EngineAdapter & { requires?: string[] }} engine */
  registerEngine(engine) {
    const requires = engine.requires || [];
    engine.available = requires.length === 0 || requires.every((cmd) => this.probe(cmd));
    this.engines.set(engine.id, engine);
    return this;
  }

  /** @param {import('./contracts/target-contract').TargetAdapter & { requires?: string[] }} target */
  registerTarget(target) {
    const requires = target.requires || [];
    target.available = requires.length === 0 || requires.every((cmd) => this.probe(cmd));
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

  /** 已注册且可用的引擎 id */
  listAvailableEngines() {
    return [...this.engines.values()].filter((e) => e.available).map((e) => e.id);
  }

  /** 已注册且可用的目标 id */
  listAvailableTargets() {
    return [...this.targets.values()].filter((t) => t.available).map((t) => t.id);
  }
}

/** 阶段 2 默认注册表(tflm/cubeai/espdl × host/qemu/board + 5 stage) */
function createDefaultRegistry(opts = {}) {
  const registry = new Registry(opts);
  registry
    .registerEngine(createTflmEngine())
    .registerEngine(createCubeaiEngine())
    .registerEngine(createEspdlEngine())
    .registerTarget(createHostTarget())
    .registerTarget(createQemuTarget())
    .registerTarget(createBoardTarget({ id: 'board-stm32f4', mcu: 'STM32F4', toolchain: 'arm-none-eabi-gcc', flasher: 'st-flash' }))
    .registerStage(collectStage)
    .registerStage(trainStage)
    .registerStage(quantizeStage)
    .registerStage(integrateStage)
    .registerStage(evalStage);
  return registry;
}

module.exports = { Registry, createDefaultRegistry, commandExists };
