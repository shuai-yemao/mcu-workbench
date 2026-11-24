# MCU Workbench Observability 插件物理迁移计划

> 本计划对应 spec.md v0.2，采用用户选择的方案 B：物理目录迁移优先。本轮只覆盖第二个插件 mcu-workbench-observability。

## 1. 元数据与状态

| 字段 | 内容 |
|---|---|
| request_id | REQ-PLUGIN-SPLIT-20261123 |
| 生成时间 | 2026-11-24T00:00:00+08:00 |
| 计划版本 | v0.2-observability-physical-migration |
| 计划状态 | approved |
| 项目路径 | C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai |
| 分支/提交 | host_ai；当前工作区存在用户未跟踪目录，未修改 |
| 输入 spec.md | C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\spec.md |
| 输入 Review-Package | codex/plugin-split/spec.md 四张审查清单及既有 T-001～T-010 证据 |
| Spec 力度 | full |
| 风险叠加门禁 | versioned |
| 选定方案 | 方案 B：物理目录迁移优先 |
| 方案选择人 | user |
| 用户审查状态 | approved |
| 方案审查结论 | 通过 |

## 2. 一句话说明

- 要解决的问题：现有调试与运行时观测能力仍与单一插件目录绑定，无法独立发现、版本化和验证。
- 计划做什么：建立 mcu-workbench-observability 插件目录，迁移 canonical observability Skill 和归属明确的外部 Skill，生成 Codex/Cursor manifest，并保留旧聚合入口与 alias。
- 明确不做什么：不迁移 architecture、verification、devops、hardware；不新增具体上位机协议；不验证 Claude/OpenCode、热加载或动态卸载。
- 预期结果：Codex 与 Cursor 可分别发现 observability 插件；旧入口仍可路由到迁移后的 Skill；链接、catalog、版本和回滚测试通过。

## 3. 输入依据与工程事实

| ID | 事实或约束 | 证据 | 可信等级 | 对计划的影响 |
|---|---|---|---|---|
| E-01 | Skill 注册事实源为 catalog metadata + catalog | skills/catalog-metadata.js、skills/catalog.js | confirmed | 迁移必须同步注册、alias 和聚合视图 |
| E-02 | 当前 Codex/Cursor manifest 仍指向单一 skills 根目录 | .codex-plugin/plugin.json、.cursor-plugin/plugin.json | confirmed | 需要新增 observability 入口，并保留聚合入口 |
| E-03 | canonical observability 能力为 tools-debug、tools-observability | skills/catalog-metadata.js | confirmed | 作为首批物理迁移对象 |
| E-04 | 外部候选包含调试、串口、RTT、逻辑分析等目录 | codex/plugin-split/external-skill-inventory.yaml、skill-ownership-matrix.md | confirmed（候选存在）；元数据部分 unverified | 只迁移 observability 归属明确的条目 |
| E-05 | Codex/Cursor 是本轮唯一宿主验收范围 | 用户确认、spec.md E-15 | user-confirmed | 不以 Claude/OpenCode 结果阻塞本轮 |
| E-06 | 旧入口和 alias 必须保持兼容 | spec.md G-01、G-07 | user-confirmed | 先建立新入口，再切换聚合视图，最后验证回滚 |
| E-07 | 工作区有未跟踪 .playwright-cli/、.pnpm-store/ | git status --short | confirmed | 施工不得触碰或纳入变更 |

## 4. 方案记录

### 方案 A：兼容适配优先

保留原目录，以 descriptor、catalog projection、alias 和 external adapter 形成插件边界。优点是改动小、回滚容易；缺点是物理独立性不足。本方案未选用。

### 方案 B：物理目录迁移优先（已选）

- 主要改动：新增 plugins/mcu-workbench-observability/，迁移 tools-debug、tools-observability 和归属明确的外部 Skill；更新 Codex/Cursor manifest、catalog、alias、版本和测试。
- 优点：边界清晰，后续独立发布和继续拆分更直接。
- 缺点：目录引用和兼容路径改动较多，需要完整链接、宿主和回滚验证。
- 回滚：保留迁移前源目录和映射，切回旧聚合 manifest 和 catalog projection，不删除原始内容直到最终 Verify 通过。

### 方案对比

| 维度 | 方案 A | 方案 B | 结论依据 |
|---|---|---|---|
| 改动范围 | 小 | 中 | 当前目录与 manifest 结构 |
| 实现复杂度 | 低 | 中 | 需同步目录、链接和 catalog |
| 物理独立性 | 中 | 高 | 用户选择 B |
| 宿主风险 | 低 | 中 | Codex/Cursor manifest 需分别验证 |
| 可验证性 | 中 | 高 | 可对新插件目录独立运行静态/主机检查 |
| 回滚难度 | 低 | 中 | 迁移前不删除源内容 |
| 后续扩展性 | 中 | 高 | 后续插件可复用目录/manifest 结构 |

