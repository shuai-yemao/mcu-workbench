# MCU Workbench Observability 插件实施任务清单

> 本文件依据 spec.md v0.3 和 plan.md 生成；observability 迁移已完成，本次追加旧聚合插件 OpenCode 活动宿主清理。

## 1. 元数据

| 字段 | 内容 |
|---|---|
| request_id | REQ-PLUGIN-SPLIT-20261123 |
| 任务清单版本 | v0.3-opencode-host-removal |
| 状态 | T-001～T-008 已完成 |
| 项目路径与提交 | C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai @ host_ai |
| 输入 spec.md | C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\spec.md |
| 输入 plan.md | C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\plan.md |
| Spec 力度 | full |
| 风险叠加门禁 | versioned |
| 生成时间 | 2026-11-24T00:00:00+08:00 |
| 阶段级基线 | plan.md 第 8A 节 |
| 下游执行 Skill | workflow-task-execution |

可信等级：confirmed、user-confirmed、inferred、unverified。外部 Skill 来源/版本/许可证/依赖未知项保持 unverified，不得转写为完成审计。

## 2. 总体任务图

T-001 → T-002 → T-003 → T-004 → T-005 → T-006 → T-007 → T-008

- 总体目标：形成可由 Codex 和 Cursor MVP 宿主发现、加载、验证和回滚的 observability 独立插件。
- 非目标：architecture、verification、devops、hardware、Claude、具体上位机协议、热加载/动态卸载。
- 关键串行链：全部任务按顺序执行，因为迁移、catalog 和宿主 manifest 共享文件边界。
- 可并行组：无；外部 Skill 迁移和 canonical 迁移都影响同一插件目录与链接校验。

## 3. 任务索引

| 顺序 | task_id | 任务名称 | 前置任务 | 主 Agent | 主实现 Skill | 辅助 Skill | 验证等级 | 状态 |
|---:|---|---|---|---|---|---|---|---|
| 1 | T-001 | 建立 observability 插件骨架 | none | embedded-lead | workflow-integration-plan | tools-quality | static | pass |
| 2 | T-002 | 迁移 canonical observability Skill | T-001 | embedded-lead | tools-observability | tools-quality | static | pass |
| 3 | T-003 | 迁移并登记外部 observability Skill | T-001 | embedded-lead | tools-observability | tools-verification | static/host | pass |
| 4 | T-004 | 接通 catalog、alias 与 Agent 路由 | T-002,T-003 | system-architect | workflow-integration-plan | tools-git | host | pass |
| 5 | T-005 | 接通 Codex/Cursor manifest 与版本 | T-004 | toolchain-engineer | tools-build | tools-quality | host/build | pass |
| 6 | T-006 | 执行插件回归与回滚验证 | T-005 | verification-engineer | tools-verification | tools-quality | static/host/build | pass-with-limitations |
| 7 | T-007 | 最终 Verify 与质量门禁 | T-006 | embedded-lead | workflow-final-review | tools-quality | final | pass-with-limitations |
| 8 | T-008 | 清理旧聚合插件 OpenCode 活动宿主集成 | T-007 | embedded-lead | workflow-task-execution | tools-quality | static | in-progress |

## 4. 任务详情

### T-001：建立 observability 插件骨架

目标：新增 observability 插件目录、descriptor、manifest 和版本声明，使其具备独立静态校验入口。

- 来源：P-01；Spec F-06、F-07、G-01、G-04。
- 主实现：embedded-lead / workflow-integration-plan；协作 system-architect；辅助 tools-quality。
- 范围：plugins/mcu-workbench-observability/ 及其 manifest/descriptor。
- 不包含：Skill 内容迁移、catalog 切换、旧入口删除。
- 验证：仓库根目录运行 node --check 相关 JS、JSON 解析和插件结构校验。
- 预期：descriptor 合法，版本符合 SemVer，旧入口未受影响。
- 回滚：删除新增骨架文件，不触碰既有 skills 和未跟踪目录。
- confidence/status：confirmed / pass。

### T-002：迁移 canonical observability Skill

目标：将 tools-debug 和 tools-observability 纳入 observability 插件物理目录，修复迁移后的内部链接和 descriptor。

