# 需求约束包（RCP）

## 1. 元数据

| 字段 | 内容 |
|---|---|
| request_id | `REQ-CODEX-ROUTER-GATE-20260819` |
| 生成时间 | `2026-08-19T00:00:00+08:00` |
| RCP 版本 | `v0.5` |
| RCP 状态 | `challenged` |
| 工作流状态 | `可交接` |
| 项目路径 | `C:\\Users\\zhang\\Documents\\mcu-workbench` |
| 分支/提交 | `host_ai @ 1652881d99578b8c45326d67ba455b6734df716f` |
| 目标交付物 | `spec.md、候选实施方案、plan.md、task.md、实现与回归验证` |

## 1.1 Spec 力度与风险

| 字段 | 内容 |
|---|---|
| `spec_rigor` | `full` |
| `spec_overlays` | `[versioned]` |
| 风险原因 | `涉及 Codex 宿主路由、Codex Manifest、AGENTS 约束、脚本、测试和 CI/交付门禁；错误修复可能导致所有嵌入式任务改变入口行为` |
| 最低交付物 | `spec.md + plan.md + task.md + 主机回归/静态校验/缓存一致性证据` |
| 升级触发条件 | `发现需要新增宿主运行时 Hook、MCP、外部应用权限或改变公共 Plugin Manifest 兼容字段时，回到 Review Gate` |
| 审批要求 | `review-gate` |

## 2. Agent 分析

| Agent | 分析范围 | 结论 | 证据 | 阻塞项 |
|---|---|---|---|---|
| `embedded-lead` | 协调、范围和交接 | 当前问题应拆为“入口指导”和“交付门禁”两层；本轮不修改代码 | 用户请求、`README.md:62-68` | none |
| `system-architect` | 宿主、Skill、Workflow 边界 | Codex Manifest 当前只声明 `skills/`；OpenCode 才有显式 Router 工具；不能把 Codex 侧当成已有运行时 Hook | `.codex-plugin/plugin.json:19`、`opencode.mjs:174-188`、`README.md:115-144` | Codex 是否提供可注册的宿主级拦截能力：当前不作为前提 |
| `firmware-engineer` | 代码入口、脚本和改动范围 | 目标是插件 JavaScript/Markdown/Manifest/测试，不涉及固件 C、HAL、RTOS 或 `embedded_framework` | `package.json:12-39`、`scripts/codex-local-dev.js:136-188` | none |
| `verification-engineer` | 回归、验收和证据等级 | 需要覆盖静态契约、主机测试、缓存刷新和三类真实 Codex 请求；真实 Codex 交互当前未执行 | `.github/workflows/ci.yml`、`tests/codex-plugin.test.js`、`tests/plugin-refresh.test.js` | 真实 Codex 会话证据未验证 |
| `toolchain-engineer` | Codex 安装、缓存和 CI | 当前源码与 Codex 缓存指纹一致，刷新不是现象根因；安装/刷新只作为发布验证 | `npm run plugin:check-refresh -- --json`、`scripts/check-codex-plugin-refresh.js:131-170` | none |
| `knowledge-engineer` | RCP、Spec、计划和运行记录 | 采用固定 `RCP → Review-Package → spec.md → plan.md → task.md` 交接 | `skills/workflow/*` 模板和流程规则 | none |

所有 Agent 本轮 `Changed files: none`；本 RCP、Review-Package 和 Spec 属于用户授权的需求文档产物，不是实现代码。

## 3. 可信等级约定

| 等级 | 含义 |
|---|---|
| `confirmed` | 已由当前仓库文件或可复现命令确认 |
| `user-confirmed` | 用户明确要求基于前一轮“两层门禁”方案继续，并确认本次允许扩大插件维护写入边界 |
| `inferred` | 根据现有证据推断，尚未由宿主会话直接确认 |
| `unverified` | 尚未验证，不能作为实现前提 |

## 4. 项目背景与目标