### 用户选择

selected_option: B
decision_owner: user
decision_rationale: 用户选择物理目录迁移优先，以形成真实独立的第二个插件边界。
rejected_option: A
new_constraints: 外部 Skill 允许作为 observability 插件迁移对象，但未知来源/版本/许可证/依赖必须显式保留未验证状态。

## 5. 选定方案概览

- 施工边界：observability manifest、目录、canonical Skill、归属明确的外部 Skill、catalog/alias、Codex/Cursor 适配、测试和回滚。
- 非目标：其他四个插件、hardware、具体上位机协议、Claude/OpenCode、热加载/动态卸载。
- 主要风险：外部 Skill 元数据不完整；原始 Markdown 相对链接可能需要重写；旧入口切换可能产生重复注册。

## 6. 分层、调用链与接口边界

Host（Codex/Cursor） → observability plugin manifest → Skill descriptor/catalog → tools-debug/tools-observability → external adapter/source

- 插件只承载宿主发现、Skill 注册、alias、descriptor 和观测能力边界。
- 不把具体设备协议、串口权限或硬件实测结果写入插件契约。
- 外部 Skill 通过 descriptor/alias/adapter 接入，不修改原始外部 Skill 语义。
- 旧聚合入口只负责兼容路由，不复制 Skill 内容，不承载 observability 业务状态。
- 本轮不新增 RTOS 任务、ISR、DMA、硬件资源或固件调用链；生命周期只采用静态组合、显式生命周期和重启加载。

## 7. 文件施工顺序

| ID | 阶段 | 动作 | 文件或目录 | 所属层 | 施工内容与理由 | 责任 Skill | 前置条件 | 状态 |
|---|---:|---|---|---|---|---|---|---|
| P-01 | 1 | 新增 | plugins/mcu-workbench-observability/ | 插件宿主适配 | 建立目录、manifest、版本和最小 descriptor | workflow-integration-plan | Spec/Plan 已批准 | ready |
| P-02 | 2 | 迁移 | skills/tools/tools-debug、skills/tools/tools-observability | observability | 迁移 canonical Skill 并修复内部链接 | tools-observability | P-01 | ready |
| P-03 | 2 | 迁移/登记 | observability 归属明确的外部 Skill | external adapter | 迁移外部 Skill，记录来源和未验证元数据 | tools-observability | P-01 | ready |
| P-04 | 3 | 修改 | skills/catalog.js、skills/catalog-metadata.js、lib/agent-domains.js | 注册与路由 | 建立插件级 catalog projection，保留旧 alias | workflow-integration-plan | P-02/P-03 | ready |
| P-05 | 3 | 修改 | .codex-plugin/、.cursor-plugin/、版本同步脚本 | 宿主适配 | 新增 observability 表面并保留聚合入口 | tools-build | P-01/P-04 | ready |
| P-06 | 4 | 新增/修改 | tests/、scripts/、codex/plugin-split/artifacts/ | 验证 | 执行链接、catalog、版本、宿主和回滚检查 | tools-verification | P-05 | ready |
| P-07 | 5 | 检查 | 全部本轮变更 | 最终门禁 | 对照 Spec 执行 Verify，随后交最终 Review | workflow-final-review | P-06 | ready |

## 8. 阶段计划与交接

| 阶段 | 目标 | 输入 | 输出 | 完成条件 | 交接对象 |
|---|---|---|---|---|---|
| 1 | 建立插件骨架 | Spec、现有 manifest | observability descriptor/manifest | schema 和版本检查通过 | tools-observability |
| 2 | 迁移 canonical 与外部 Skill | 插件骨架、inventory、矩阵 | 新目录 Skill 与迁移记录 | 链接和归属检查通过 | workflow-integration-plan |
| 3 | 接通注册和宿主 | 新目录、catalog | Codex/Cursor 表面、alias、聚合入口 | 两宿主静态/主机检查通过 | tools-verification |
| 4 | 回归与最终检查 | 全部变更、Spec | 报告、哈希、Verify 记录 | Spec 验收项通过 | workflow-final-review |

## 8A. 下游执行 Agent 与 Skill 基线

