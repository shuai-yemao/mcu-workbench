# Review 编排与交接

| 阶段 | 输入 | 负责人 | 产物 | 退出条件 |
| --- | --- | --- | --- | --- |
| 范围与 Spec 证据 | 最终代码/变更集、`spec.md`、接口与约束 | `embedded-lead` | 审查范围与 Spec 逐条追踪矩阵 | 重新读取 Spec，明确被审版本/diff 与基线；不依赖任务勾选状态 |
| 基线验证 | 项目测试、类型检查、构建和专项入口 | `toolchain-engineer` / `verification-engineer` | 命令、绝对 cwd、版本、退出码和产物记录 | 三类验证均实际执行；失败或不可复现进入阻塞 |
| 逐条实现核对 | Spec 条目、源码、配置、测试 | `system-architect` / `verification-engineer` | 每条要求的代码/测试证据和结果 | 范围、业务规则和验收标准无遗漏或未解释项 |
| 遗漏修复与复验 | 失败测试/检查、已批准范围内的最小修复 | 对应实现 Skill / `firmware-engineer` | 失败证据、修复 diff、测试/类型检查/构建复验结果 | 不扩大 Spec 或方案；需要新决定时阻塞回传上游 |
| 代码质量门禁 | 变更集、`tools-quality` `mode: final-gate`、目标工程格式/静态分析配置 | `verification-engineer` | 最终代码质量门禁报告和规则偏差清单 | `final-gate` 通过；失败转入质量整改或阻塞 |
| 复检与专项审查 | 修复后变更集、`review-gates.md` | `verification-engineer` / `hardware-integration` | 同条件复检、分层/资源/ISR/DMA/并发/安全问题清单 | 复检及 `git diff --check` 通过；板级结论有实物证据 |
| 报告与交接 | 各阶段结果 | `embedded-lead` | 结构化审查报告 | 每条 Spec 有证据且所有验证门禁通过才可放行 |

本 Skill 可以在已批准范围内修复直接对应 Spec 的遗漏，但必须先补充失败测试/检查并完成测试、类型检查、构建和 Spec 追踪复验；不得扩大范围、替换方案或自行补充关键决定。中间阶段的注释、格式和静态分析检查由 `tools-quality` 以 `advisory` 模式承担，最终阶段必须以 `final-gate` 模式形成质量出口；若当前会话未分派 agent，由主会话执行相同阶段职责；不得凭空声明已分派或已验证。
