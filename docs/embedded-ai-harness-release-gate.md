# Harness 评测报告 → Release Gate 交接规范

> 状态:**Accepted** | 日期:2026-08-08 | 依据:ADR H05(评测报告是 release gate 输入)、阶段 3(D3-4 协议交接,不改 tools)

## 1. 交接对象与方向

```text
harness(eval stage) ── eval-report artifact ──► tools-quality / workflow-final-review(release gate)
```

- harness **只负责产出可审计的 eval-report artifact**(写入 `.mcu-workbench/artifacts/eval-report/<id>/`),不做发布决策
- tools-quality / final-review **消费** eval-report,把评测结果纳入发布门禁;不改动现有 skills 代码(边界铁律)
- 交接点是**协议 + 文档**:下游按本文档的格式读取,不依赖 harness 内部实现

## 2. eval-report artifact 格式

### 2.1 meta(artifact 元数据,`meta.json`)

| 字段 | 说明 |
|---|---|
| kind | `eval-report` |
| id / checksum | 内容寻址 + sha256(防篡改,证据可审计) |
| lineage | 血缘链:`[runtime-bundle, dataset]` → 可回溯到模型/数据 |
| producer | `{ stage: 'eval', runId, engine }` |

### 2.2 payload(内容,JSON)

```json
{
  "engine": "tflm",
  "target": "host",
  "dataset": "<dataset artifact id>",
  "model": "<runtime-bundle artifact id>",
  "accuracy": 0.95,
  "latencyMs": 12.5,
  "ramBytes": 4096,
  "flashBytes": 8192,
  "measurement": "mock | local:<cmd>"
}
```

- `measurement` 声明指标来源(mock 为占位/演示;`local:<cmd>` 为外部评测脚本)
- 阶段 4+ 可扩展字段(power 等),**向后兼容**:下游只读已存在字段

## 3. 门禁判定链(harness 侧已完成的检查)

| 层 | 检查 | evidence |
|---|---|---|
| 1 | artifact schema 校验 | `schema` |
| 2 | checksum 防篡改 | `checksum` |
| 3 | 声明式阈值(pipeline.gates) | `threshold` |
| 4 | 基线回归(pipeline.baseline) | `baseline-created` / `baseline-ok` / `baseline`(超阈值失败) |

run 记录的 eval stage 携带 `gate` 字段:`{ pass, reasons, evidence }`——**下游直接读取即可复用 harness 的判定**。

## 4. 下游消费指引(release gate 验收项)

1. 读取目标工程 `.mcu-workbench/runs/<runId>.json`,定位 eval stage:
   - `status === 'completed'` 且 `gate.pass === true` → 评测通过
   - `status === 'gated'` → 评测未通过(读取 `gate.reasons` 判定原因:阈值/基线回归)
2. 读取 `eval-report` artifact(payload + meta):
   - 校验 `meta.checksum` 与内容一致(防篡改)
   - 校验 `meta.lineage` 可回溯(bundle → quantized-model → model → dataset)
3. 发布放行条件(建议):
   - eval gate 通过(阈值 + 基线回归无回归)
   - 评测指标满足产品验收线(由产品定义,如 accuracy ≥ 0.9)
4. 把 eval-report artifact id + run 记录路径写入发布记录(证据链闭环)

## 5. 边界

- 本规范**不修改** `skills/tools/tools-quality/`、`workflow-final-review` 等现有实现;若未来要内化,单独立项
- harness 的 `compare({ runIds })` / `trend({ runIds })` 可辅助下游做多引擎对比与趋势分析(只读 API)
