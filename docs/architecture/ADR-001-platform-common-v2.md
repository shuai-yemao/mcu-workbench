# ADR-001: platform_common 四子域结构与内置能力边界

## Status

Accepted（2026-08-09，用户确认：manager 为内置能力；仅文档施工）

## Context

实践工程 `D:\zhuomian\embedded_framework\03_Platform\platform_common\` 已演进为四子域结构（core/object/manager/diag，10 个 .c），而插件技能 `skills/platform/platform_common/SKILL.md` 仍停留在平铺 8 组文件清单（3 个 .c）——契约落后于现实，且 manager（生命周期驱动）与 diag（诊断可观测）两个子域完全未文档化。架构评审发现 5 个问题（P1-P5）：

- **P1** platform_common 职责膨胀风险（对象管理域与可观测域混置，缺准入边界）
- **P2** 平台层对日志的隐式硬依赖（assert/version 依赖 Impl 提供的日志实现，无初始化顺序契约）
- **P3** board_manager 硬编码编排顺序策略（device.init→service.init→…），平台层持有业务知识
- **P4** `platform_hardfault_frame_t` 为 ARM 架构寄存器结构，"不绑芯片"承诺实则绑了指令集架构
- **P5** manager 静态槽数组容量边界未定义（满槽/重复注册语义缺失）

用户决策：manager 为 platform_common **内置能力**（不拆独立技能）；本轮仅文档施工。

## Decision

1. **四子域契约化**：SKILL.md 文件清单改为四子域结构（core 3 头 / object 7 / manager 8 / diag 9），生成契约 3 → 10 个 `.c`；依赖方向图补 manager 与 diag 分支。
2. **manager 内置**：`manager/` 为 platform_common 内置能力，提供生命周期驱动**机制**（注册动作、驱动循环、continue-on-error 统计）；**顺序策略归 Service 层**（P3），board_manager 默认顺序仅为机制默认值、可被上层配置覆盖。
3. **准入规则（P1）**：新能力须被 ≥2 个子域/层共享且零芯片/RTOS/厂商依赖方可进入；diag 只声明接口、实现永远在 Impl。
4. **日志契约（P2）**：断言（故障路径）独立于日志，须有独立输出通道或注入式输出；日志须在任何平台对象使用前初始化。
5. **架构范围（P4）**：`platform_hardfault_frame_t` 显式声明为 ARM Cortex-M 架构契约，跨架构由 Impl 提供等价契约，不做寄存器级通用抽象。
6. **容量语义（P5）**：manager 槽数组容量编译期宏定义，满槽返回 `PLATFORM_ERR_NO_RESOURCE`，重复注册返回 `PLATFORM_ERR_ALREADY_INIT`。

## Consequences

**更容易**：
- 契约与工程现实对齐，插件 skill 可直接指导实践工程施工
- manager 机制与 Service 策略分离，产品级启动顺序可在 Service 层演进，不用改平台层
- 故障路径（断言）独立于日志，可靠性提升
- 跨架构移植边界显式（hardfault frame 声明为 ARM 契约）

**更难/代价**：
- manager 顺序配置化增加一层间接（当前 board_manager 顺序仍为默认值，配置能力待工程后续实现——W-05 blocked）
- 断言独立通道需工程侧改造（W-04 blocked）
- 槽数组满槽语义需工程实现补全（W-06 blocked）
- diag 的"准入边界"依赖文档纪律，无自动化强制（后续可加门禁）

**阻塞项**：工程代码改造（P2/P3/P5 实现）转后续课程；本 ADR 仅覆盖契约文档层。

**参考**：目标项目审查包 `<project_root>/00_Docs/04_需求文档/platform-common-v2-review-package.md`（四张清单）。
