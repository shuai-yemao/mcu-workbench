# Review 编排与交接

| 阶段 | 输入 | 负责人 | 产物 | 退出条件 |
| --- | --- | --- | --- | --- |
| 范围与证据 | 最终代码/变更集、接口与约束 | `embedded-lead` | 审查范围与证据表 | 明确被审版本/diff 与基线 |
| 格式与注释门禁 | 变更集、`tools-quality/style-profile`、目标工程格式配置 | `verification-engineer` | 格式检查证据、注释完整性证据、profile 偏差清单 | 完成 80 列/排版、文件头、公开 API Doxygen、参数/返回值、必要约束、关键步骤和中文注释检查；任一失败即标记阻塞 |
| 风格与门禁分类 | 变更集、`review-gates.md` | `verification-engineer` | 风格/功能/安全分离的问题清单 | 风格与功能/安全问题不混类，规则来源可追溯 |
| 功能与资源 | 接口契约、调用链、资源所有权 | `verification-engineer` / `system-architect` | 分级问题清单 | 无未验证假设被表述为事实 |
| ISR/DMA/并发与安全 | 并发证据、数据手册、板级条件 | `verification-engineer` / `hardware-integration` | 分级问题清单 | 板级结论有实物证据 |
| 报告与交接 | 各阶段结果 | `embedded-lead` | 结构化审查报告 | 格式/注释失败时最终结论为阻塞；阻塞项与待补验证明确 |

本 Skill 默认只输出结构化审查报告，不生成实现、不自动修复、不产生替换代码或修复补丁。若当前会话未分派 agent，由主会话执行相同阶段职责；不得凭空声明已分派或已验证。
