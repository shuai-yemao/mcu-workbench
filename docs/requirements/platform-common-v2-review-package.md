# 实现方案审查包 — platform_common 四子域与架构问题收敛

> 本包由 `workflow-review-gate` 流程产出（代码前审查），四张清单为必选产出。审查对象：platform_common 四子域设计 + P1-P5 架构问题的解决方案（见 ADR 提案）。四张清单重组产品文档（BRD/PRD/SRSys）待用户放行后输出到 `docs/requirements/`。

## 元数据与输入

| 字段 | 内容 |
|---|---|
| request_id | `platform-common-v2` |
| 项目路径与提交 | `D:\zhuomian\embedded_framework`（实践工程，feature/log-diagnosis-system） + `C:\Users\zhang\Documents\mcu-workbench`（插件，host_ai） |
| 审查状态 | `审查中` |
| 输入 | 架构评审：platform_common 四子域 + P1-P5 问题（2026-08-09 会话） |
| 既有方案 | 插件 `skills/platform/platform_common/SKILL.md`（平铺 8 组，未覆盖 manager/diag） |
| 已读工程证据 | 工程 `03_Platform/platform_common/` 全树、manager/diag/object 头文件、SKILL.md、baseline 测试、review-gate 模板 |

可信等级：`confirmed`（已读文件）/ `inferred`（未读实现细节）/ `user-confirmed`（待补证）。

## 0. 用户决策记录（补证与回填）

| 补证项 | 决策 | 可信等级 | 影响 |
|---|---|---|---|
| manager 是否并入 platform_common | **是，内置能力**（用户已确认） | `user-confirmed` | 回写 SKILL.md 时 manager 作为内置子域，不新建技能 |
| 本阶段施工范围 | **仅文档**（SKILL.md 回写 + ADR）；工程代码改造（P2/P3/P5 实现）作后续课程 | `user-confirmed` | 文件施工清单 W-04/05/06 标 blocked |
| 产品文档 BRD/PRD/SRSys 是否本轮输出 | 待确认 | — | 默认先出四张清单 |

## 1. 工程现状表

| ID | 已知事实 | 证据 | 可信等级 | 影响范围 | 待确认项 |
|---|---|---|---|---|---|
| F-01 | platform_common 已四子域：core(3 头)/object(7)/manager(8)/diag(9)+README | `03_Platform/platform_common/` 全树 | confirmed | SKILL.md 文件清单 | 无 |
| F-02 | 共 10 个 `.c`（object 3 / manager 4 / diag 3） | `find ... -name "*.c" \| wc -l` = 10 | confirmed | SKILL.md 生成契约"3 个 .c"过时 | 无 |
| F-03 | manager 层：通用基类（静态槽数组 + 生命周期驱动）+ device/service 特化 + board_manager 编排 | `manager/platform_manager.h` 头注释 | confirmed | SKILL.md 缺 manager 子域 | 槽数组上限值 inferred |
| F-04 | diag 内部依赖日志：`platform_assert.c`、`platform_version.c` include `platform_log.h`；日志实现由 Impl（elog bridge）提供 | 工程 grep | confirmed | P2 日志初始化顺序契约 | 断言降级路径未定义 |
| F-05 | board_manager 硬编码编排顺序 `device.init→service.init→device.start→service.start` | `manager/platform_board_manager.h` 头注释 | confirmed | P3 机制/策略分离 | 顺序来源改造范围 |
| F-06 | manager 用静态对象槽数组（编译期容量） | `manager/platform_manager.h` 头注释 | confirmed | P5 满槽语义 | 当前上限值与满槽返回码 inferred |
| F-07 | `platform_hardfault_frame_t` 13 字段为 ARM SCB 寄存器（cfsr/hfsr/dfsr/mmfar/bfar…） | `diag/platform_hardfault.h` | confirmed | P4 架构契约声明 | 无 |
| F-08 | 插件 SKILL.md：平铺 8 组文件清单、生成契约写"3 个 .c"、无 manager/diag 子域 | `skills/platform/platform_common/SKILL.md` | confirmed | 需回写 | 无 |
| F-09 | 四元组模板：插件 `references/object-four-tuple-template.md` 完整；工程无该文件（lesson09 示范体现） | 两侧路径比对 | confirmed | 模板归属 | 工程是否需落模板文件 |
| F-10 | Service 层已补位：`service_log` / `service_system`（编排门面） | `02_Service/` 全树 | confirmed | P3 顺序策略承载点 | 无 |
| F-11 | 插件 baseline 测试 5 断言守护五层契约（App 只调 Service 已收紧） | `tests/embedded-framework-baseline.test.js` | confirmed | 回写后须重跑 | 无 |

