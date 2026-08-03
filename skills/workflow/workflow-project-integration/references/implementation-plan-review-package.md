# 实现方案审查包

> 本包由 `workflow-project-integration` 在代码前审查阶段产出，是 `workflow-final-review` 的唯一正式输入。不得以未引用工程证据的方案文字代替本包。

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
