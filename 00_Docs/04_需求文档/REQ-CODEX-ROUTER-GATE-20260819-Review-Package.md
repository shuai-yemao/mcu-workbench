# 实现方案审查包：Codex Router-first 与交付门禁

## 元数据与输入

| 字段 | 内容 |
|---|---|
| request_id | `REQ-CODEX-ROUTER-GATE-20260819` |
| 项目路径与提交 | `C:\\Users\\zhang\\Documents\\mcu-workbench @ host_ai / 1652881d99578b8c45326d67ba455b6734df716f` |
| 审查状态 | `可交接` |
| 输入 RCP | `REQ-CODEX-ROUTER-GATE-20260819-RCP.md` |
| 既有需求实现方案 | `前一轮“两层方案”：项目级入口指导 + RCP/Spec/Gate 交付门禁` |
| 已读工程证据 | `README.md、CONTEXT.md、codex/AGENTS.md、.codex-plugin/plugin.json、opencode.mjs、scripts/codex-local-dev.js、scripts/check-codex-plugin-refresh.js、tests/codex-plugin.test.js、tests/codex-local-dev.test.js、tests/plugin-refresh.test.js、.github/workflows/ci.yml、npm run validate:plugin、npm run plugin:check-refresh -- --json` |
| 参与 Agent | `embedded-lead、system-architect、firmware-engineer、verification-engineer、toolchain-engineer、knowledge-engineer` |

## 0. 澄清回填记录

| 补证项 | 决策 | 可信等级 | 影响 |
|---|---|---|---|
| Q-01：目标与方案方向 | 用户要求依据前一轮“两层方案”直接进入 Spec 工作流，目标为当前 `mcu-workbench` 插件仓库 | `user-confirmed` | 允许形成 full Spec；计划仍需在 Spec 放行后比较候选方案 |
| Q-02：插件写入边界 | 用户确认允许将 `README.md`、`scripts/`、`package.json` 和 `.github/workflows/` 纳入方案 A；固件工程和其他宿主仍排除 | `user-confirmed` | 解除 T-01/T-02/T-04 的范围阻塞；需重新升版 Spec 和计划状态 |
| Q-03：过期 fixture 引用 | 用户确认不恢复已删除 BSP fixture，删除 `tests/validate-bsp-contract.test.js` 中引用这些 fixture 的测试段 | `user-confirmed` | T-03 改为测试引用清理；必须记录覆盖减少，不修改校验器实现 |
| Q-04：基准测试入口 | 用户确认移除 `tests/embedded-framework-baseline.test.js`，不同步缺失的 `tests/fixtures/embedded-framework` 快照 | `user-confirmed` | T-03 删除该测试入口；必须记录基准覆盖移除 |
| Q-05：质量 profile 期望 | 用户确认将 `tests/quality-format-profile.test.js` 的 `ColumnLimit` 期望改为 `80`，保持现有 profile 不变 | `user-confirmed` | 解除质量 profile 基线阻塞；不修改 `.clang-format` |

## 1. 工程现状表

| ID | 已知事实 | 证据 | 可信等级 | 影响范围 | 待确认项或补证动作 |
|---|---|---|---|---|---|
| F-01 | Codex Manifest 当前只声明 `skills/` | `.codex-plugin/plugin.json:19` | `confirmed` | Codex 入口能力 | 计划阶段确认是否需要 Manifest 字段变化 |
| F-02 | Codex AGENTS 规则要求先 Router、再 RCP/Review Gate | `codex/AGENTS.md:16-24` | `confirmed` | 入口指导 | 真实 Codex 是否稳定加载需宿主回归 |
| F-03 | OpenCode 有显式 Router 工具 | `opencode.mjs:174-188` | `confirmed` | 宿主差异 | Codex 不得假设拥有同等运行时工具 |
| F-04 | Codex 本地开发脚本会校验、注册 Marketplace、安装并检查缓存 | `scripts/codex-local-dev.js:127-188` | `confirmed` | 发布/刷新 | 不作为跳过根因 |
| F-05 | 当前源码与 Codex 缓存指纹一致 | `npm run plugin:check-refresh -- --json` | `confirmed` | 排除缓存陈旧 | 仅证明内容一致，不证明宿主执行 Skill |
| F-06 | 当前 CI 有 Jest、插件校验、链接、版本、分层和 Codex 兼容检查 | `.github/workflows/ci.yml:8-44` | `confirmed` | 交付门禁 | 需要评估新增 Gate 校验接入点 |
| F-07 | 真实 Codex 会话首动作未采集 | 本轮未执行 | `unverified` | 宿主验收 | 作为 V-05/V-06 的后续验证，不伪称已通过 |
| F-08 | 目标工程级 AGENTS/Gate 接入材料当前没有确认落点 | 当前插件目录与 README | `unverified` | 计划文件范围 | 由 T-01 形成材料，目标工程仍只做接入演练 |
| F-09 | 插件维护写入边界已由用户确认扩大 | 用户当前回复“确定” | `user-confirmed` | 计划、任务和实现文件 | 不得扩展到固件或其他宿主 |