- 来源：P-02；Spec E-03、F-06、G-03。
- 主实现：embedded-lead / tools-observability；协作 knowledge-engineer；辅助 tools-quality。
- 前置：T-001。
- 范围：canonical Skill 内容及相对引用。
- 不包含：其他 tools Skill、固件源码、硬件工具实际连接。
- 验证：仓库根目录运行 node scripts/validate-skill-links.js 和新目录静态扫描。
- 预期：新目录引用可解析，Skill 语义未改变，旧路径有明确兼容映射。
- 回滚：恢复迁移前路径映射，不删除原始内容。
- confidence/status：confirmed / pass。

### T-003：迁移并登记外部 observability Skill

目标：筛选并迁移归属明确的外部调试、串口、RTT、逻辑分析和运行时观测 Skill，登记来源与未验证字段。

- 来源：P-03；Spec E-04、F-14、F-15、V-13、V-14。
- 候选：debug-gdb-openocd、debug-jlink、debug-platformio、logic-analyzer、rtos-debug、serial-monitor、serial-shell；visa-debug 等归属不明确条目保持 blocked，除非证据补齐。
- 主实现：embedded-lead / tools-observability；协作 knowledge-engineer；辅助 tools-verification。
- 前置：T-001。
- 禁止：按目录名猜测归属、修改外部 Skill 语义、伪造来源/许可证/版本。
- 验证：inventory 检查、链接检查和 descriptor/fake/contract test，不连接真实硬件。
- 预期：每个迁移条目唯一指向 observability；未知元数据显式保留。
- 回滚：移除新 adapter/迁移副本，恢复原 inventory 状态，不删除原始外部目录。
- confidence/status：user-confirmed（允许迁移）；元数据逐条 confirmed/unverified / pass。

### T-004：接通 catalog、alias 与 Agent 路由

目标：使 observability Skill 在插件级 catalog 中可发现，同时保持旧 Skill ID 和聚合入口兼容。

- 来源：P-04；Spec E-01、E-06、F-08、G-01、G-03。
- 主实现：system-architect / workflow-integration-plan；协作 embedded-lead；辅助 tools-git。
- 前置：T-002、T-003。
- 范围：skills/catalog.js、skills/catalog-metadata.js、lib/agent-domains.js 及必要测试。
- 不包含：修改 workflow/architecture/verification/devops 的核心语义。
- 验证：主机测试覆盖 canonical ID、旧 alias、重复 ID、未知 external 条目和 Agent 派生结果。
- 预期：新旧调用名解析稳定，无重复 canonical Skill，无孤儿 observability Skill。
- 回滚：恢复 catalog projection 和 alias 映射，保留新目录以便重新审查。
- confidence/status：confirmed / pass。

### T-005：接通 Codex/Cursor manifest 与版本

目标：为 Codex 和 Cursor 建立 observability 独立宿主表面，并保持旧聚合入口。

- 来源：P-05；Spec E-02、E-05、F-07、G-04、V-04、V-07。
- 主实现：toolchain-engineer / tools-build；协作 verification-engineer；辅助 tools-quality。
- 前置：T-004。
- 范围：Codex/Cursor manifest、版本同步脚本及对应测试。
- 不包含：Claude/OpenCode manifest、真实宿主热加载/动态卸载。
- 验证：仓库根目录运行 node scripts/sync-plugin-versions.js --check、manifest JSON 解析和 Codex/Cursor smoke。
- 预期：两个宿主 manifest 静态合法、版本和能力声明一致；实际宿主加载仍待验证。
- 回滚：恢复旧聚合 manifest，保留新插件文件和报告。
- confidence/status：confirmed + user-confirmed / pass。

### T-006：执行插件回归与回滚验证

目标：验证 observability 迁移后的静态、主机、构建/脚本和回滚条件。

- 来源：P-06；Spec V-01～V-07。
- 主实现：verification-engineer / tools-verification；协作 toolchain-engineer；辅助 tools-quality。
- 前置：T-005。
- 验证：仓库根目录依次运行 npm test -- --runInBand、npm run validate:plugin、npm run validate:links、npm run check:versions；Codex/Cursor smoke 分别记录。
- 输出：codex/plugin-split/artifacts/observability/ 下的命令记录、JUnit/JSON/Markdown 报告和产物 SHA-256。
- 预期：无新增 catalog/link/version/manifest 回归；旧 alias 可恢复。
- 失败处理：普通失败在当前 Task 内诊断修复并复测；若改变范围/接口/验收，停止并回到 Spec。
- 回滚：按 T-005 和 T-004 的回滚路径恢复旧聚合入口。
- confidence/status：confirmed / pass-with-limitations。

### T-007：最终 Verify 与质量门禁