| 阶段/ID | 主 Agent | 协作 Agent | 主实现 Skill | 辅助 Skill | 分配理由与证据 | 状态 |
|---|---|---|---|---|---|---|
| P-01 | embedded-lead | system-architect | workflow-integration-plan | tools-quality | 插件边界和 descriptor 契约 | ready |
| P-02 | embedded-lead | knowledge-engineer | tools-observability | tools-quality | 观测 Skill 语义与链接迁移 | ready |
| P-03 | embedded-lead | knowledge-engineer | tools-observability | tools-verification | 外部 Skill 归属和适配 | ready |
| P-04 | system-architect | embedded-lead | workflow-integration-plan | tools-git | catalog/alias/兼容边界 | ready |
| P-05 | toolchain-engineer | verification-engineer | tools-build | tools-quality | Codex/Cursor manifest 和版本脚本 | ready |
| P-06 | verification-engineer | toolchain-engineer | tools-verification | tools-quality | 静态、主机、版本、链接和回滚证据 | ready |
| P-07 | embedded-lead | verification-engineer | workflow-final-review | tools-quality | 最终 Verify 与质量闭环 | ready |

## 9. 资源、并发与生命周期约束

- 不新增目标板任务、RTOS 任务、ISR、DMA、队列、锁或固件内存资源。
- 插件注册使用显式 descriptor；重复加载必须可检测，dispose/回滚必须幂等。
- 迁移期间保留原始目录和旧入口，直到 P-07 通过；禁止对未确认目标执行删除。
- 外部 Skill 的来源、许可证、版本和依赖未知时只能标记 unverified/blocked，不得删除或伪造元数据。

## 10. 代码生成约束

| ID | 约束类别 | 必须遵守 | 禁止事项 | 证据 | 状态 |
|---|---|---|---|---|---|
| G-01 | 兼容 | 新入口先建立，旧入口最后切换并保留回滚 | 直接删除旧入口或 alias | Spec G-01/G-07 | ready |
| G-02 | 外部 Skill | 只迁移 observability 归属明确条目，保留来源和状态 | 按目录名猜测归属、伪造来源 | Spec E-14、inventory | ready |
| G-03 | 链接 | 内部链接指向新插件内真实目标；外部链接显式登记 | 静默排除坏链接或关闭校验器 | validate:links | ready |
| G-04 | 宿主 | Codex/Cursor 分别验证 manifest、Skill、命令和 alias | 用单宿主结果替代另一宿主 | Spec E-15/V-04 | ready |
| G-05 | 范围 | 只修改 observability 和必要共享注册/测试文件 | 顺带迁移 architecture/verification/devops/hardware | Spec 本轮范围 | ready |

## 11. 验收与验证计划

| ID | 证据等级 | 验收项 | 命令/条件 | 预期结果 | 责任 Skill | 状态 |
|---|---|---|---|---|---|---|
| V-01 | static | observability 目录、manifest 和 Skill 归属 | node scripts/validate-plugin.js，cwd 为仓库根 | 无新增孤儿/重复 Skill | tools-quality | not-run |
| V-02 | static | Markdown 内部链接 | node scripts/validate-skill-links.js | 新目录链接全部可解析，外部依赖显式登记 | tools-quality | not-run |
| V-03 | host | catalog、alias、descriptor 和重复注册 | npm test -- --runInBand 及新增 observability 测试 | 新旧调用名解析稳定，重复注册被拒绝 | tools-verification | not-run |
| V-04 | host | Codex/Cursor manifest 与 Skill 表面 | 本地 Codex/Cursor 分别加载 observability 插件 | 两宿主均可发现 observability | tools-verification | not-run |
| V-05 | host | 外部 Skill adapter | descriptor/fake/contract test，不连接真实硬件 | 归属明确条目可调用，原始内容未被改写 | tools-verification | not-run |
| V-06 | host | 回滚和旧聚合入口 | 切回旧 manifest/catalog projection 并执行代表性 alias | 旧入口可恢复，用户文件不丢失 | tools-verification | not-run |
| V-07 | build/script | 版本一致性 | npm run check:versions | package、Codex、Cursor 版本符合约束 | tools-build | not-run |
| V-08 | final | Spec 对照 Verify 与 diff/格式检查 | git diff --check、最终 Verify、tools-quality final-gate | 无新增门禁问题，未验证项单独列出 | workflow-final-review | not-run |

## 12. 方案审查记录