## 2. 文件施工清单

| ID | 动作 | 文件或目录 | 所属层 | 施工内容与理由 | 生成/覆盖边界 | 前置事实 | 责任 Agent | 状态 |
|---|---|---|---|---|---|---|---|---|
| W-01 | 修改候选 | `codex/AGENTS.md` | Codex 适配 | 加强 Router-first、只读前置和 Gate 交接表达 | 只改 Codex 特化规则 | F-02 | `system-architect` | ready |
| W-02 | 修改候选 | `.codex-plugin/plugin.json` | Codex Manifest | 评估是否需要更明确的入口提示；不得假定新增 Hook 字段 | 仅在方案审查确认 Schema 兼容后修改 | F-01 | `system-architect` | blocked-until-schema-review |
| W-03 | 新增/修改候选 | `scripts/` | 确定性门禁 | 增加 RCP/Spec/Gate 状态检查或封装现有检查 | 不接触固件工程；命令接口需先定稿 | F-05/F-06/F-09 | `firmware-engineer` | ready-after-scope-confirmation |
| W-04 | 修改候选 | `package.json` | 构建/脚本入口 | 暴露 Gate 校验命令 | 不改变现有命令语义 | F-06/F-09 | `toolchain-engineer` | ready-after-scope-confirmation |
| W-05 | 修改/删除 | `tests/validate-bsp-contract.test.js`、`tests/embedded-framework-baseline.test.js`、`tests/workflow-gate.test.js` | 主机验证 | 删除两组过期测试输入/入口引用，保留 Gate 状态矩阵和可运行的其他测试 | 不恢复 fixture/快照；不修改校验器实现 | F-06/F-09/Q-03/Q-04 | `verification-engineer` | ready-after-scope-change |
| W-10 | 修改 | `tests/quality-format-profile.test.js` | 主机验证 | 将测试期望与已确认的 `ColumnLimit: 80` profile 对齐 | 不修改实际 profile 配置 | Q-05 | `verification-engineer` | ready-after-scope-change |
| W-06 | 修改候选 | `README.md` | 文档 | 记录 Codex 限制、目标工程接入和验证边界 | 不修改其他宿主设计 | F-01/F-07/F-09 | `knowledge-engineer` | ready-after-scope-confirmation |
| W-07 | 修改候选 | `.github/workflows/ci.yml` | 交付门禁 | 接入插件自身 Gate/Spec 校验 | 不能把真实 Codex 交互伪装为 CI 通过 | F-06/F-07/F-09 | `toolchain-engineer` | ready-after-scope-confirmation |
| W-08 | 不修改 | `embedded_framework` | 目标固件 | 不属于当前需求 | 完全排除 | RCP 范围 | `embedded-lead` | ready |
| W-09 | 不修改 | `opencode.mjs`、Claude 适配 | 其他宿主 | 只作为对比证据 | 第一版不重构其他宿主 | F-03 | `embedded-lead` | ready |

## 3. 代码生成约束清单

| ID | 约束类别 | 已确认约束 | 证据 | 禁止事项 | 未决项 | 状态 |
|---|---|---|---|---|---|---|
| G-01 | 入口 | Router 必须作为嵌入式任务第一阶段；未形成 RCP 前实现 Skill 为空 | `codex/AGENTS.md:16-19`、Router Skill | 直接把具体 Driver/Platform Skill 当第一入口 | 目标工程如何接入模板 | ready |
| G-02 | 宿主隔离 | Codex 适配不复制 OpenCode 运行时入口 | `codex/AGENTS.md:6-12`、`opencode.mjs:167-323` | 修改 OpenCode 以模拟 Codex 修复 | none | ready |
| G-03 | 确定性门禁 | 缺失 RCP/Spec 或状态非 approved 必须产生 blocked | Review Gate Skill、RCP V-07 | 只依赖模型自述“已走流程” | Gate 状态格式和变更范围判定 | ready-after-scope-confirmation |
| G-04 | 事实等级 | 静态、主机、缓存、真实宿主证据分开 | `codex/AGENTS.md:20-24`、Review Gate | 将缓存一致或插件校验写成宿主执行证明 | 真实会话采集方式 | ready |
| G-05 | 兼容性 | 保留现有 Skill ID、别名、Manifest 基线和 refresh 行为 | `tests/codex-plugin.test.js`、`tests/plugin-refresh.test.js` | 删除旧别名或直接覆盖受管缓存 | none | ready |
| G-06 | 变更边界 | 第一版不修改固件、HAL、RTOS、OpenCode 或 Claude 逻辑 | RCP 直接范围/非目标 | 跨仓库扩展 | none | ready |
| G-07 | 可回滚 | 入口规则、脚本、测试和 CI 变更必须可按文件回滚 | Git/CI 现状 | 使用破坏性清理或覆盖用户已有修改 | none | ready |
| G-08 | 测试覆盖 | 删除过期 fixture 引用时必须记录被移除的测试边界和覆盖减少 | Review-Package/任务记录 | 静默删除测试或修改校验器迎合测试 | none | ready-after-scope-change |
| G-09 | 基准测试覆盖 | 移除 `embedded-framework-baseline.test.js` 必须记录基准覆盖减少 | Review-Package/任务记录 | 把移除测试写成 embedded-framework 验证通过 | none | ready-after-scope-change |
| G-10 | 质量基线 | 测试期望必须与当前已确认 profile 一致 | `tests/quality-format-profile.test.js`、profile 文件 | 为通过测试修改实际格式配置 | none | ready-after-scope-change |

