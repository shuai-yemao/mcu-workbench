# 嵌入式 AI Harness 插件系统 —— 架构设计与长期规划

> 状态:**Accepted(定稿,阶段 0 可开工)** | 日期:2026-08-08 | 版本:1.0
> 定位:嵌入式 AI 开发流程自动化 harness(agent 编排数据→训练→量化→集成→验证全流程)
> 前置:推理引擎尚未确定 → **引擎无关抽象优先**;与 MCU-Workbench 五层契约同构,复用团队既有心智

---

## 1. 背景与问题

MCU-Workbench 已具备:五层契约(App → Service → Platform ← Impl → Vendor)、workflow 五入口(RCP → review-gate → integration-plan → final-review)、七角色 agents、catalog/registry/loader、artifact 协议。

缺口:**嵌入式 AI 开发没有端到端编排层**。数据采集、模型训练(PC 侧)、量化转换、固件集成、板级验证各自为战,没有契约、没有门禁、没有可审计产物链。

Harness 的使命:**让 AI 流水线像固件开发一样可编排、可门禁、可审计、可回归**,并与现有五层契约无缝咬合。Harness 本身不写 AI 代码——它是流程的骨架 + 契约的地基。

## 2. 领域模型(通用语言)

| 术语 | 含义 |
|---|---|
| **Pipeline** | 一次嵌入式 AI 开发任务,有序 Stage 链,顶层聚合根 |
| **Stage** | 最小可编排单元(collect / train / quantize / integrate / eval),声明输入输出契约 |
| **Artifact** | 阶段间传递的**不可变版本化**产物(数据集、模型、量化模型、生成代码、评测报告),内容寻址 + 血缘 |
| **Engine Adapter** | 推理引擎的厂商无关适配(TFLM / STM32Cube.AI / ESP-DL / 自研),实现 EngineContract |
| **Target Adapter** | 运行目标适配(真实板卡 / QEMU 仿真 / host 模拟),实现 TargetContract |
| **Gate** | 阶段完成的放行判定:artifact schema 校验 + 声明式指标阈值 + 可编程验证器 |
| **Run** | 一次 Pipeline 执行实例,状态可恢复、断点续跑,复用 `.mcu-workbench/runs/` 协议 |

## 3. 总体架构(五层,与现有契约同构)

```text
┌──────────────────────────────────────────────────────────┐
│ Orchestration 编排层 (Harness Core)                       │  ← App
│  Pipeline 定义 · 阶段调度 · 状态机 · Gate · 断点恢复      │
├──────────────────────────────────────────────────────────┤
│ Stage 层 (可插拔阶段实现)                                 │  ← Service
│  collect / train / quantize / integrate / eval            │
├──────────────────────────────────────────────────────────┤
│ Contract 契约层 (纯类型定义,引擎无关)                     │  ← Platform
│  EngineContract · TargetContract · ArtifactSchema         │
├──────────────────────────────────────────────────────────┤
│ Adapter 适配层 (引擎/目标绑定)                            │  ← Impl
│  engine: tflm / cubeai / espdl · target: host / qemu / board│
├──────────────────────────────────────────────────────────┤
│ Vendor 底座 (源码不复制,只登记映射)                       │  ← Vendor
│  TFLM / CMSIS-NN / 厂商 SDK / 训练框架 / 数据集           │
└──────────────────────────────────────────────────────────┘
```

同构映射是刻意的:编排层↔App、阶段层↔Service、契约层↔Platform、适配层↔Impl、Vendor↔Vendor。已有分层依赖铁律(App 只调 Service、Vendor 不反向)零成本迁移到 AI 域。

## 4. 契约层完整定义(阶段 0 交付物 · 地基)

### 4.1 ArtifactSchema(产物契约)

```typescript
// harness/lib/contracts/artifact-schema.ts
export type ArtifactKind =
  | 'dataset' | 'model' | 'converted-model' | 'quantized-model'
  | 'generated-code' | 'runtime-bundle' | 'eval-report';

export interface ArtifactMeta {
  kind: ArtifactKind;
  schemaVersion: string;      // 语义化,如 "1.0";不同 schema 版本互不兼容
  id: string;                 // 不可变:sha256(内容) 前缀 12 位
  checksum: string;           // 内容 sha256
  size: number;
  lineage: string[];          // 上游 artifact id 列表(血缘)
  producer: { stage: StageId; runId: string; engine?: string };
  createdAt: string;          // ISO 8601
  labels?: Record<string, string>;  // 自由扩展(如 mcu=target、scheme=int8)
}
```

- **不可变**:id 内容寻址,一旦写入不得修改,只能产生新版本(Gate 校验依据)
- **血缘**:`lineage` 链回答"这个模型来自哪份数据集、哪次训练"
- 存储:`.mcu-workbench/artifacts/<kind>/<id>/`(阶段 1 落地,见 §8)