| 审查项 | 责任 Agent | 结论 | 证据 | 后续动作 |
|---|---|---|---|---|
| 分层和接口 | system-architect | 可采用 | observability 仅负责观测能力注册，不改变固件分层 | 按 P-01/P-04 执行 |
| 文件和数据流 | firmware-engineer | 可采用 | 当前为 Skill/manifest/catalog 数据流，无目标固件数据流 | 保持无硬件资源变更 |
| 验收和回归 | verification-engineer | 可采用 | validate:plugin、validate:links、Jest、Codex/Cursor smoke | P-06 生成报告 |
| 硬件边界 | hardware-integration | 不适用 | 本轮不做真实硬件或固件修改 | 不新增硬件验收声明 |
| 工具链和产物 | toolchain-engineer | 可采用 | 现有 npm scripts、Codex/Cursor manifest | 记录绝对 cwd、退出码和产物 |

### 审查结论

- 可采用项：方案 B 的物理插件边界、外部 Skill 受控迁移、旧入口兼容、Codex/Cursor 分宿主验证。
- 已完成修订：将总体五插件计划收窄为 observability 单插件；将外部 Skill 从不可迁移修订为可迁移但元数据不完整需显式隔离。
- 未关闭阻塞：外部 Skill 的具体来源/版本/许可证/依赖仍可能为 unverified；不阻塞归属明确条目的适配，但阻塞审计完成声明。
- 是否改变 spec.md：否。
- 最终结论：通过。

## 13. 回滚与失败处理

- 迁移失败：保留原始目录，撤销新插件 manifest/catalog projection，恢复旧聚合入口。
- 链接失败：停止后续迁移，记录具体 relative/path:line，只修复迁移范围内链接。
- 宿主失败：保留新目录但不切换默认入口，回传 observability plan/task，不扩大到其他插件。
- 测试失败：先诊断当前 Task；若发现范围、接口或验收变化，回到 Spec；不得在最终 Verify 中扩大功能修复。

## 14. 下游交接

- 正式需求/约束输入：C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\spec.md
- 正式实施计划：C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\plan.md
- 阶段级 Agent/Skill 基线：本文件第 8A 节
- 任务拆解：交给 workflow-task-breakdown
- 执行规则：交给 workflow-task-execution，采用 auto_until_final_check
- 禁止扩大：不得迁移其他插件、hardware、Claude/OpenCode 或真实上位机协议
- 实现完成后：交接 workflow-final-review
- 未验证项：外部 Skill 元数据完整性、热加载/动态卸载、Claude/OpenCode 宿主
- 回传规则：改变 Spec 范围/接口/验收时回到 workflow-review-gate；实现细节问题回到本 Plan/Task 链路

## 15. 当前状态与下一步

- 当前状态：approved
- 当前唯一动作：生成 observability 专属 task.md，随后进入任务执行
- 阻塞项：无影响本轮开始的硬阻塞；外部元数据未知项在迁移审计中保持显式未验证

## 16. OpenCode 活动宿主清理补充方案（2026-11-24）

### 范围与决策

- 输入：Spec v0.3 的 user-confirmed OpenCode 清理补充范围。
- 决策：仅移除旧聚合插件仍活动的 OpenCode 集成表面；历史 `.mcu-workbench/workflows/` 和拆分文档中的记录不改写。
- 保留：Claude/Codex/Cursor 宿主文件、共享 Agent/catalog/Skill 能力及其通用领域关键词行为。
- 实际受控范围：`package.json`、`package-lock.json`、`opencode.json`、`opencode.mjs`、`scripts/build-opencode-commands.js`、`lib/opencode-quality-hook.js`、`.opencode/commands/`、OpenCode 专属测试、`scripts/check-codex-plugin-refresh.js` 中 OpenCode 文件路径，以及活动用户文档中当前支持声明。
- 不删除 `.mcu-workbench/workflows/` 等历史审计记录，也不修改已完成的 observability 插件目录。

### 执行和验证

| 阶段 | 主 Agent | 主 Skill | 验收 |
|---|---|---|---|
| P-08 OpenCode 活动集成清理 | embedded-lead | workflow-task-execution | 活动代码/清单/脚本不再引用 OpenCode；旧 OpenCode 专属文件已移除；npm manifest 与 lock 保持一致；历史记录保留 |
| P-09 变更范围复核 | embedded-lead | workflow-final-review | diff 仅覆盖本补充范围；JSON 解析、Node 语法和 `git diff --check` 通过；不运行 Jest（用户未要求测试） |

### 回滚

- 通过 Git diff 恢复本补充范围内删除的 OpenCode 专属文件和包元数据。
- 不触碰 `.mcu-workbench/` 历史记录、Codex/Cursor 文件或既有 observability 插件。

### 状态

- Spec 依据：`v0.3-opencode-host-removal`，user-confirmed / review-gate-approved。
- 本计划：approved。
- 当前动作：执行 T-008，随后完成静态差异复核并回写结果。
