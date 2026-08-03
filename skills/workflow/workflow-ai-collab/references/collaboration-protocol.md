# Review 编排与交接

| 阶段 | 输入 | 负责人 | 产物 | 退出条件 |
| --- | --- | --- | --- | --- |
| 范围与证据 | 最终代码/变更集、接口与约束 | `embedded-lead` | 审查范围与证据表 | 明确被审版本/diff 与基线 |
| 风格与门禁 | 变更集、风格 profile | `verification-engineer` | profile 偏差清单 | 记录 profile 来源与适用目录 |
| 功能与资源 | 接口契约、调用链、资源所有权 | `verification-engineer` / `system-architect` | 分级问题清单 | 无未验证假设被表述为事实 |
| ISR/DMA/并发与安全 | 并发证据、数据手册、板级条件 | `verification-engineer` / `hardware-integration` | 分级问题清单 | 板级结论有实物证据 |
| 报告与交接 | 各阶段结果 | `embedded-lead` | 结构化审查报告 | 阻塞项与待补验证明确 |

本 Skill 默认只输出结构化审查报告，不生成实现、不自动修复、不产生替换代码或修复补丁。若当前会话未分派 agent，由主会话执行相同阶段职责；不得凭空声明已分派或已验证。
