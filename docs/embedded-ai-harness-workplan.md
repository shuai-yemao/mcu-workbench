# 嵌入式 AI Harness —— 阶段 0 开工工作包(现状 / 改动范围 / 代码边界 / 验收标准)

> 状态:**Accepted** | 日期:2026-08-08 | 依赖:`docs/embedded-ai-harness-plan.md` v1.0(架构定稿)
> 目标:在动任何代码前,把"插件现状、文件改动范围、代码边界、验收标准"四件事定死,保证阶段 0 是**纯增量、零回归、可审计**的

---

## 1. 插件现状(事实审计)

### 1.1 入口与 manifest

| 对象 | 事实 | 路径 |
|---|---|---|
| 包元数据 | name=`mcu-workbench` v1.0.0;main=`index.js`;bin=`mcu-workbench`;依赖仅 `@opencode-ai/plugin`;devDeps 仅 `jest`(**无 typescript**) | `package.json` |
| Claude manifest | skills 数组声明 8 目录(workflow/app/service/platform/impl/vendor/tools/hardware) | `.claude-plugin/plugin.json` |
| OpenCode 入口 | `opencode.mjs` + `opencode.json` | 根目录 |
| Codex 兼容 | `codex/AGENTS.md` 由 `scripts/build-codex-compat.js` 生成,禁手改 | `codex/`、`AGENTS.override.md` |

### 1.2 核心机制(harness 必须遵守/复用的现状)

| 机制 | 事实 | 影响 harness |
|---|---|---|
| CLI 注册 | `lib/cli.js` 硬编码 `COMMANDS` 对象(命令名 → 模块 spec:`{name, description, options[], run}`);命令模块在 `commands/mcu-*.js`;参数解析为自写 parseArgs | **harness 无 CLI(ADR H13)**:lib 暴露 Programmatic API,`harness-pipeline` skill 引导 agent 编排;现有 cli/commands/bin 零改动 |
| 技能目录 | `skills/catalog.js` 唯一事实源,path 格式 `skills/<layer>/<id>`;registry.js 仅兼容转发 | **harness 不进 catalog**——它是独立插件,不污染 45/43 技能集 |
| 引擎/适配器注册 | 无现成注册机制可复用;catalog 模式(定义数组 + map)可参照 | 参照 catalog.js 模式自建 `harness/lib/registry.js`(阶段 1) |
| artifact 协议 | `scripts/agent-artifacts.js` 写 `.mcu-workbench/runs/<ts>-<agent>-<task>.json`;插件仓库本身**没有** `.mcu-workbench/`(那是目标工程目录) | harness 的 Run/Artifact 写目标工程 `.mcu-workbench/`,复用同一协议 |
| 分层扫描 | `lib/claude-layer.js` 五层(app→service→platform→vendor→impl) | harness 是**独立域**,不参与目标工程分层扫描 |
| 测试基线 | Jest 34 套件 / 190 用例;`npm test -- --runInBand` | 阶段 0 后必须保持全绿 |
| 校验链 | `validate:plugin` / `validate:links` / `validate:architecture` / `validate:layer` | 阶段 0 后必须全过 |

### 1.3 阶段 0 的边界结论

- harness 是**独立可分发插件**(H01),物理上以 `harness/` 目录起步(H07),**不是** `skills/` 的第 9 层
- 阶段 0 只交付契约类型 + 校验器 + 单测,**不写**任何引擎/目标/阶段/CLI 实现
- 契约 `.ts` 只做 `tsc --noEmit` 类型校验(不进 Jest);校验器与测试用 `.js`(Jest 开箱即用,无需 ts-jest)

---

## 2. 文件改动范围

### 2.1 新增文件(阶段 0 主体 · 全部新增,零修改现有)

```text
harness/
├─ README.md                          # 插件说明:定位/边界/快速开始
├─ plugin.json                        # 独立分发 manifest(H01;skills 暂空,阶段 1 再定)
├─ tsconfig.json                      # 仅包含 harness/lib/contracts(.ts 类型校验用)
├─ lib/
│  ├─ contracts/
│  │  ├─ artifact-schema.ts           # ArtifactMeta + ArtifactKind(§4.1)
│  │  ├─ engine-contract.ts           # EngineCapabilities + EngineAdapter(§4.2)
│  │  ├─ target-contract.ts           # TargetCapabilities + TargetAdapter(§4.3)
│  │  └─ gate.ts                      # GateVerdict + Gate 三层判定类型(§4.4)
│  └─ validate/
│     ├─ artifact-validator.js        # 自写校验器:meta 字段/schemaVersion/checksum
│     ├─ capability-validator.js      # 规划期能力校验:quantSchemes/ops/compatibleTargets
│     └─ pipeline-validator.js        # pipeline.json schema 校验
└─ tests/
   └─ contracts.test.js               # Jest 单测(校验器)
```

### 2.2 修改文件(阶段 0 唯一允许修改 · 有且仅有一处)

| 文件 | 改动 | 理由 |
|---|---|---|
| `package.json` | devDependencies 新增 `"typescript": "^5.x"` | H06 已定契约用 `.ts` + `tsc --noEmit`;当前无 TS 依赖,这是**唯一不可回避的修改** |
| `package.json`(可选) | scripts 新增 `"validate:harness-contracts": "tsc --noEmit -p harness/tsconfig.json"` | 便于 CI 复用;可选,不强制 |

