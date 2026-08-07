# 实现方案审查包

> 本包由 `workflow-project-integration` 在代码前审查阶段产出，是 `workflow-final-review` 的唯一正式输入。四张清单（工程现状表、文件施工清单、代码生成约束清单、验收测试清单）是每次审查的必选产出，并须按第 5 节重组为 BRD/PRD/SRSys 三份正式产品文档输出到 `<project>/docs/requirements/`，交付用户审查，可直接作为产品管理正式文档。不得以未引用工程证据的方案文字代替本包。

## 元数据与输入

| 字段 | 内容 |
|---|---|
| request_id | `<RCP request_id>` |
| 项目路径与提交 | `<absolute path> @ <commit/branch>` |
| 审查状态 | `审查中` / `待补证` / `可交接` / `阻塞` |
| 输入 RCP | `<absolute path or artifact id>` |
| 既有需求实现方案 | `<absolute path or artifact id>` |
| 已读工程证据 | `<absolute path, command, log or configuration>` |
| 参与 Agent | `<embedded-lead + assigned specialist agents>` |

可信等级只能使用：`confirmed`、`user-confirmed`、`inferred`、`unverified`。所有 `inferred` 与 `unverified` 的实施相关项必须在本包末尾形成补证问题和阻塞项。

## 1. 工程现状表

| ID | 已知事实 | 证据（文件/配置/命令） | 可信等级 | 影响范围 | 待确认项或补证动作 |
|---|---|---|---|---|---|
| F-01 | `<fact>` | `<relative/path:line or command>` | `<confirmed>` | `<layer/file/test>` | `<none or next action>` |

## 2. 文件施工清单

| ID | 动作（新增/修改/不建议动） | 文件或目录 | 所属层 | 施工内容与理由 | CubeMX 可能覆盖项 | 前置事实 | 责任 Agent | 状态 |
|---|---|---|---|---|---|---|---|---|
| W-01 | `<新增>` | `<relative path>` | `<APP/Middleware/OS/BSP/Core/Driver>` | `<work and evidence>` | `<.ioc/generated file/USER CODE boundary/否>` | `<F-01>` | `<agent>` | `<ready/blocked>` |

禁止把 CubeMX 生成文件的 USER CODE 区域外修改列为可施工项；生成边界未知时必须标为 `blocked`。

## 3. 代码生成约束清单

| ID | 约束类别 | 已确认约束 | 证据 | 禁止事项 | 未决项 | 状态 |
|---|---|---|---|---|---|---|
| G-01 | `<接口/依赖/并发/ISR/生成边界>` | `<constraint>` | `<F-01>` | `<forbidden call or edit>` | `<none or question>` | `<ready/blocked>` |

至少覆盖允许接口与依赖、禁止跨层调用、并发/ISR 限制、生成文件与 CubeMX 边界；OSAL、Core 公共头或平台绑定缺失时必须写为未决，不得假定 API 可编译。

## 4. 验收测试清单

| ID | 证据等级 | 验收项 | 命令/条件 | 预期结果 | 责任 Agent | 当前状态 | 产物或阻塞项 |
|---|---|---|---|---|---|---|---|
| V-01 | `<静态/主机/构建/目标运行/实物>` | `<criterion>` | `<absolute cwd + command or hardware condition>` | `<observable pass condition>` | `<agent>` | `<not-run/pass/fail/blocked>` | `<artifact or blocker>` |

静态、主机、构建、目标运行和实物证据必须分开记录；较低等级证据不得代替较高等级结论。

## 审查结论与下一轮交接

| 分类 | 方案项 | 审查结论 | 证据或风险 | 所需动作 |
|---|---|---|---|---|
| 可采用 | `<proposal item>` | `<why it is valid>` | `<evidence>` | `<carry to checklist>` |
| 需修订 | `<proposal item>` | `<required correction>` | `<conflicting or incomplete evidence>` | `<revision>` |
| 阻塞风险 | `<proposal item>` | `<why code generation is prohibited>` | `<inferred/unverified fact>` | `<specific evidence question>` |

**代码阶段判定：** `可交给 workflow-final-review` / `不得进入代码阶段`。

只有实施相关事实均为 `confirmed` 或 `user-confirmed`，且四张表没有未关闭阻塞项时，才能选择前者。若发现新事实，退回 `workflow-project-integration` 更新本审查包。

## 5. 产品文档映射（BRD / PRD / SRSys）

四张清单保留在审查包内，作为插件后续流程（实现层 Skill 的施工边界、`workflow-final-review` 的验收依据）的唯一正式输入；三份产品文档把四张清单的内容重新组织为面向用户审查的正式文档，落盘 `<project>/docs/requirements/`，可直接作为产品管理正式文档：

| 产品文档 | 内容来源 | 输出文件 |
|---|---|---|
| BRD（商业需求文档） | 工程现状表 + RCP 项目背景/目标/价值 | `<request_id>-BRD.md` |
| PRD（产品需求文档） | 文件施工清单 + 代码生成约束清单 | `<request_id>-PRD.md` |
| SRSys（系统需求规格说明书） | 工程现状表 + 代码生成约束清单 + 验收测试清单（系统需求视角） | `<request_id>-SRSys.md` |

### BRD 章节骨架

1. 项目背景与目标（来自 RCP：项目背景、目标交付物）
2. 工程现状（工程现状表 F-xx：事实、证据位置、可信等级、影响范围）
3. 价值与非功能约束高层视图（来自 RCP：非功能约束、优先级）
4. 风险与依赖（阻塞项、依赖关系、待补证问题）

### PRD 章节骨架

1. 产品范围与优先级（功能需求、优先级、依赖关系）
2. 文件施工清单（W-xx：新增/修改/不建议动、所属层、CubeMX 可能覆盖项、责任 Agent、状态）
3. 需求约束与禁止事项（G-xx：接口/依赖/并发/ISR/生成边界、禁止调用或编辑项）
4. 范围外与已知未决项

### SRSys 章节骨架

1. 系统规格概述（芯片、板卡、软件环境、分层结构）
2. 功能需求（从已确认事实与约束提炼）
3. 非功能需求（性能、功耗、可靠性、安全）
4. 接口需求（OSAL、公共头、平台绑定）
5. 验收标准与测试方法（V-xx：五级证据静态/主机/构建/目标运行/实物，含命令/条件与预期结果）
6. 交付物与未验证项

三份文档与四张清单同步更新；任何事实等级变化或新证据必须回写本包。