- 当前问题：Codex 有时直接选择具体嵌入式实现任务，未先经过 `workflow-requirements-router`。
- 受影响对象：使用 MCU-Workbench 的 Codex 嵌入式工程任务。
- 工程影响：可能跳过项目证据收集、RCP、Review Gate 和验收边界，导致直接修改代码或把低等级证据写成完成结论。
- 目标：降低 Router 被跳过的概率，并让未经过 RCP/Spec/Gate 的变更不能作为合规交付物放行。
- 成功标准：
  1. Codex 入口约束明确要求所有嵌入式任务先路由；
  2. 目标工程能获得项目级 Router/Gate 约束模板或明确接入方式；
  3. 缺失或未放行的 RCP/Spec 能被确定性检查发现；
  4. 对简单修改、架构设计、构建/调试三类任务形成可复现回归记录；
  5. 不把“Skill 被加载”表述成“Skill 一定被宿主执行”。
- 目标交付物：`spec.md`、候选实施方案、`plan.md`、`task.md`、实现变更、测试和运行记录。
- 直接范围：Codex Manifest/入口指导、Codex AGENTS 约束、项目级接入模板、RCP/Spec Gate 检查、测试、文档和发布验证。
- 本次用户确认的插件写入范围：`codex/`、Codex 适配测试、`scripts/`、`package.json`、`README.md`、`.github/workflows/` 和由脚本生成的 `AGENTS.override.md`；`.codex-plugin/plugin.json` 仍只有在 Schema 兼容性确认后才允许修改。
- 本次用户确认的测试处理：不恢复已删除的 BSP fixture，只删除 `tests/validate-bsp-contract.test.js` 中对这些 fixture 的过期引用；保留校验器实现和未涉及的测试。
- 本次用户确认的测试处理扩展：移除 `tests/embedded-framework-baseline.test.js` 测试入口，不同步 `tests/fixtures/embedded-framework` 快照。
- 本次用户确认的质量基线：将 `tests/quality-format-profile.test.js` 的 `ColumnLimit` 期望改为 `80`，保持当前 `.clang-format` 配置不变。
- 明确不包含：`embedded_framework` 固件代码、HAL/RTOS/BSP、目标板验证、OpenCode/Claude 行为重构、未经证据支持的 Codex 宿主 Hook。

## 5. 工程环境与约束

### 5.1 硬件资源

本需求不涉及 MCU、板卡、引脚、DMA、ISR、供电或目标硬件。可信等级：`confirmed`。

### 5.2 软件与工具链

| 项目 | 内容 | 证据 | 可信等级 | 影响 |
|---|---|---|---|---|
| 运行时 | Node.js CommonJS/ESM 混合包 | `package.json:5-10` | `confirmed` | 脚本和测试必须兼容当前运行方式 |
| 测试 | Jest，`npm test -- --runInBand` | `package.json:12-14`、`README.md:50-56` | `confirmed` | 主机回归入口 |
| 插件校验 | `npm run validate:plugin` | `package.json:28-31`、已执行命令 | `confirmed` | Skill/Agent/Manifest 静态门禁 |
| Codex 适配 | `.codex-plugin/plugin.json`、本地 Marketplace、受管缓存 | `.codex-plugin/plugin.json:1-37`、`scripts/codex-local-dev.js:136-188` | `confirmed` | 发布和缓存一致性验证 |
| CI | GitHub Actions 测试、插件校验、Codex 兼容产物校验 | `.github/workflows/ci.yml:1-44` | `confirmed` | 版本化交付门禁 |
| 真实宿主 | Codex Composer 会话 | 本轮未执行 | `unverified` | 需要人工/宿主回归证据 |

### 5.3 RTOS、实时性与资源

不涉及 FreeRTOS 任务、ISR、DMA、内存、实时性或固件运行时资源。插件脚本只处理文档、源码指纹、测试和流程状态；不得把目标固件资源约束引入本需求。

## 6. 分层与依赖约束

```text
用户需求 → Codex 宿主入口 → Router Skill → RCP/Challenge → Review Gate
                                                     ↓
                                  spec.md → plan.md → task.md → 实现 Skill
```

