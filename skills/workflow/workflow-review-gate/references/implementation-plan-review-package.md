# 实现方案审查包

> 本包由 `workflow-review-gate` 在代码前审查阶段产出，是四张清单的审计记录；审查放行后，四张清单整合出的 `spec.md` 是下游 Skill 的正式需求/约束输入。`workflow-integration-plan` 后续生成的 `plan.md` 是经过用户选择和方案审查的实施计划输入。四张清单（工程现状表、文件施工清单、代码生成约束清单、验收测试清单）是每次审查的必选产出，并须同时分别输出为独立 Markdown 文件，落盘到已确认目标项目的 `<project_root>/00_Docs/04_需求文档/`，交付用户审查。不得以未引用工程证据的方案文字代替本包，也不得写入插件仓库内部。

## 文档落盘前置条件

- `项目路径与提交` 必须记录用户明确提供或 Router 已确认的目标项目绝对路径。
- 所有输出文件的根目录固定为 `<project_root>/00_Docs/04_需求文档/`；RCP、Review-Package、四张清单文件、`spec.md` 和集成计划均遵守该规则。
- 不得使用 Skill 目录、插件仓库、`process.cwd()` 或当前会话目录替代 `<project_root>`。
- 项目路径缺失、歧义或不可访问时，状态为 `待补证/阻塞`，一次只向用户询问项目绝对路径，不生成插件内占位文件。

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

## 0. 澄清回填记录

审查中发现的未决项必须通过**交互提问**向用户补证，一次只问当前最影响施工范围或验收的问题；不提问、不回填不得进入代码阶段。用户回答后：

1. 回填本表：补证项、决策、可信等级（标记 `user-confirmed`）、影响；
2. 同步回填 RCP 对应约束域——本表与 RCP **不可分叉**；
3. 未决项全部关闭且无未关闭阻塞项后，代码阶段判定方可放行。

| 补证项 | 决策 | 可信等级 | 影响 |
|---|---|---|---|
| `<待确认约束或事实>` | `<user decision>` | `user-confirmed` | `<scope effect>` |

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

只有实施相关事实均为 `confirmed` 或 `user-confirmed`，且四张表没有未关闭阻塞项时，才能选择前者。若发现新事实，退回 `workflow-review-gate` 更新本审查包。

## 5. 四份独立清单文件输出

四张清单必须保留在本 `Review-Package` 中，同时分别输出为以下四个 Markdown 文件。四个文件是面向用户审查和追踪的直接交付物，并在审查放行后整合为下游正式输入 `spec.md`：

| 清单 | 输出文件 | 必须包含 |
|---|---|---|
| 工程现状表 | `<request_id>-工程现状表.md` | 工程事实、证据位置、可信等级、影响范围、待确认项 |
| 文件施工清单 | `<request_id>-文件施工清单.md` | 新增/修改/不建议动、所属层、施工理由、生成边界、责任 Agent、状态 |
| 代码生成约束清单 | `<request_id>-代码生成约束清单.md` | 接口/依赖、禁止跨层调用、并发/ISR、生成文件边界、未决约束 |
| 验收测试清单 | `<request_id>-验收测试清单.md` | 证据等级、验收项、命令/条件、预期结果、责任 Agent、状态、产物/阻塞 |

每个独立文件的头部必须包含：

```text
request_id:
项目路径与提交:
审查状态:
输入 RCP:
已读工程证据:
可信等级约定:
```

四个文件必须与 `Review-Package` 同步更新；任何事实等级变化、新证据、阻塞关闭或验收状态变化，都必须同步回写对应清单和本包。目标项目路径缺失、歧义或不可访问时，不生成这四个文件，状态保持 `待补证/阻塞`。

## 6. 下游 `spec.md` 整合输出

四张清单审查完成后，必须将其整合为目标项目文档目录下的固定文件：

```text
<project_root>/00_Docs/04_需求文档/spec.md
```

`spec.md` 必须按以下顺序整合，并保留原清单 ID、证据位置、可信等级和状态：

1. 元数据、RCP 状态、澄清回填和质疑结论；
2. 工程现状与已确认事实；
3. 文件施工范围、所属层和责任 Agent；
4. 代码生成约束、禁止事项和资源/并发/ISR/DMA 边界；
5. 验收测试清单、证据等级、命令/条件和预期结果；
6. 可采用项、需修订项、阻塞风险和代码阶段判定；
7. 下游交接契约、未验证项和回传规则。

`spec.md` 只能由四张清单整合生成，不得引入清单之外的新需求或未标记的推测。门禁阻塞时可以生成状态为 `阻塞` 的审查草稿，但不得交给下游 Skill；只有门禁放行后，`spec.md` 才能作为正式施工输入。任何新事实或事实等级变化都必须先回写四张清单和本 `Review-Package`，再更新 `spec.md`。