## 2. 文件施工清单

| ID | 动作 | 文件或目录 | 所属层 | 施工内容与理由 | 生成边界 | 前置事实 | 责任 Agent | 状态 |
|---|---|---|---|---|---|---|---|---|
| W-01 | 修改 | `skills/platform/platform_common/SKILL.md` | Platform（技能） | 文件清单改四子域结构（core/object/manager/diag）；生成契约 3→10 个 .c；新增 manager 内置能力章节；写入 P1 准入规则、P2 日志初始化契约、P3 机制/策略边界、P4 架构契约声明、P5 槽数组契约 | 否 | F-01~F-08 | software-architect | ready |
| W-02 | 新增 | `docs/architecture/ADR-001-platform-common-v2.md` | 文档 | ADR 记录四子域 + manager 内置 + P1-P5 决策与 trade-off | 否 | F-01~F-10 | software-architect | ready |
| W-03 | 修改 | `docs/architecture-overall-plan.md` | 文档 | 第 3 节 platform_common 描述同步四子域（若该节有平铺清单） | 否 | F-01 | software-architect | ready |
| W-04 | 修改 | `03_Platform/platform_common/diag/platform_assert.*` | Platform（工程） | P2：断言通道独立于日志——新增 `platform_assert_output` 原语（Impl 实现 impl_assert_output.c 桥接 RTT），assert.c 不再依赖 platform_log | 否 | F-04 | firmware-engineer | **done**（2026-08-09 实施） |
| W-05 | 修改 | `03_Platform/platform_common/manager/platform_board_manager.*` | Platform（工程） | P3：新增 `platform_board_hooks_t` 编排策略钩子（on_device_ready/on_service_ready/on_loop_begin）+ `set_hooks`；顺序为机制默认值，策略经钩子/Service 层表达 | 否 | F-05/F-10 | firmware-engineer | **done**（2026-08-09 实施） |
| W-06 | 修改 | `03_Platform/platform_common/manager/platform_manager.*` | Platform（工程） | P5：**已实现确认**——register 满槽返回 `PLATFORM_ERR_NO_RESOURCE`、重复返回 `ALREADY_INIT`、容量由调用方 init 时提供（比编译期宏更灵活，ADR 表述以本实现为准） | 否 | F-06 | firmware-engineer | **done**（核实确认） |
| W-07 | 新增 | `03_Platform/platform_common/references/object-four-tuple-template.md` | Platform（工程） | 四元组模板落工程（与插件 skill 对齐） | 否 | F-09 | knowledge-engineer | **blocked**（可选，后续） |

## 3. 代码生成约束清单