- Codex Manifest：只声明 Codex 可发现的插件能力，不假定存在未确认的宿主 Hook。
- `codex/AGENTS.md`：维护 Codex 专属入口约束；`AGENTS.override.md` 只能由脚本生成。
- Workflow Skill：负责需求约束、挑战、审查、计划和交接，不直接实现代码。
- Scripts：负责确定性检查、缓存一致性、兼容产物和运行记录。
- Tests/CI：负责静态和主机级门禁；不声称替代真实 Codex 会话验证。
- 禁止：修改 `common/`、Claude 适配、OpenCode 适配、目标固件工程或借助未确认宿主 API 强行阻断。

## 7. 功能需求

| ID | 需求 | 优先级 | 输入/触发 | 输出/结果 | 错误与恢复 | 可信等级 | 证据 |
|---|---|---|---|---|---|---|---|
| F-01 | 所有嵌入式任务必须把 Router 作为首阶段入口 | 必须 | Codex 用户请求 | 生成路由状态和 RCP 交接要求 | 无 Router 时只读并报告阻塞 | `user-confirmed` | `codex/AGENTS.md:16-24` |
| F-02 | 提供目标工程级接入约束 | 必须 | 固件工程根目录 | 可复制的 AGENTS/Gate 接入材料 | 路径或工程类型不明时保持待补证 | `user-confirmed` | 前一轮解决方案、`README.md:64-68` |
| F-03 | 未完成 RCP/Spec/Gate 的变更不得合规放行 | 必须 | RCP、Spec、变更文件 | 确定性 pass/fail/blocked 结果 | 阻止交付并指出缺少产物 | `user-confirmed` | `codex/AGENTS.md:16-19`、Review Gate 规则 |
| F-04 | 保留已有 Codex 缓存刷新和插件结构校验 | 必须 | 源码、Manifest、缓存 | 指纹一致、插件校验通过 | 差异时执行官方刷新流程 | `confirmed` | `scripts/check-codex-plugin-refresh.js:131-170` |
| F-05 | 建立三类任务的宿主回归矩阵 | 必须 | 简单修改、架构设计、构建/调试请求 | 首个动作、是否写入、Gate 状态记录 | 失败回到入口约束或门禁设计 | `user-confirmed` | 前一轮解决方案 |

## 8. 非功能约束

| 类别 | 约束 | 验收方式 | 可信等级 | 未决项 |
|---|---|---|---|---|
| 兼容性 | 保留现有 Skill ID、别名、Manifest 结构和 OpenCode 独立边界 | Jest、插件校验、版本检查 | `confirmed` | 无 |
| 可验证性 | 静态、主机、缓存和真实宿主证据必须分开 | Review-Package 验收表 | `user-confirmed` | 真实宿主回归待执行 |
| 可回滚 | 入口指导和 Gate 变更必须可按文件回滚 | Git diff、分支回滚演练 | `user-confirmed` | 无 |
| 可维护性 | 规则单一事实源，不复制多份互相漂移的 Router 流程 | 链接/内容一致性测试 | `confirmed` | 模板落点待方案确定 |
| 可靠性 | 缓存刷新失败不得直接覆盖受管缓存 | 现有 refresh 测试和脚本审查 | `confirmed` | 无 |
| 宿主行为 | 不承诺 Codex 一定执行 Skill；必须记录“指导层”和“确定性门禁层”的差异 | 宿主回归报告 | `unverified` | 真实会话回归 |

## 9. 优先级、依赖与阻塞

| ID | 项目 | 类型 | 前置条件 | 外部依赖 | 并行关系 | 状态 |
|---|---|---|---|---|---|---|
| D-01 | 入口约束和目标工程接入材料 | 必须 | Spec 放行 | Codex 当前 AGENTS/Plugin 能力 | 串行起点 | open |
| D-02 | RCP/Spec/Gate 确定性检查 | 必须 | D-01 范围确认 | 目标工程文档状态和 Git 变更 | 可与 D-03 并行设计 | open |
| D-03 | 三类 Codex 宿主回归矩阵 | 必须 | 验收协议确认 | 可运行的 Codex Composer | 可与 D-02 并行准备 | open |
| D-04 | CI/发布和缓存一致性接线 | 必须 | D-02、D-03 | GitHub Actions、Codex Marketplace | 串行收口 | open |

