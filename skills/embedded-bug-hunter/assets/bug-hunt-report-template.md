# 嵌入式 Bug 排查报告

最终报告使用用户语言。保持发现标签稳定：
`confirmed_issue`、`suspicious_pattern`、`design_smell`、`needs_runtime_evidence`、`false_positive_risk`。

## 1. 范围与证据

| 项目 | 值 |
| --- | --- |
| 工程根目录 |  |
| 范围 | whole project / module / bug class / diff |
| 已审查证据 | source / logs / build / tests / map / runtime |
| 深入阅读文件 |  |
| 证据缺口 |  |

## 2. 高风险区域

| 区域 | 证据 | 为什么重要 |
| --- | --- | --- |
|  |  |  |

## 3. 发现

### Finding 1

| 字段 | 值 |
| --- | --- |
| Type | confirmed_issue / suspicious_pattern / design_smell / needs_runtime_evidence / false_positive_risk |
| Severity | critical / high / medium / low |
| Confidence | high / medium / low |
| Location | file:function:line if known |
| Code clue |  |
| Risk reason |  |
| Conditions |  |
| Possible impact |  |
| False-positive risk |  |
| Recommended validation |  |

## 4. 设计异味

| 设计异味 | 证据 | 风险 | 建议下一步 |
| --- | --- | --- | --- |
|  |  |  |  |

## 5. 推荐下一步

| 优先级 | 步骤 | 目标 | Tool/skill |
| --- | --- | --- | --- |
| P0 |  | confirm/disprove highest risk |  |
| P1 |  | add regression evidence |  |
| P2 |  | fix or refactor after confirmation |  |

## 6. 证据限制

- 未深入阅读的候选命中不得报告为 `confirmed_issue`。
- 未深入阅读的扫描命中：
- 缺少运行时证据：
- 缺少硬件验证：
- 缺少 static-analysis/tool 证据：
