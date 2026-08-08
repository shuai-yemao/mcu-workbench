# Harness 适配器贡献规范(阶段 5 生态)

> 状态:**Accepted** | 日期:2026-08-08 | 依据:ADR H02(引擎无关抽象)、阶段 5(D5-1 ~ D5-5)
> 目标:第三方引擎/目标适配器按本规范开发 → 校验 → 注册接入,全程不改 harness 核心

## 1. 适配器类型

| 类型 | 接口(契约) | 实现面 |
|---|---|---|
| **引擎** | `EngineAdapter`(contracts/engine-contract.ts) | `convert / quantize / generateCode / run` + `capabilities()` + 可选 `requires` |
| **目标** | `TargetAdapter`(contracts/target-contract.ts) | `build / flash / exec / measure` + `capabilities()` + 可选 `requires` |

- 引擎**无状态**:方法返回 `ArtifactPayload({ kind, content, labels? })`,由 stage 落盘保证血缘/runId 完整
- 评测(精度/延迟/内存)由 measurement provider 承担,**引擎不实现 evaluate**(契约修正 #2)
- 结构级契约(字段/方法签名)由 `lib/adapter-check.js` 校验;类型级契约由 tsc/checkJs 兜底

## 2. 开发流程

### 2.1 复制模板

```powershell
# 引擎
cp -r harness/adapters/template/engine harness/adapters/<vendor>/<your-engine>/
# 目标
cp -r harness/adapters/template/target harness/adapters/<vendor>/<your-target>/
```

模板内含逐字段注释;`capabilities()` 是**规划期静态校验**依据(量化方案/算子/兼容目标必须如实声明)。

### 2.2 必填项

| 项 | 说明 |
|---|---|
| `id` | 唯一,planner/registry 按此引用(如 `pipeline.stages[].engine`) |
| `capabilities()` | 如实声明 `inputFormats/outputFormats/quantSchemes/ops/compatibleTargets`(引擎)或 `kind/toolchains/measurable`(目标) |
| `requires` | 工具链命令名数组(如 `['stedgeai']`);缺失时 registry 标记不可用,规划期报 `not available` |

## 3. 校验

```powershell
node scripts/validate-harness-adapter.js --kind engine <module-path>
node scripts/validate-harness-adapter.js --kind target <module-path>
```

- 自动发现模块导出的 `create*Engine` / `create*Target` 工厂,实例化后校验
- 校验项:requires 声明、capabilities 字段合法性、必需方法签名
- 内置适配器可作对照:引擎 `harness/adapters/engine/tflm`、目标 `harness/adapters/target/host`

## 4. 注册与使用(显式注入,D5-1)

```js
const { createHarness, createDefaultRegistry } = require('./harness/lib');
const { createMyEngine } = require('my-engine'); // 第三方包

const registry = createDefaultRegistry()
  .registerEngine(createMyEngine());   // 显式注入,无目录自动发现

const h = createHarness({ baseDir: '.mcu-workbench', registry });
h.createPipeline({
  /* ... */
  stages: [{ id: 'quantize', engine: 'my-engine', scheme: 'int8' }, /* ... */]
});
```

完整示例见 `harness/examples/my-engine/`(开发 → 校验 → 注册 → plan → run 全流程)。

## 5. 发布要点(D5-4)

| 项 | 约定 |
|---|---|
| 包名 | 建议 `mcu-harness-<engine|target>-<name>`(如 `mcu-harness-engine-cubeai`) |
| 主入口 | 导出工厂:`module.exports = { createXxxEngine / createXxxTarget }` |
| 依赖 | 引擎转换工具链(如 stedgeai)声明在 `requires`,**不引入 npm 运行时依赖** |
| 版本 | 语义化;`capabilities().version` 与包版本同步 |
| 说明 | README 写明:支持的模型格式/量化方案/算子/兼容目标(与 capabilities 一致) |

插件市场分发为远期外部决策;当前以 npm 包或目录复制 + 显式注册为准。

## 6. 边界与最佳实践

- **不改 harness 核心**:适配器只实现契约,不修改 registry/runner/gate
- **诚实声明**:capabilities 与实现一致(声明 fp16 但实现不支持 → 规划期通过、运行期失败,违反契约精神)
- **评测不归引擎**:精度/延迟测量走 `measurement`(mock / local:<cmd>),引擎只管转换/生成/推理
- **可审计**:接入新适配器后跑一次 campaign(如 grid-search 含新引擎),决策日志自动留痕