## 10. 人工补证记录

| ID | 类别 | 问题 | 为什么需要 | 推荐 | 用户回答 | 可信等级 | 回填字段 | 状态 |
|---|---|---|---|---|---|---|---|---|
| Q-01 | scope | 是否按前一轮“两层方案”（项目级入口指导 + RCP/Spec/Gate 交付门禁）继续，并将 `mcu-workbench` 作为本次插件目标仓库？ | 决定 Spec 的直接范围和文档落点 | 继续该方案，目标仓库为当前 `mcu-workbench` | 用户当前请求已明确要求依据该方案直接进入 Spec 工作流 | `user-confirmed` | 项目背景、直接范围、目标交付物 | 已回填 |
| Q-02 | scope-boundary | 是否允许把 `README.md`、`scripts/`、`package.json` 和 `.github/workflows/` 纳入方案 A 的插件维护范围？ | 决定确定性 Gate、命令入口、文档和 CI 是否可落地 | 允许纳入，但继续排除固件和其他宿主 | 用户明确回复“确定” | `user-confirmed` | 文件施工范围、计划和任务单 | 已回填 |
| Q-03 | test-scope | 是否不恢复已删除 BSP fixture，而删除 `tests/validate-bsp-contract.test.js` 中引用它们的测试段？ | 决定 T-03 是恢复测试输入还是清理过期测试引用，并影响覆盖率 | 删除过期引用，不修改校验器实现 | 用户明确要求“将引用这些js部分删除就好” | `user-confirmed` | T-03 范围、验收和覆盖风险 | 已回填 |
| Q-04 | test-scope | 是否同时移除 `tests/embedded-framework-baseline.test.js` 测试入口，不同步缺失的 embedded-framework 快照？ | 决定该基准测试是否继续纳入 Jest | 移除测试入口，保留快照缺失事实和覆盖减少记录 | 用户明确要求“embedded-framework-baseline.test.js这个也不要引用” | `user-confirmed` | T-03 范围、验收和覆盖风险 | 已回填 |
| Q-05 | quality-baseline | 是否将质量 profile 测试的 `ColumnLimit` 期望改为 `80`？ | 决定测试是否与当前格式配置一致 | 修改测试期望，保留当前配置 | 用户明确要求“ColumnLimit: 80以这个为测试期望” | `user-confirmed` | T-03 质量基线验收 | 已回填 |

## 11. 验收标准与验证边界

| ID | 证据等级 | 验收项 | 命令/条件 | 预期结果 | 责任 Agent | 状态 | 产物/阻塞 |
|---|---|---|---|---|---|---|---|
| V-01 | 静态 | Manifest、AGENTS、Router 入口和禁止边界一致 | `npm run validate:plugin`，cwd=`C:\\Users\\zhang\\Documents\\mcu-workbench` | exit code 0 | `verification-engineer` | not-run | 插件校验输出 |
| V-02 | 主机 | RCP/Spec/Gate 状态检查覆盖缺失、阻塞和放行 | `npm test -- --runInBand`，cwd=`C:\\Users\\zhang\\Documents\\mcu-workbench` | 新增测试全部通过 | `verification-engineer` | not-run | Jest 报告 |
| V-03 | 主机 | 现有 Codex refresh 不因新入口材料失效 | `npm run plugin:check-refresh -- --json --strict` | 源码和缓存指纹一致；差异时明确 refresh_required | `toolchain-engineer` | not-run | JSON 报告 |
| V-04 | 主机 | Codex 兼容桥接产物可重复生成 | `npm run build:codex-compat; git diff --exit-code` | 无未预期生成差异 | `toolchain-engineer` | not-run | `AGENTS.override.md` diff |
| V-05 | 真实宿主 | 简单修改请求先输出 Router/RCP 状态，写入前不进入实现 | 新建 Codex 任务并保留会话记录 | 首个有效动作符合入口协议 | `verification-engineer` | blocked | 需要 Codex Composer |
| V-06 | 真实宿主 | 架构请求和构建/调试请求同样不跳过 Router | 新建两类 Codex 任务并保留会话记录 | 三类任务均可追溯 | `verification-engineer` | blocked | 需要 Codex Composer |
| V-07 | 交付 | 未放行 Gate 的变更不能通过交付检查 | 构造缺 RCP、缺 Spec、blocked、approved 四类 fixture | 结果分别为 blocked/blocked/blocked/pass | `verification-engineer` | not-run | Gate 检查报告 |