目标：对照批准的 Spec 审查完整变更集，并完成最终格式、注释、质量和差异检查。

- 来源：P-07；Spec V-08、G-01～G-05。
- 主实现：embedded-lead / workflow-final-review；协作 verification-engineer；辅助 tools-quality。
- 前置：T-006。
- 验证：git diff --check、tools-quality final-gate、最终 Verify；记录绝对 cwd、退出码、范围和未验证项。
- 预期：仅 observability 范围发生行为变化；无新增格式/链接/目录/版本问题；延期项不被误报为通过。
- 回滚：发现范围外差异时停止并回退本次受限整改，将问题交回对应 Task。
- confidence/status：confirmed / blocked。

### T-008：清理旧聚合插件 OpenCode 活动宿主集成

目标：按 Spec v0.3 和 Plan 第 16 节，移除仍参与运行、安装或发布的 OpenCode 宿主代码，保持其他宿主和共享能力不变。

- 来源：用户 2026-11-24 明确要求；Spec v0.3 清理补充范围；Plan P-08。
- 主实现：embedded-lead / workflow-task-execution；辅助质量复核 tools-quality。
- 前置：T-007 已 pass-with-limitations；Spec/Plan 补充范围已 user-confirmed / approved。
- 范围：`package.json`、`package-lock.json`、`opencode.json`、`opencode.mjs`、`scripts/build-opencode-commands.js`、`lib/opencode-quality-hook.js`、`.opencode/commands/`、`tests/opencode-commands.test.js`、`tests/opencode-quality-hook.test.js`、`scripts/check-codex-plugin-refresh.js` 的 OpenCode 路径；活动文档当前支持说明。
- 保留：`.mcu-workbench/workflows/` 与 `codex/plugin-split/` 历史记录；Claude/Codex/Cursor 宿主适配；共享 catalog、Agent 路由和 Skill 内容。
- 验证：活动源文件、包元数据、脚本和配置不再引用 OpenCode；package/package-lock 一致；Node/JSON 语法检查与 `git diff --check`。不运行 Jest，除非用户另行要求。
- 回滚：只恢复 T-008 中 OpenCode 专属文件和包元数据，不回退其他宿主改动。
- 结果：活动适配源码、依赖、导出、命令生成器、Hook、生成命令和专属测试已移除；活动文档及刷新指纹列表已更新。历史工作流/拆分审计记录保留。
- 验证记录：cwd `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`；`npm install --package-lock-only --ignore-scripts --offline`（npm 11.20.0，退出码 0）；package JSON 解析（0）；`node --check scripts/check-codex-plugin-refresh.js`（0）；`node --check lib/agent-domains.js`（0）；活动引用扫描无匹配（rg 退出码 1，预期）；lockfile OpenCode 包扫描无匹配（rg 退出码 1，预期）；`git diff --check`（0）。未运行 Jest。
- confidence/status：user-confirmed / completed-with-limitations（静态验证完成；未运行 Jest；无真实 OpenCode 宿主验收）。

## 5. 任务级验收汇总

| task_id | 验收项 | 证据等级 | 预期结果 | 状态 |
|---|---|---|---|---|
| T-001 | 插件骨架 | static | descriptor、manifest、版本合法 | pass |
| T-002 | canonical Skill 迁移 | static | 新目录链接有效、语义不变 | pass |
| T-003 | 外部 Skill 迁移 | static/host | 归属唯一，未知元数据显式保留 | pass |
| T-004 | catalog/alias 路由 | host | 新旧 ID 和 Agent 路由稳定 | pass |
| T-005 | Codex/Cursor 表面 | host/build | 两宿主 manifest 静态合法、版本一致；Codex enabled，Cursor 本地插件加载日志确认 | pass |
| T-006 | 回归与回滚 | static/host/build | 静态检查和 Jest 57 suites / 338 tests 通过；实际宿主未验证 | pass-with-limitations |
| T-007 | 最终 Verify | final | 本轮适用范围的 Spec 条目均有证据；来源审计/Claude/OpenCode/热卸载等延期项单列 | pass-with-limitations |
| T-008 | OpenCode 活动宿主清理 | static | 活动集成/依赖/脚本/Hook/命令产物和专属测试移除；历史审计记录保留；package lock 一致 | pass-with-limitations |

## 6. 阻塞与未验证项

