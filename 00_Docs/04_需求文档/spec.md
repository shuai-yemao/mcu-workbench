# Spec：Codex Router-first 与嵌入式任务交付门禁

## 1. 元数据与 RCP 状态

| 字段 | 内容 |
|---|---|
| request_id | `REQ-CODEX-ROUTER-GATE-20260819` |
| Spec 版本 | `v0.5` |
| Spec 状态 | `approved-for-task-execution` |
| Spec 力度 | `full` |
| 风险叠加门禁 | `versioned` |
| 项目路径 | `C:\\Users\\zhang\\Documents\\mcu-workbench` |
| 分支/提交 | `host_ai @ 1652881d99578b8c45326d67ba455b6734df716f` |
| 输入 RCP | `REQ-CODEX-ROUTER-GATE-20260819-RCP.md` |
| Review-Package | `REQ-CODEX-ROUTER-GATE-20260819-Review-Package.md` |

### 1.1 版本变更

`v0.2`：用户确认扩大本次插件维护写入范围，允许修改 `README.md`、`scripts/`、`package.json` 和 `.github/workflows/ci.yml`，以落地确定性 Gate、命令入口、使用说明和 CI 门禁；继续排除 `embedded_framework`、OpenCode、Claude、HAL/RTOS/BSP 和未经确认的 Codex 宿主 Hook。

`v0.3`：用户确认不恢复已删除 BSP fixture，删除 `tests/validate-bsp-contract.test.js` 中引用这些 fixture 的测试段；保留 `scripts/validate-bsp-contract.js`，并在验收记录中明确测试覆盖减少。独立的 `embedded-framework-baseline.test.js` 快照缺口不在本次处理范围内。

`v0.4`：用户确认移除 `tests/embedded-framework-baseline.test.js` 测试入口，不同步缺失的 `tests/fixtures/embedded-framework` 快照；必须记录基准测试覆盖减少，不得把该测试移除表述为 embedded-framework 验证通过。

`v0.5`：用户确认将 `tests/quality-format-profile.test.js` 的 `ColumnLimit` 期望改为 `80`，与当前质量 profile 保持一致；不修改实际 `.clang-format` 配置。

## 2. 需求与质疑结论

### 2.1 目标

解决 Codex 偶发绕过嵌入式插件 Router 的问题，形成：

```text
Codex 入口指导
  → workflow-requirements-router
  → RCP / Challenge / Review Gate
  → spec.md / plan.md / task.md
  → 实现 Skill
  → 最终 Review 和交付门禁
```

### 2.2 范围

- Codex 入口指导和项目级接入材料；
- RCP/Spec/Gate 状态的确定性检查；
- Codex 适配测试和 CI/发布验证；
- 三类真实 Codex 请求的 Router-first 回归记录；
- 文档、回滚和版本化交接。

### 2.3 非目标

- 不修改 `D:\\zhuomian\\embedded_framework` 固件工程；
- 不修改 HAL、RTOS、BSP、Driver 或目标板代码；
- 不重构 OpenCode、Claude 适配；
- 不假设或伪造 Codex 宿主级 Hook、MCP 或写入拦截能力；
- 不把静态校验、缓存一致性或主机测试写成真实宿主行为证明。

### 2.4 目的与可行性

- 目的结论：`user-confirmed`；
- 可行性结论：`有条件可行`；
- 真实宿主的绝对零跳过不可作为第一版成功标准；
- 第一版必须做到：入口指导明确、Gate 可确定性检查、违规交付可识别、宿主行为可测量。

## 3. 工程现状与已确认事实

| ID | 事实 | 证据 | 可信等级 |
|---|---|---|---|
| F-01 | Codex Manifest 只声明 `skills/` | `.codex-plugin/plugin.json:19` | `confirmed` |
| F-02 | Codex AGENTS 已要求 Router-first 和 Review Gate | `codex/AGENTS.md:16-24` | `confirmed` |
| F-03 | OpenCode 有独立的显式 Router 工具 | `opencode.mjs:174-188` | `confirmed` |
| F-04 | 插件缓存指纹当前一致 | `npm run plugin:check-refresh -- --json` | `confirmed` |
| F-05 | 插件校验当前通过 | `npm run validate:plugin` | `confirmed` |
| F-06 | CI 已覆盖插件校验和 Codex 兼容桥 | `.github/workflows/ci.yml:8-44` | `confirmed` |
| F-07 | 真实 Codex 首动作尚未验证 | 本轮未执行 Codex Composer | `unverified` |

## 4. 文件施工范围与责任边界

候选施工范围由 `Review-Package` 的 W-01～W-07 约束。最终文件只有在 `plan.md` 方案审查通过后确定；不得在计划阶段外扩。

原则性边界：