## 12. 目的质疑

- 需求描述的是问题还是预设手段：问题是 Codex 偶发跳过嵌入式插件入口；“项目级 AGENTS + Gate”是解决方向，不是唯一实现手段。
- 真实问题与价值：减少无证据直接改动，并使绕过行为至少不能形成合规交付。
- 不实施的风险：继续依赖模型自选 Skill，无法稳定满足 Router-first 约束。
- 成功标准是否可测量：可以通过静态契约、Gate 状态检查和三类真实会话首动作记录测量；绝对“零跳过”当前不可承诺。
- 更小范围替代方案：只强化 Prompt/AGENTS 可以降低概率，但不能形成确定性交付阻断，因此不作为完整方案。
- 目的结论：`user-confirmed`

## 13. 可行性质疑

- 已确认前提：现有 Router/Challenge/Review Gate Skill 已存在；Codex Manifest、AGENTS 兼容桥、缓存指纹和 CI 入口已存在。
- 架构与依赖风险：Codex 侧不能复用 OpenCode 的运行时 Router 工具；不得把 OpenCode 代码直接改造成 Codex 入口。
- 宿主风险：Codex 是否允许插件注册宿主级写入 Hook 未由当前仓库确认，不能作为方案前提。
- 验收缺口：真实 Codex Composer 首动作和未放行变更阻断尚未执行。
- 可行性结论：`有条件可行`；可以确定性实现指导材料、状态检查和交付门禁，但不能在未确认宿主 API 前承诺编辑前硬拦截。

## 14. 质疑结论与交接判定

```text
purpose_conclusion: user-confirmed
feasibility_conclusion: 有条件可行
scope_conclusion: 第一版范围与非目标已清晰；不承诺未经证实的 Codex 宿主 Hook
acceptance_gaps: 真实 Codex 会话回归、目标工程接入演练、Gate 与实际交付链路验证
unresolved_risks: 目标工程如何接收项目级 AGENTS/Gate 材料；是否需要修改 Codex Manifest；移除测试入口后的覆盖减少
required_review_gate_checks: 扩大后的文件写入边界、测试入口移除和质量期望变更是否明确、Codex/Claude/OpenCode 隔离、Gate 状态模型、CI 兼容性、回滚和宿主回归证据
handoff_status: 待重新 Review Gate
```

## 15. 下游交接

- 必经下游：`workflow-review-gate`
- 集成规划：`workflow-integration-plan`
- 实现 Skill：RCP 完成前为空；放行后由集成规划分发
- 输入证据：当前插件源码、Manifest、AGENTS、测试、CI 和 Codex refresh 报告
- 必须遵守：只解决 Codex 入口与交付门禁，不改固件工程和其他宿主适配
- 禁止事项：把模型提示写成硬件验证；假定 Codex Hook；绕过 Spec 直接改代码
- 输出要求：Review-Package、正式 `spec.md`、两方案比较、用户选择后的 `plan.md`
- 验收要求：静态、主机、缓存一致性、CI 和真实宿主证据分级记录
- 交接状态：`可交接`

## 16. 当前下一步

- 当前变化：用户确认清理已删除 BSP fixture 的 JS 引用，已完成 RCP/Spec/Plan/Task v0.3 升版
- 当前唯一动作：交给 `workflow-task-execution` 恢复 T-03 的测试引用清理
- 阻塞项：真实 Codex 宿主回归属于后续验收，不阻塞 Spec 形成；宿主级 Hook 不作为第一版前提