| ID | 类型 | 内容 | 影响任务 | 补证动作 | 状态 |
|---|---|---|---|---|---|
| B-01 | 未验证 | 部分外部 Skill 来源、版本、许可证、依赖未知 | T-003、T-006 | 保留 inventory 字段并逐条记录 | open |
| B-02 | 未验证 | Claude 宿主表面 | T-005、T-006 | Claude 本轮延期，不作为 MVP 通过条件 | deferred |
| B-03 | 未验证 | 热加载、动态卸载、事件撤销 | T-005、T-006 | 本轮仅验证静态组合、显式生命周期、重启加载 | deferred |
| B-04 | 已解决 | npm test 入口已改为仓库内 node_modules/jest-cli/bin/jest.js；全量 Jest 通过 | T-006、T-007 | 已修复 package.json 并完成全量 Jest | closed |
| B-05 | 已解决 | 新 observability manifest 已在 Codex 安装为 enabled，并由 Cursor 本地插件日志确认加载 | T-005、T-006、T-007 | Codex CLI 插件清单 + Cursor Cursor Plugins.log | closed |

## 8. 执行记录

| task_id | allocation_id | 关键检查 | 结果 | 证据 |
|---|---|---|---|---|
| T-001 | T-001-20261124-observability | node --check；descriptor 生命周期断言 | pass | plugins/mcu-workbench-observability/ |
| T-002 | T-002-20261124-observability | node scripts/validate-skill-links.js | pass；740 Markdown files | 绝对 cwd 为仓库根 |
| T-003 | T-003-20261124-observability | inventory/ownership 检查；外部 registry 校验 | pass；元数据未知项保留 | plugins/mcu-workbench-observability/external-skills.json |
| T-004 | T-004-20261124-observability | catalog projection；direct host assertions | pass | tests/observability-plugin.test.js |
| T-005 | T-005-20261124-observability | validator/manifest/version 检查；Codex CLI install；Cursor User Local Plugin load | pass | Codex plugin ID 与 Cursor 日志详见 artifacts/observability/result.md |
| T-006 | T-006-20261124-observability | validate-plugin、validate-links、check:versions、direct assertions、targeted/full Jest | pass-with-limitations | full Jest JSON: codex/plugin-split/artifacts/observability/jest-full.json |
| T-007 | T-007-20261124-observability | Spec 追踪；全量测试、静态校验、构建、git diff --check；质量审查 | pass-with-limitations | final-gate 摘要和未验证项见 artifacts/observability/result.md |
| T-008 | T-008-20261124-opencode-cleanup | 活动宿主清理；包/脚本/文件引用与 lockfile 一致性复核 | completed | 静态/JSON/语法/diff 检查通过；未运行 Jest |

### 环境变量与新增验证

- MCU_WORKBENCH_NPM_BIN（用户级）：C:\Program Files\nodejs\npm.cmd
- MCU_WORKBENCH_JEST_BIN（用户级）：C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\node_modules\jest-cli\bin\jest.js
- npm 版本：11.20.0；Jest 版本：29.7.0
- observability targeted Jest：2 suites / 5 tests，pass
- npm test -- --runInBand --json --outputFile=codex/plugin-split/artifacts/observability/jest-full.json：pass；57 suites / 57 passed，338 tests / 338 passed
- npm 11.20.0；Jest 29.7.0；命令 cwd 为仓库根目录
- 全量报告已检查 success=true；clang-format EPERM 未复现
- Codex CLI：`mcu-workbench-observability@mcu-workbench-observability-local` 为 installed, enabled，版本 1.0.0
- Cursor：`Cursor Plugins.log` 记录 `loadUserLocalPlugin mcu-workbench-observability loaded`（2026-11-24 10:19）；作为宿主加载证据
- Cursor 原有聚合插件保持安装；新插件单独位于 `~/.cursor/plugins/local/mcu-workbench-observability`
- 仍 unverified：7 个外部 Skill 的来源/版本/许可证/依赖；Claude/OpenCode、动态卸载和实际硬件观测均在本轮延期/非目标内

## 7. 下游交接

- 需求/约束输入：C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex/plugin-split/spec.md
- 实施路线输入：C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex/plugin-split/plan.md
- 任务清单：本文件
- 执行规则：workflow-task-execution 采用 auto_until_final_check，按 T-001 → T-007 串行执行。
- 单项主实现：每个 Task 只有一个 owner_skill；辅助 Skill 不并行修改同一文件。
- 代码完成后：交接 workflow-final-review。
- 新事实回传：改变 Spec 范围/接口/验收时回到 workflow-review-gate；仅实现细节问题回到 workflow-integration-plan。
