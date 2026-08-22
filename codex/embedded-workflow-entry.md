# 嵌入式工程 Router-first 接入材料

## 用途

将本材料复制或合并到使用 MCU-Workbench 的目标工程规则中，用于降低 Codex 直接进入具体实现 Skill 的概率，并为后续 Gate 检查提供统一记录字段。

本材料是项目级入口指导和记录模板，不是 Codex 宿主 Hook；它不能保证模型每次都自动选择 Router。

历史规则曾将用户审查拆为 RCP、Spec 和 Plan 三个闸门；当前 v1.0 统一从详细 Spec 开始，再审查并批准 Plan/方案选择。RCP、Review-Package 和 Final Review 不单独生成 Markdown；Plan 放行后，Task 生成、逐项实现与测试、最终 Verify 和内部 Final Review 采用 `auto_until_final_check` 连续推进。只有无法依据已批准 Spec/Plan 消除、且需要新增用户决策的硬阻塞才暂停。

当前 v1.0 文档契约覆盖并替代上述历史闸门说明：用户正式接收的文档只有 `spec.md`、`plan.md` 和 `task.md`；RCP、Review-Package 和 Final Review 只保存为内部 JSON/JSONL 状态。用户审查从 Spec 开始，Plan 批准后才生成 Task。Task 必须逐项实现并测试，所有 Task 完成后统一 Verify；Verify 对照 Spec 验收标准审查，发现偏差必须回到 Spec。

## 目标工程入口规则

```text
所有嵌入式需求必须先进入 workflow-requirements-router。
Router 首先读取项目根目录、分支/提交、芯片/板卡、构建配置、RTOS、相关源码和日志，形成 RCP。
在 RCP、Challenge、Review-Package 和放行的 spec.md 形成前，只允许只读分析和阻塞报告。
不得直接调用 Service、Platform、Impl、BSP、Vendor 或工具链实现 Skill 作为需求首入口。
```

## 必须保留的依赖方向

```text
App → Service → Platform 接口 ← Impl/BSP → Vendor/HAL
```

Codex 任务必须明确：

- 目标工程和实际文件证据；
- 当前任务属于需求、架构、实现、验证还是工具链阶段；
- 输入、输出、所有权、生命周期、阻塞属性和线程/ISR 上下文；
- 未确认事实和需要补证的项目条件；
- 内部状态、Spec、Plan、Task 和最终 Review 的交接状态。

## Gate 交付记录

后续 Gate 接口固定围绕以下字段检查：

| 字段 | 要求 |
|---|---|
| `request_id` | 与内部状态、Spec、Plan、Task 一致 |
| `stage` | 当前工作流阶段 |
| `status` | `missing`、`blocked`、`approved` 或实现/审查阶段状态 |
| `checked_files` | 实际检查的绝对路径或相对路径 |
| `blocking_reasons` | 缺失、过期、越界或需求变化原因 |
| `evidence_level` | `static`、`host`、`build`、`target` 或 `physical` |
| `next_action` | 下一步交接或补证动作 |

自动执行阶段还应记录：

- `execution_mode`：`auto_until_final_check`；
- `user_gates`：Spec、Plan 和硬阻塞例外的批准状态；
- `hard_blocker_policy`：例行失败自动诊断、修复和复测；新增决策才暂停。

以下情况必须阻塞交付：

- 内部状态或 Spec 缺失；
- Spec 未放行或 Plan/Task 与 Spec 版本不一致；
- 需求范围、接口、资源边界或验收标准发生变化但未重新走 Spec；
- 变更超出当前 Plan/Task 文件范围；
- 只有缓存一致性、插件安装或模型自述，没有流程状态证据。

## 证据分级

| 证据 | 能证明什么 | 不能证明什么 |
|---|---|---|
| 静态检查 | 文件、字段、依赖和规则满足契约 | Codex 真实首动作 |
| 主机测试 | Gate、错误路径和状态矩阵行为 | 目标板运行或宿主行为 |
| 构建/CI | 插件或工程在指定环境可重复检查 | 真实 Codex 已遵循入口 |
| Codex 会话记录 | 特定任务中的入口和写入行为 | 所有未来任务永不绕过 |
| 目标板/实物 | 固件运行、时序和硬件结果 | 插件工作流合规性 |

## 违规处理

如果 Codex 已经绕过 Router 并产生实现变更：

1. 保留当前工作区和会话记录；
2. 标记当前 Gate 为 `blocked`；
3. 记录首个有效动作、已写入文件和证据等级；
4. 回到 RCP/Challenge/Review Gate；
5. 不把已有实现变更追认成已完成的合规流程。

## 接入边界

- 本材料不修改目标固件工程；
- 不引入 HAL、RTOS、BSP、Driver 或芯片依赖；
- 不假设 Codex 存在未确认的 Hook、MCP 或写入拦截 API；
- 目标工程必须根据自身已有规则决定实际放置位置，并保留原有用户规则。
