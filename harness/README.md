# mcu-ai-harness

嵌入式 AI 开发流程自动化 harness 插件(独立分发,阶段 0)。

## 定位

把嵌入式 AI 开发从"各干各的"变成一条可编排、可门禁、可审计的流水线:

```text
collect → train → quantize → integrate → eval
```

设计依据:`docs/embedded-ai-harness-plan.md`(架构,Accepted v1.0)、`docs/embedded-ai-harness-workplan.md`(开工工作包)。

## 阶段 0 内容(当前)

仅契约与校验器,**不包含**任何引擎/目标/阶段/CLI 实现:

| 目录 | 内容 |
|---|---|
| `lib/contracts/` | 四份纯类型契约:ArtifactSchema / EngineContract / TargetContract / Gate |
| `lib/validate/` | 三个自写校验器(artifact / capability / pipeline),JSDoc 与契约类型绑定 |
| `tests/` | Jest 单测(5 类用例) |

## 边界

- 独立插件,不进 `skills/` catalog,不污染主插件技能集
- 依赖单向:harness → 主插件设施(只读);现有代码不知道 harness 存在
- 契约 `.ts` 只做 `tsc --noEmit` 类型校验;校验器与测试为 `.js`,Jest 直接运行
- 阶段 0 允许的仓库改动:本目录全部新增 + `package.json` 增加 devDependencies(typescript/@types/node)与 `validate:harness-contracts` script

## 验收命令

```powershell
npm run validate:harness-contracts   # A1: tsc --noEmit 0 error
npx jest harness/tests --runInBand   # A2: 契约单测全过
npm test -- --runInBand              # A3: 现有 34 套件不回归
npm run validate:plugin              # A4
npm run validate:links               # A5
```
