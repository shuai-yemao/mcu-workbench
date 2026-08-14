# RCP：最终代码格式与必要注释整改闭环

| 字段 | 内容 |
|---|---|
| request_id | `REQ-FINAL-QUALITY-REMEDIATION-20260814` |
| 状态 | `可交接` |
| 项目路径 | `C:\Users\zhang\Documents\mcu-workbench` |
| 分支与提交 | `host_ai @ 341faf5b801f17e2a6ffffdc34821043cf0ebfd2` |
| 用户目标 | `user-confirmed`：最终门禁强制检查格式和注释；缺失时受限整改并复检后才放行；规则适用于 RCP 实施链路，而非仅 Codex。 |

## Agent 分析

| 角色 | 结论 | 可信等级 | 证据 |
|---|---|---|---|
| `embedded-lead` | 路由为 `workflow-requirements-router → workflow-review-gate → workflow-integration-plan → workflow-final-review`。 | `confirmed` | `skills/workflow/workflow-requirements-router/SKILL.md:95-98` |
| `verification-engineer` | 最终门禁已定义初检、受限整改、差异审阅和同条件复检；格式/注释问题以外不得自动修复。 | `confirmed` | `skills/workflow/workflow-final-review/SKILL.md:32-38` |
| `knowledge-engineer` | RCP、审查包和 BRD/PRD/SRSys 须落盘到本目录。 | `confirmed` | `skills/workflow/workflow-review-gate/SKILL.md:10-34` |

## 约束包

### 项目与软件环境

- `confirmed`：这是 Node.js 插件仓库；质量入口为 Jest、`scripts/validate-plugin.js`、`scripts/validate-skill-links.js` 和 `git diff --check`，见 `package.json`。
- `confirmed`：当前终端未提供 `npm`，本次使用桌面运行时的 `node.exe` 直接执行上述脚本。
- `not-applicable`：本任务不修改 MCU 固件、芯片、板卡、RTOS、DMA 或硬件资源；不得据此产生目标板验证结论。

### 功能与边界

1. `confirmed`：`workflow-final-review` 对最终代码/补丁/diff 强制执行格式与必要注释初检。
2. `confirmed`：初检失败时只允许格式化及补充/更正必要注释；不得改函数签名、控制流、常量/宏、数据结构、资源/错误路径、包含依赖或分层关系。
3. `confirmed`：整改前后必须审阅 `git diff`，并用同一工具和清单复检，同时执行 `git diff --check`；任一失败、工具不可用或检查不可复现即阻塞。
4. `confirmed`：`workflow-integration-plan` 必须在交接时携带 RCP、代码前门禁放行结论、文件施工表、验收表、格式规则/命令和允许整改范围。
5. `confirmed`：用户直接提交独立 diff 时允许没有上游 RCP，但必须显式记录该链路缺失，不能伪造。

### 非功能与验收

- `confirmed`：格式规则优先级为用户要求、已确认工程配置、相邻源码、插件 profile；无前三层覆盖时 profile 的 80 列规则生效。
- `confirmed`：报告必须保留初检、整改、差异审阅、复检命令/退出码以及静态、主机、构建、目标运行、实物证据边界。
- `confirmed`：本次源仓库验证为相关 Jest 19/19、插件结构校验、源仓库 Markdown 链接校验 308 文件和 `git diff --check`；均为静态/主机级证据。

## 风险、依赖与人工确认

- `confirmed`：工作区存在大量不属于本任务的修改、删除及未跟踪文件；本任务只审阅和修改本 RCP 列出的文件，不做清理或暂存。
- `confirmed`：本机 `.agents` Skill 镜像已完成 43 个 Skill 的安全同步，并生成备份；活动镜像含整改和交接规则。
- `unverified`：新的对话会话何时刷新已加载的 Skill 元数据由宿主决定；镜像文件已更新，但不把文件同步表述为已经完成会话级行为试运行。

## 下游提示词

必经下游：`workflow-review-gate`。审查只针对本 RCP 的插件工作流与运行镜像同步范围；不得将无关工作区变更、固件构建或目标板结果并入本请求。放行后由 `workflow-integration-plan` 交接给 `workflow-final-review` 执行最终审查。