### 4.2 EngineContract(引擎契约)

```typescript
// harness/lib/contracts/engine-contract.ts
export interface EngineCapabilities {
  id: string;                        // "tflm" | "cubeai" | "espdl" | ...
  version: string;
  inputFormats: string[];            // ["tflite"] | ["onnx"] | ...
  outputFormats: string[];           // ["c-array"] | ["c-graph"] | ["bin"] ...
  quantSchemes: string[];            // ["int8","fp16","weight-only", ...]
  ops: string[];                     // 支持算子集合;缺失算子规划期报错
  compatibleTargets: string[];       // ["host","qemu","board"]
}

export interface EngineAdapter {
  capabilities(): EngineCapabilities;
  convert(req: { artifact: ArtifactRef; target: TargetSpec }): Promise<ArtifactRef>;      // → converted-model
  quantize(req: { artifact: ArtifactRef; dataset?: ArtifactRef; scheme: string }): Promise<ArtifactRef>; // → quantized-model
  generateCode(req: { artifact: ArtifactRef; config: GenConfig }): Promise<ArtifactRef>;  // → generated-code
  run(req: { bundle: ArtifactRef; target: TargetAdapter }): Promise<RunResult>;
  evaluate(req: { bundle: ArtifactRef; target: TargetAdapter; dataset: ArtifactRef }): Promise<ArtifactRef>; // → eval-report
}
```

- 引擎差异全部封在 Adapter 内,Stage 层只见契约
- `capabilities()` 用于**规划期静态校验**:Stage 要 int8 量化而引擎不支持 → 规划期失败,不拖到运行期
- EngineContract × TargetContract 正交:任意引擎 × 任意目标可组合(cubeai × qemu 无板评测)

### 4.3 TargetContract(目标契约)

```typescript
// harness/lib/contracts/target-contract.ts
export interface TargetCapabilities {
  id: string;                  // "host" | "qemu-stm32f4" | "board-gr5526"
  kind: 'host' | 'sim' | 'board';
  mcu?: string;                // 板级/仿真目标填写
  toolchains: string[];        // ["arm-none-eabi-gcc"] | ["gcc"]
  measurable: string[];        // 可测量指标:accuracy | latency | ram | flash | power
}

export interface TargetAdapter {
  capabilities(): TargetCapabilities;
  build(bundle: ArtifactRef): Promise<BuildResult>;    // 编译固件
  flash(artifact: ArtifactRef): Promise<FlashResult>;  // 烧录;host 空实现
  exec(req: ExecReq): Promise<ExecResult>;             // 执行推理/数据采集
  measure(req: MeasureReq): Promise<MeasureResult>;    // 测量 latency/ram/flash/power
}
```

### 4.4 Gate(门禁契约)

```typescript
export interface GateVerdict { pass: boolean; reasons: string[]; evidence?: string; }
// Gate = 三层判定(按序,全过才放行):
// 1. schema 校验:ArtifactMeta 字段 + schemaVersion 兼容
// 2. checksum 校验:内容哈希与 meta 一致(防篡改)
// 3. 声明式阈值:pipeline.json 的 gates 字段(如 minAccuracy / maxLatencyMs)+ 可编程验证器(stage.validate)
```

## 5. Stage 契约与默认链

### 5.1 五阶段输入输出

| Stage | 输入 | 输出 | 引擎 | 目标 |
|---|---|---|---|---|
| `collect` | 无(或采集配置) | `dataset` | — | 需要(采数端) |
| `train` | `dataset` | `model` | — | —(host 侧脚本/远程 executor) |
| `quantize` | `model` + `dataset?`(校准集) | `quantized-model` | 需要 | — |
| `integrate` | `quantized-model` + 目标工程 | `generated-code` / `runtime-bundle` | 需要 | 需要(编译) |
| `eval` | `runtime-bundle` + `dataset` | `eval-report` | 需要 | 需要(运行) |

- 默认链:`collect → train → quantize → integrate → eval`,可裁剪(`--stages train,eval`),可扩展 DAG
- **train 不绑定引擎**:支持 `local:python3 train.py` 与 `remote:<api>` 两种 executor,接入既有训练流程,不重复造训练框架

### 5.2 Stage 实现形态

```typescript
export interface StageImpl<In extends ArtifactKind[], Out extends ArtifactKind> {
  id: StageId;
  inputs: In;
  output: Out;
  run(ctx: StageCtx): Promise<ArtifactRef>;        // 产出 artifact(写 .mcu-workbench/artifacts/)
  validate(ctx: StageCtx, artifact: ArtifactRef): GateVerdict;  // 可编程验证器(门禁第 3 层)
}
```