## 4. 验收测试清单

| ID | 证据等级 | 验收项 | 命令/条件 | 预期结果 | 责任 Agent | 当前状态 | 产物或阻塞项 |
|---|---|---|---|---|---|---|---|
| V-01 | 静态 | 插件目录、Skill、Agent、Manifest 合法 | `npm run validate:plugin`，cwd=`C:\\Users\\zhang\\Documents\\mcu-workbench` | exit code 0 | `verification-engineer` | pass | 已有命令输出 |
| V-02 | 主机 | 全量单元测试 | `npm test -- --runInBand`，cwd=`C:\\Users\\zhang\\Documents\\mcu-workbench` | 全部通过 | `verification-engineer` | not-run | Jest 输出 |
| V-03 | 主机 | RCP/Spec/Gate 状态矩阵 | 新增 Gate 测试 fixture | 缺失/blocked 为 blocked，approved 才 pass | `verification-engineer` | ready-after-scope-confirmation | 需要 T-02 定接口 |
| V-04 | 主机 | Codex 缓存一致性 | `npm run plugin:check-refresh -- --json --strict` | up_to_date 或明确 refresh_required | `toolchain-engineer` | pass | 已有 refresh 输出 |
| V-05 | 主机 | Codex 兼容桥接可重复生成 | `npm run build:codex-compat; git diff --exit-code` | 无未预期差异 | `toolchain-engineer` | not-run | CI 产物 |
| V-06 | 真实宿主 | 简单代码任务 Router-first | Codex Composer 新任务，保存会话记录 | 首个有效动作符合 Router 约束，写入前无实现改动 | `verification-engineer` | blocked | 需 Codex 会话 |
| V-07 | 真实宿主 | 架构任务 Router-first | 同上 | 同上 | `verification-engineer` | blocked | 需 Codex 会话 |
| V-08 | 真实宿主 | 构建/调试任务 Router-first | 同上 | 同上 | `verification-engineer` | blocked | 需 Codex 会话 |
| V-09 | 交付 | CI 阻止无 Gate 证据的违规交付 | 构造 fixture/PR 检查 | 违规状态失败，合规状态通过 | `toolchain-engineer` | ready-after-scope-confirmation | 需 T-02 定接口 |

## 审查结论与下一轮交接

| 分类 | 方案项 | 审查结论 | 证据或风险 | 所需动作 |
|---|---|---|---|---|
| 可采用 | 项目级入口指导 + Gate 交付门禁 | 可采用 | 解决概率性路由和确定性交付两个层面 | 进入方案比较 |
| 可采用 | 保留现有 refresh/Manifest/Skill 兼容 | 可采用 | 当前校验通过，已有测试覆盖 | 作为非回归约束 |
| 需修订 | 直接修改 Codex 宿主 Hook | 需修订 | 当前 Manifest 和仓库未证明该能力 | 只能作为可选探索，不得作为第一版前提 |
| 需修订 | 目标工程自动写入 AGENTS | 需修订 | 当前没有已确认的目标工程写入入口 | 方案中明确模板/命令/责任边界 |
| 已解除阻塞 | Codex 特化写入边界与方案 A 文件范围冲突 | 已解除 | 用户确认允许扩大插件维护范围；固件和其他宿主仍排除 | 升版 Spec 后恢复 T-01 |
| 阻塞风险 | 把真实 Codex 首动作写成 CI 结果 | 阻塞 | 真实宿主尚未执行 | 独立记录 V-06/V-07/V-08 |

**重新审查结论：** 用户确认将质量 profile 测试期望改为 `ColumnLimit: 80`，保留当前 profile 配置；同时维持已确认的测试入口移除边界。静态 Review Gate 已通过，RCP/Spec/Plan/Task v0.5 已同步，允许恢复 T-03。