| ID | 约束类别 | 已确认约束 | 证据 | 禁止事项 | 未决项 | 状态 |
|---|---|---|---|---|---|---|
| G-01 | 接口 | manager 为 platform_common **内置能力**，不新建技能/目录 | 用户决策 | 禁止拆独立 platform_manager 技能 | 无 | ready |
| G-02 | 依赖 | SKILL.md 新增描述不得引入芯片/RTOS/厂商符号（延续平台门禁） | skill-catalog.js | 禁止在文档中写 HAL_/xTask/厂商类型调用 | 无 | ready |
| G-03 | 生成边界 | SKILL.md 文件清单与工程四子域结构逐项对应（10 个 .c） | F-01/F-02/F-08 | 禁止文档与工程漂移（清单必须真实反映结构） | 无 | ready |
| G-04 | 策略边界 | manager 只写**机制**（注册/驱动/统计），**顺序策略归 Service** | F-05/F-10 | 禁止把 device/service 先后顺序写进平台契约 | 无 | ready |
| G-05 | 架构范围 | hardfault frame **架构契约显式化**（ARM 声明），不做通用抽象 | F-07 | 禁止过度抽象（YAGNI） | 无 | ready |
| G-06 | 容量语义 | 槽数组显式容量宏 + 满槽 `PLATFORM_ERR_NO_RESOURCE` + 重复注册 `ALREADY_INIT` | F-06 | 禁止无上限的隐式数组行为 | 上限值未读实现 | ready（文档层） |
| G-07 | 测试回归 | 回写后必须通过全量测试与链接校验 | F-11 | 禁止改文档不跑验证 | 无 | ready |

## 4. 验收测试清单

| ID | 证据等级 | 验收项 | 命令/条件 | 预期结果 | 责任 Agent | 当前状态 | 产物 |
|---|---|---|---|---|---|---|---|
| V-01 | 静态 | SKILL.md 文件清单含四子域 + 10 个 .c + manager 章节 | `grep -n "diag/\|manager/\|10 个\|内置能力" skills/platform/platform_common/SKILL.md` | 全部命中 | software-architect | not-run | 审查包 |
| V-02 | 静态 | SKILL.md 无芯片/RTOS/厂商符号 | `grep -rn "HAL_\|xTask\|stm32\|CMSIS" skills/platform/platform_common/SKILL.md` | 无命中（平台门禁） | software-architect | not-run | 审查包 |
| V-03 | 静态 | ADR-001 存在且含四子域 + P1-P5 决策 | `ls docs/architecture/ADR-001-platform-common-v2.md` | 文件存在、章节齐全 | software-architect | not-run | ADR |
| V-04 | 主机 | 全量测试 | `npm test`（插件根目录） | 45 套件 / 268+ 用例全绿 | verification-engineer | not-run | jest 报告 |
| V-05 | 主机 | 链接校验 | `npm run validate:links` | Skill links valid | verification-engineer | not-run | 校验报告 |
| V-06 | 主机 | 插件结构校验 | `npm run validate:plugin` | 46 skills 通过 | verification-engineer | not-run | 校验报告 |
| V-07 | 一致性 | SKILL.md 与工程四子域逐项对应 | 人工比对（清单 vs 工程全树） | 无漂移 | software-architect | not-run | 对比表 |

## 审查结论与下一轮交接

| 分类 | 方案项 | 审查结论 | 证据或风险 | 所需动作 |
|---|---|---|---|---|
| 可采用 | W-01 SKILL.md 回写（四子域 + manager 内置 + P1/P3/P4/P5 契约化） | 纯文档、低风险、证据充分 | F-01~F-08 | 放行执行 |
| 可采用 | W-02 ADR-001 | 决策记录，符合可逆性 | 全部 F | 放行执行 |
| 需修订 | W-03 架构文档同步 | 需先核对 overall-plan 是否有平铺清单待改 | F-01 | 执行时确认 |
| 阻塞风险 | W-04/05/06 工程代码改造（P2/P3/P5 实现） | 涉及工程行为变更，需补证（断言降级路径、顺序来源 API、槽数组现状） | F-04/05/06 部分 inferred | 标 blocked，转后续课程 |
| 阻塞风险 | W-07 工程落四元组模板 | 优先级可选 | F-09 | 待用户定 |

**代码阶段判定：** `可交给 workflow-integration-plan`（文档施工）/ 工程代码改造 `不得进入本轮`。

**补证问题（未决，须用户确认后放行）**：
1. W-04/05/06 工程代码改造确认转入后续课程？（默认是）
2. 产品文档 BRD/PRD/SRSys 是否本轮落盘到 `docs/requirements/`？（默认仅四张清单）