> 若想做到**连 package.json 都不碰**:可退化为契约用 JSDoc `@typedef`(牺牲静态校验)。已评估,否决——H06 的收益(契约可编译可校验)大于加一个 devDep 的成本。

### 2.3 明确不动(禁止改动清单)

| 路径 | 理由 |
|---|---|
| `skills/`(全部,catalog.js / catalog-metadata.js / 八层技能) | harness 独立域,不污染技能集;动这里会破坏 45/43 catalog 断言与 tests/skills.test.js |
| `agents/`、`lib/agent-domains.js` | 阶段 0 不加 agent;ai-engineer 角色是可选演进项,阶段 4 再评估 |
| `lib/cli.js`、`commands/`、`bin/` | 阶段 0 无 CLI;且 ADR H13 已定 harness 不新增 CLI,现有 CLI 设施零改动 |
| `lib/claude-layer.js`、`lib/architecture-contract.js` | 与目标工程分层无关,harness 不参与 |
| `.claude-plugin/plugin.json`、`opencode.mjs`、`codex/`、`AGENTS.override.md` | harness 独立分发,不走主插件 manifest;改这些会触发主插件校验与 CI |
| 现有 `tests/*.test.js` | 阶段 0 不新增对现有测试的修改,只新增 harness 自己的测试 |
| 现有 `docs/*.md`(除本次新增) | 只新增 `docs/embedded-ai-harness-plan.md`(已定稿)+ 本文档,不改既有文档 |

---

## 3. 代码边界契约

### 3.1 依赖方向(谁可以依赖谁)

```text
harness/lib/validate/*.js ──→ harness/lib/contracts/*.ts(类型,编译期)
harness/tests/*.test.js  ──→ harness/lib/validate/*.js
harness/                   ──→ [只读] skills/registry.js、lib/process-runner.js(阶段 1 起)
现有插件代码               ──✗──→ harness/(现有代码不知道 harness 存在)
harness 契约               ──✗──→ 任何第三方校验库(zod 等,自写校验器)
```

### 3.2 明确禁止

1. **不得修改** `skills/`、`catalog.js`、`catalog-metadata.js` 中任何内容——harness 不注册为技能
2. **不得修改** `lib/cli.js` 的 COMMANDS(阶段 0);阶段 1 若接入,走 H10 决策,不是直接改
3. **不得**在 harness 内引入新运行时依赖(jest/typescript 之外);校验器自写
4. **不得**在插件仓库内创建 `.mcu-workbench/`(那是目标工程运行期目录)
5. **不得**让契约 `.ts` 参与 Jest 运行(避免引入 ts-jest/构建步骤;tsc 只做类型检查)

### 3.3 可复用(阶段 1 起,仅只读)

| 现有设施 | 复用方式 |
|---|---|
| `skills/registry.js` | 查询技能/平台元数据(只读) |
| `lib/process-runner.js` | 执行训练脚本 / 编译命令(只读) |
| `scripts/agent-artifacts.js` 的协议 | Run/Artifact 记录格式对齐 |

---

## 4. 验收标准(可执行,按序)

| # | 命令 | 通过条件 |
|---|---|---|
| A1 | `node_modules/.bin/tsc --noEmit -p harness/tsconfig.json`(或 `npx tsc --noEmit -p harness/tsconfig.json`) | 0 error;四份契约类型可编译 |
| A2 | `npx jest harness/tests --runInBand` | 全过;用例覆盖:①合法 artifact 通过 ②checksum 不符拒绝 ③schemaVersion 不兼容拒绝 ④capabilities 不满足(量化方案/算子/目标)拒绝 ⑤合法/非法 pipeline.json 各一例 |
| A3 | `npm test -- --runInBand` | **34 套件 / 190 用例全绿**(现有不回归) |
| A4 | `npm run validate:plugin` | 通过 |
| A5 | `npm run validate:links` | 通过(307 文件无死链;新增 harness/README.md 若有链接必须合法) |
| A6 | `git status` / `git diff` | **只显示**:harness/ 新增文件 + package.json 一行 devDependency(+ 可选 script);无任何现有文件被改动 |
| A7 | 评审 | 本文档 + plan v1.0 复审通过,阶段 0 才可关闭 |

> A6 是"纯增量"承诺的审计闸门:**如果 git diff 出现任何 skills/、lib/、agents/、docs/(既有)的改动,阶段 0 验收直接失败**。

---

## 5. 阶段 1 前置决策(现在标记,开工时拍)

| # | 决策点 | 选项 | 建议 |
|---|---|---|---|
| **H10** | ~~harness CLI 接入方式~~ | **已作废(ADR H13,2026-08-08)**:harness 无 Node CLI;lib 暴露 Programmatic API,`harness-pipeline` skill 引导 agent 编排;现有 `lib/cli.js` / `commands/` / `bin/` 零改动 | 消费者是 agent,直调 API 拿结构化结果比解析 CLI stdout 稳定;省命令注册/参数解析/格式化成本 |
| **H11** | harness plugin.json 的 skills 字段 | 空 / 放一个 `harness-pipeline` workflow skill 引导 agent | 阶段 1 定,倾向后者(agent 需要入口) |
| **H12** | 首个引擎选型 | tflm(规划已定)/ 其他 | 保持 tflm;用于验证契约(H02) |
