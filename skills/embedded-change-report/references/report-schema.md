# 报告 Schema

这是嵌入式变更报告的默认结构。`assets/` 中的模板基于该 schema，并按场景做了少量变化。

## 必填章节

### 0. 信息来源摘要

面向发布、评审、高风险或证据有限的报告中，应包含本章节。

| 信息 | 来源类型 | 证据 / 状态 |
| --- | --- | --- |
| 变更文件 | 自动发现 | Git diff / patch / file listing |
| 硬件验证 | 用户确认 or 待用户确认 | Log, user statement, or missing |
| 客户影响 | 用户确认 or 待用户确认 | User-provided requirement or missing |

来源类型使用 `references/information-source-map.md` 中的标签。

### 1. 基本信息

包含：

- 项目名称
- 报告类型
- Branch / commit / tag / diff range
- 日期
- 作者或变更负责人，如已知
- Target MCU / board / product，如已知
- 固件版本或 release candidate，如已知

对追溯重要但缺失的字段，使用 `未提供`。

### 2. 变更背景

包含：

- 需求来源、issue ID、defect ID 或用户请求
- 原始问题或目标行为
- 本次范围内目标
- 如果 diff 暗示附近工作未完成，明确列出不在本次范围内的项目

除非背景、客户影响和优先级出现在项目产物中，否则标为 `用户确认` 或 `待用户确认`。

### 3. 变更范围

包含：

- 变更文件摘要
- 新增文件
- 删除文件
- 模块分组
- 触及的生成代码区域
- 触及的受保护或高风险文件

### 4. 实现摘要

说明：

- 核心逻辑变化
- 配置变化
- 硬件资源变化
- 协议或寄存器变化
- 错误处理变化
- 兼容性行为

除非用户要求，不要复制完整代码。总结工程影响，并将推断出的影响标为 `工程推断`。

### 5. 嵌入式影响分析

包含所有相关区域：

- Flash / RAM / stack / heap
- Interrupts / DMA / critical sections
- RTOS tasks、priorities、queues、semaphores、timers
- Clock、reset、boot、watchdog、low power
- GPIO / pinmux / peripheral resource conflicts
- Communication protocol compatibility
- Persistent storage or parameter migration
- Build system and compiler options
- 硬件安全或量产风险

### 6. 验证证据

每个验证项包含：

- 方法
- 证据来源
- 来源类型
- 结果
- 关键日志行或摘要
- 覆盖限制

除非有硬件日志、用户说明或测试记录支持，否则不要写“已通过硬件验证”。

### 7. 风险与回滚

包含：

- 已知风险
- 未验证风险
- 回归风险
- 回滚方法
- 回滚涉及的文件或 commit
- 应阻止发布的条件

### 8. 结论

使用以下基于证据的结论之一：

- 建议合入：证据支持评审合入。
- 可作为候选版本：已有构建和基础验证证据，但发布决策仍取决于项目流程。
- 暂不建议发布：仍存在高风险缺口。
- 仅完成代码变更说明：证据不足，不能支撑验证类声明。

## 措辞规则

- 可用时使用精确路径和 commit ID。
- 推断用 `基于文件路径和 diff 判断` 等措辞标注。
- 缺失证据用 `未提供证据` 或 `未验证` 标注。
- 依赖用户的信息用 `用户确认` 或 `待用户确认` 标注。
- 除非 warning 数量和上下文支持，否则不要把 warning 写成“无问题”。
- 除非已知尺寸限制或项目阈值，否则不要声称内存使用可接受。
- 除非有 frame/register/interface 兼容性证据，否则不要声称协议兼容。