## 6. Pipeline 描述文件(pipeline.json)

```json
{
  "schemaVersion": "1.0",
  "name": "keyword-spotting-gr5526",
  "project": "./target",
  "stages": [
    { "id": "collect",   "target": "board-gr5526", "config": { "samples": 5000 } },
    { "id": "train",     "executor": "local:python3 train.py --data ./ds" },
    { "id": "quantize",  "engine": "tflm", "scheme": "int8" },
    { "id": "integrate", "engine": "tflm" },
    { "id": "eval",      "engine": "tflm", "target": "host", "metrics": ["accuracy", "latency", "ram"] }
  ],
  "gates": { "minAccuracy": 0.9, "maxLatencyMs": 50 }
}
```

- Stage 默认从已有 catalog 选择引擎/目标适配器;`engine`/`target` 缺省时用 `defaults` 或首个能力匹配的适配器
- 规划期校验:stage 依赖的引擎存在、capabilities 满足、gates 字段对应指标可测 → 不满足直接失败

## 7. 技术栈与实现约束(ADR H06)

| 项 | 决策 | 理由 |
|---|---|---|
| 契约定义 | **`.ts` 类型文件 + `tsc --noEmit` 校验**,不引入运行时构建 | 契约要强类型可校验,又不想给纯 JS 插件加构建步骤 |
| 运行时实现 | **JS (CommonJS)**,与现有 `lib/*.js` 一致 | 零构建、与现有 loader/catalog 同栈 |
| 测试 | **Jest**(项目已有 34 套件/190 用例) | 沿用,不引入新框架 |
| 校验器 | 自写轻量校验函数(不引 zod) | 依赖最小化;契约简单,手写足够 |
| CLI | 复用现有 `commands/*.js` + `bin/` 机制 | 与 mcu-new/core/driver 同模式 |
| 状态存储 | 复用 `.mcu-workbench/runs/` + 新增 `.mcu-workbench/artifacts/` | 与 agent 交接协议同目录,审计统一 |

## 8. 物理目录结构(阶段 1 起步,ADR H07)

```text
harness/                          # 当前仓库内起步;独立 manifest 表达分发,可拆独立 repo
├─ plugin.json                    # 独立分发 manifest(H01)
├─ lib/
│  ├─ contracts/                  # ← 阶段 0 交付:三契约 + Gate 类型
│  │  ├─ engine-contract.ts
│  │  ├─ target-contract.ts
│  │  ├─ artifact-schema.ts
│  │  └─ gate.ts
│  ├─ pipeline/
│  │  ├─ pipeline.ts              # 状态机 + 调度(created→planned→running→gated→completed)
│  │  ├─ planner.ts               # 规划期静态校验(能力匹配 + gates 可测性)
│  │  ├─ gate.ts                  # 三层门禁判定
│  │  └─ run-store.js             # Run/Artifact 存储(复用 .mcu-workbench/)
│  ├─ stage/
│  │  ├─ collect.js  train.js  quantize.js  integrate.js  eval.js
│  └─ registry.js                 # 引擎/目标/阶段注册(参照 catalog.js 模式)
├─ adapters/
│  ├─ engine/
│  │  └─ tflm/                    # 阶段 1 首个引擎(host 验证契约)
│  └─ target/
│     └─ host/                    # 阶段 1 首个目标
├─ commands/
│  └─ mcu-harness.js              # pipeline init/run/resume/report
└─ tests/
   └─ contracts.test.js           # 契约校验单测(阶段 0 验收)
```

## 9. 与现有 MCU-Workbench 的融合

| 现有设施 | Harness 复用方式 |
|---|---|
| catalog / registry / loader | 引擎/目标/阶段适配器走同一注册模式,新增 harness 域 |
| agents 七角色 | 复用 embedded-lead 编排;可选新增 `ai-engineer`(领域:模型/数据/评测) |
| artifact 协议 `.mcu-workbench/` | Run / Artifact 记录复用同一目录与协议 |
| workflow 五入口 | requirements-router 可路由 AI 需求,RCP 扩展 AI 字段;final-review 增加评测门禁 |
| 五层契约(固件域) | 引擎源码归 Vendor(engine vendor);推理接口归 Platform(platform_ai);移植归 Impl(impl_ai);AI 业务归 Service(service_ai) |
| Node CLI | 新增 `pipeline init/run/resume/report` 子命令 |

**架构决策 H01 — Harness 独立插件分发,不内嵌现有插件。** 生命周期独立(AI 节奏 ≠ 固件节奏)、可插拔(非 AI 项目零成本)、依赖单向(harness → 现有设施,不反向);代价是双 manifest 维护。

## 10. 长期演进路线