- `codex/`：Codex 入口规则和可复制接入材料；
- `.codex-plugin/`：只有确认 Manifest 兼容性后才可修改；
- `scripts/`：只增加确定性 Gate/校验能力；
- `tests/`：只增加对应的主机回归和契约测试；
- `.github/workflows/`：只接入插件自身的确定性门禁；
- `README.md`：只补充使用方式和证据边界；
- 本次用户确认：上述插件文件可纳入方案 A 的施工范围；此授权不改变其他宿主和固件工程的非目标边界；
- 测试清理：删除已不存在 `tests/bsp-fixtures/**` 的引用测试，不恢复 fixture，不修改 BSP 校验器实现；
- 测试清理扩展：删除 `tests/embedded-framework-baseline.test.js` 测试入口，不同步 embedded-framework 快照；
- 质量基线：将 `tests/quality-format-profile.test.js` 的 `ColumnLimit` 期望改为 `80`，不修改实际格式配置；
- `embedded_framework`、OpenCode、Claude 逻辑：明确不修改。

## 5. 代码生成与实现约束

| ID | 约束 |
|---|---|
| G-01 | 未形成有效 RCP/Spec/Gate 状态前，不得把任何实现 Skill 标记为可执行。 |
| G-02 | 缺失 RCP、缺失 Spec、Spec 非放行或变更超出允许范围时，Gate 必须返回 `blocked`。 |
| G-03 | 不把模型自述“已执行 Router”作为唯一证据；必须有文档状态、运行记录或确定性检查结果。 |
| G-04 | 不把 Codex 缓存一致性当作宿主执行 Skill 的证明。 |
| G-05 | 保留现有 canonical Skill ID、旧别名、Manifest 基线和 refresh 行为。 |
| G-06 | 不新增未由当前仓库或宿主文档确认的 Codex Hook/MCP/API。 |
| G-07 | 生成的 `AGENTS.override.md` 只能由 `build:codex-compat` 产生，不手工维护。 |
| G-08 | 所有静态、主机、缓存、CI、真实宿主证据必须分级记录。 |
| G-09 | 本次用户确认扩大插件维护范围，但不得因此扩大到固件工程、其他宿主或未经确认的宿主 API。 |
| G-10 | 删除过期测试引用必须保留覆盖减少记录；不得通过修改校验器实现或删除无关测试制造假绿。 |
| G-11 | 移除 embedded-framework 基准测试入口必须保留覆盖减少记录；不得宣称目标工程验证通过。 |
| G-12 | 质量 profile 测试期望必须与当前已确认的 `ColumnLimit: 80` 配置一致。 |

## 6. 验收测试清单

| ID | 证据等级 | 验收项 | 预期结果 |
|---|---|---|---|
| V-01 | 静态 | 插件结构和 Skill/Agent/Manifest 校验 | `npm run validate:plugin` 通过 |
| V-02 | 主机 | 全量 Jest 回归 | `npm test -- --runInBand` 通过 |
| V-03 | 主机 | Gate 状态矩阵 | 缺失/blocked 状态失败，approved 状态通过 |
| V-04 | 主机 | Codex 缓存一致性 | `plugin:check-refresh --json --strict` 给出一致或明确刷新指令 |
| V-05 | 主机 | Codex 兼容桥 | `build:codex-compat` 后无未预期 diff |
| V-06 | 真实宿主 | 简单代码任务 | 首个有效动作符合 Router-first，写入前无实现变更 |
| V-07 | 真实宿主 | 架构设计任务 | 同 V-06 |
| V-08 | 真实宿主 | 构建/调试任务 | 同 V-06 |
| V-09 | 交付 | CI/交付门禁 | 无有效 Gate 证据时不能合规放行 |

V-06～V-08 目前是 `unverified`，不得在计划或实现完成前宣称通过。

## 7. Review Gate 判定

- 可采用：项目级入口指导、确定性 Gate、三类宿主回归、CI/缓存兼容验证；
- 需修订：目标工程材料的具体接入方式、Gate 状态模型和是否修改 Manifest；
- 阻塞风险：将 Codex 宿主 Hook 作为第一版必要前提；将真实宿主行为写成静态/CI 结果。

当前判定：`approved-for-integration-plan`。

下一阶段必须由 `workflow-integration-plan` 生成两个真实可行方案，比较入口材料分发、Gate 接入位置、修改范围、回滚和验证成本；在用户选择并完成方案审查前，不得生成 `plan.md` 或修改实现代码。

## 8. 交接

- 下游：`workflow-integration-plan`；
- 输入：本文件、RCP、Review-Package、当前插件源码和 CI 配置；
- 输出：两个方案 → 用户选择 → 选定方案审查 → `plan.md`；
- 实现阶段：仅允许在 `plan.md` 和后续 `task.md` 明确范围内施工；
- 新事实：如果改变范围、Manifest 能力、宿主依赖或验收标准，必须退回 Router/Challenge/Review Gate。