| 阶段 | 目标 | 关键动作 | 里程碑(可验证) |
|---|---|---|---|
| **0 契约定稿**(1-2 周) | 三契约 + Gate 类型化 | §4 四份 .ts 契约 + 自写校验器 + 单测;pipeline.json schema;tsc --noEmit 全绿 | 契约单测通过,本文档 Accepted |
| **1 最小闭环 MVP**(4-6 周) | 一条流水线端到端跑通 | collect→train→quantize→integrate→eval;tflm 适配器 + host target;Run/Artifact 存储;CLI init/run | host 上跑通 demo 流水线,产出 eval-report |
| **2 引擎与目标矩阵**(6-8 周) | 引擎/目标可替换 | cubeai / espdl 适配器;qemu / board target;数据集版本与血缘管理 | 同一模型在 TFLM 与 cubeai 下对比评测 |
| **3 评测体系**(4-6 周) | 评测进发布门禁 | 基线库 + 回归 + 趋势;打通 tools-quality / tools-observability | eval-report 进入 release gate |
| **4 流程智能化**(持续) | 自动化与自愈 | agent 自动调参(量化格式/算子选择)、失败自愈、反馈闭环(评测→训练) | 数据→模型→固件闭环,人工只在 Gate 介入 |
| **5 生态**(远期) | 开放扩展 | 适配器贡献规范;插件市场分发 | 第三方适配器接入 |

## 11. ADR 汇总

| ADR | 状态 | 决策 | 后果 |
|---|---|---|---|
| **H01** | ✅ Accepted | Harness 独立插件分发,不内嵌 | 生命周期独立、可插拔、依赖单向;双 manifest 代价 |
| **H02** | ✅ Accepted | 引擎无关抽象优先(三契约先行) | 引擎未定可先行开发;用最小引擎验证契约降低返工 |
| **H03** | ✅ Accepted | 五层契约同构(编排/阶段/契约/适配/Vendor) | 复用分层心智与依赖铁律;语义同构非代码复用 |
| **H04** | ✅ Accepted | Artifact 不可变内容寻址 + 断点续跑 | 阶段幂等可重入、失败成本低;存储 GC 需设计 |
| **H05** | ✅ Accepted | 评测报告是 release gate 输入 | 评测驱动发布;基线血缘需可信 |
| **H06** | ✅ Accepted | 技术栈:契约 .ts + tsc --noEmit,运行时 .js,测试 Jest,CLI 复用 commands 机制 | 零构建、同栈;契约可静态校验 |
| **H07** | ✅ Accepted | 起步物理位置:仓库内 `harness/` 目录(独立 manifest) | 快速起步;拆独立 repo 可逆 |
| **H08** | ✅ Accepted | Gate 三层:schema + checksum + 声明式阈值/可编程验证器 | 门禁可审计、可扩展;简单场景只需写 gates 字段 |
| **H09** | ✅ Accepted | Run 复用 `.mcu-workbench/runs/`,Artifact 存 `.mcu-workbench/artifacts/<kind>/<id>/` | 与 agent 交接协议统一;内容寻址天然防覆盖 |

## 12. 风险与对策

| 风险 | 对策 |
|---|---|
| 引擎契约过度设计(引擎未定) | 阶段 1 用最小引擎(TFLM host)验证契约,宁可改契约不猜 |
| 评测数据不可信(数据血缘断裂) | Artifact 内容寻址 + 血缘链 + checksum;数据集不可变 |
| 与现有 workflow 流程职责重叠 | 明确边界:harness 管 AI 流水线,现有 workflow 管固件开发;交接点在 integrate 产物 |
| agent 编排失控(自动化过度) | 阶段 4 才引入自动调参;前 3 阶段人工在 Gate 介入,保持可审计 |
| train 阶段绑定过死 | executor 抽象(local/remote),接入既有训练流程,不造训练框架 |

## 13. 阶段 0 开工清单(验收标准)

| # | 任务 | 产出 | 验收 |
|---|---|---|---|
| 1 | 契约类型定义 | `lib/contracts/` 四份 .ts(engine/target/artifact/gate) | `tsc --noEmit` 通过 |
| 2 | 校验器 + 单测 | 自写 validate 函数 + `tests/contracts.test.js` | Jest 通过,覆盖:合法 artifact、checksum 不符、schemaVersion 不兼容、capabilities 不满足 |
| 3 | pipeline.json schema | schema 草案 + 校验器 | 合法/非法 pipeline 各测例 |
| 4 | 文档定稿 | 本文档 Accepted + 提交 | 评审通过 |

> 阶段 0 唯一目标:**让契约可编译、可校验、可测试**。不写任何引擎/目标/阶段实现——那是阶段 1 的事。
