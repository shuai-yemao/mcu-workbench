# 实施任务清单：三份工作流文档实时 HTML 看板

## 1. 元数据

| 字段 | 内容 |
|---|---|
| request_id | `REQ-HTML-DASHBOARD-20260819` |
| 任务清单版本 | `v0.8` |
| 状态 | `通过` |
| 项目路径与提交 | `D:\\zhuomian\\embedded_framework @ platform_common / 9201618` |
| 输入 spec.md | `C:\\Users\\zhang\\Documents\\mcu-workbench\\00_Docs\\04_需求文档\\REQ-HTML-DASHBOARD-20260819\\spec.md` |
| 输入 plan.md | `C:\\Users\\zhang\\Documents\\mcu-workbench\\00_Docs\\04_需求文档\\REQ-HTML-DASHBOARD-20260819\\plan.md` |
| Spec 力度 | `full` |
| 风险叠加门禁 | `versioned` |
| 生成时间 | `2026-08-19T23:45:00+08:00` |
| 阶段级 Agent/Skill 基线 | `plan.md 第 8A 节` |
| 下游执行 Skill | `workflow-task-execution` |

可信等级：`confirmed`、`user-confirmed`、`inferred`、`unverified`。浏览器 `file://` 自动刷新和真实宿主自动启动仍为 `unverified`，不阻塞主机实现任务。

## 2. 总体任务图

```text
T-001 → T-002 → T-003 → T-004 → T-006 → T-007 → T-009 → T-010 → T-011 → T-012
                                      ↘ T-013 → T-014 → T-015 → T-016 → T-017
```

- 总体目标：生成宿主无关、仅内容变化时更新、每项目唯一、自包含的项目工程驾驶舱 HTML 看板。
- 非目标：固件、HAL、RTOS、Vendor、宿主 Manifest/Hook、HTTP 服务、源文档写回和完整 CommonMark/GFM 渲染。
- 关键串行链：`T-001 → T-002 → T-003 → T-004 → T-006 → T-007 → T-009 → T-010 → T-011 → T-012`。
- 可并行任务组：无；T-002/T-003 共用核心库和测试夹具，T-004 修改同一 package/README 交付边界。
- 不可并行原因：核心 API、单一测试文件和 package script 存在顺序依赖，避免两个任务同时修改同一资源。

## 8. v0.7 新增任务

### T-013：项目级快照与多 workflow 聚合

| 字段 | 内容 |
|---|---|
| order | `13` |
| status | `pass` |
| owner | `firmware-engineer` |
| 验证 | host |

扩展快照契约：项目元数据、多个 workflow request、Task 汇总、调整事件和当前文档；默认输出改为项目根目录唯一 HTML，同时保留显式 `--output` 覆盖能力。

### T-014：架构与启动证据页面

| 字段 | 内容 |
|---|---|
| order | `14` |
| status | `pass` |
| owner | `system-architect` |
| 验证 | host |

只读取项目架构/启动文档和明确记录，渲染来源、可信等级、Markdown 与 Mermaid/流程预览；缺少资料时显示“未确认”，禁止从源码自动猜测。

### T-015：工程进度、调整和 Git 页面

| 字段 | 内容 |
|---|---|
| order | `15` |
| status | `pass` |
| owner | `toolchain-engineer` |
| 验证 | host |

聚合任务与需求变更时间线，使用只读 Git 命令展示分支、HEAD、工作区和提交摘要，Git 失败时可降级并保留问题提示。

### T-016：AI 功能任务驾驶舱与单 HTML 导航

| 字段 | 内容 |
|---|---|
| order | `16` |
| status | `pass` |
| owner | `verification-engineer` |
| 验证 | host |

在同一个 HTML 中提供项目总览、架构、启动、进度、调整、Git、AI 功能和当前文档页面；显示每个 request 的需求、开发、测试、审查和阻塞进展。

### T-017：项目级 watcher、回归与最终 Verify

| 字段 | 内容 |
|---|---|
| order | `17` |
| status | `pass` |
| owner | `verification-engineer` |
| 验证 | host/static/build |

监听项目证据、workflow 和 Git 相关输入，按稳定摘要去重；完成专项测试、全量 Jest、插件/链接/差异检查和生成产物检查。

## 2A. v0.8 Verify 结果

| 验收项 | 证据等级 | 命令/产物 | 结果 |
|---|---|---|---|
| 项目级单 HTML、11 个内部页面 | host | `npm run workflow:dashboard -- render --root C:\\Users\\zhang\\Documents\\mcu-workbench --request-id REQ-HTML-DASHBOARD-20260819 --docs-dir ...` | pass |
| 架构/启动证据边界 | host | 专项 Jest；实际看板显示 README/CONTEXT 来源，缺失启动资料显示未确认 | pass |
| Git 只读页与多 request 汇总 | host | 专项 Jest 15/15；实际快照汇总 4 个 workflow request | pass |
| 仅内容变化时重写 | host | 专项 Jest 包含嵌套架构文档变更测试 | pass |
| 全量回归 | host | `npm test -- --runInBand` | 44 suites / 289 tests passed |
| 插件/链接/差异/语法 | static/build | `validate:plugin`、`validate:links`、`git diff --check`、`node --check` | pass |
| 生成 HTML 静态边界 | static | 289991 bytes；无 meta refresh、无固定刷新脚本、无原始状态 JSON 大块 | pass |
| embedded-framework 项目根目录与平铺需求文档 | host/static | `npm run workflow:dashboard -- render --root D:\\zhuomian\\embedded_framework`；输出 `D:\\zhuomian\\embedded_framework\\workflow-dashboard.html`；16/16 专项测试通过 | pass |

T-013～T-017 已完成。浏览器 `file://` 自动重新加载、宿主自动启动 watcher、超大项目资料容量和未登记启动资料仍保持 `unverified`，不伪称为目标环境验证。

## 3. 任务索引

| 顺序 | task_id | 任务名称 | 前置任务 | 并行组 | 主 Agent | 主实现 Skill | 辅助 Skill | 验证等级 | 状态 |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | T-001 | 完成 dashboard 路径、snapshot 和状态解析核心 | `none` | `none` | `firmware-engineer` | `tools-verification` | `tools-quality` | host | pass |
| 2 | T-002 | 完成安全 HTML 渲染和原子输出 | `T-001` | `none` | `firmware-engineer` | `tools-verification` | `tools-quality` | host | pass |
| 3 | T-003 | 完成 render/watch CLI 和 fs.watch 去抖 | `T-002` | `none` | `toolchain-engineer` | `tools-verification` | `tools-quality` | host | pass |
| 4 | T-004 | 完成 package 入口、README 和专项回归 | `T-003` | `none` | `verification-engineer` | `tools-verification` | `tools-quality` | static/build | pass |
| 5 | T-005 | 对照 Spec v0.1 执行最终 Verify 和 Final Review | `T-004` | `none` | `embedded-lead` | `workflow-final-review` | `tools-quality`, `tools-verification` | host/static/build | superseded |
| 6 | T-006 | 增加安全常用 Markdown 子集渲染 | `T-004` | `none` | `firmware-engineer` | `tools-verification` | `tools-quality` | host | pass |
| 7 | T-007 | 重排中文优先的响应式看板布局 | `T-006` | `none` | `firmware-engineer` | `tools-verification` | `system-architect` | host | pass |
| 8 | T-008 | v0.2 UI/Markdown 回归和 Verify | `T-007` | `none` | `verification-engineer` | `workflow-final-review` | `tools-quality`, `tools-verification` | host/static/build | superseded |
| 9 | T-009 | 增加文档选择视图和单文档阅读模式 | `T-007` | `none` | `firmware-engineer` | `tools-verification` | `system-architect` | host | pass |
| 10 | T-010 | 将状态 JSON 改为中文项目实时视图并完成最终 Verify | `T-009` | `none` | `verification-engineer` | `workflow-final-review` | `tools-quality`, `tools-verification` | host/static/build | superseded |
| 11 | T-011 | 实现单 HTML 多页面和快速导航 | `T-010` | `none` | `firmware-engineer` | `tools-verification` | `system-architect` | host | pass |
| 12 | T-012 | 实现仅内容变化时刷新并完成最终 Verify | `T-011` | `none` | `verification-engineer` | `workflow-final-review` | `tools-quality`, `tools-verification` | host/static/build | pass |
| 13 | T-013 | 项目级快照与多 workflow 聚合 | `T-012` | `none` | `firmware-engineer` | `tools-verification` | `tools-quality` | host | pass |
| 14 | T-014 | 架构与启动证据页面 | `T-013` | `none` | `system-architect` | `tools-verification` | `tools-quality` | host | pass |
| 15 | T-015 | 工程进度、调整和 Git 页面 | `T-014` | `none` | `toolchain-engineer` | `tools-git` | `tools-quality` | host | pass |
| 16 | T-016 | AI 功能任务驾驶舱与单 HTML 导航 | `T-015` | `none` | `verification-engineer` | `tools-verification` | `system-architect` | host | pass |
| 17 | T-017 | 项目级 watcher、回归与最终 Verify | `T-016` | `none` | `verification-engineer` | `workflow-final-review` | `tools-quality`, `tools-verification` | host/static/build | pass |
| 18 | T-018 | 切换 embedded-framework 项目根目录并适配平铺需求文档 | `T-017` | `none` | `verification-engineer` | `workflow-final-review` | `tools-verification` | host/static/build | pass |

### T-018：embedded-framework 项目根目录与平铺需求文档适配

| 字段 | 内容 |
|---|---|
| order | `18` |
| status | `pass` |
| owner | `verification-engineer` |
| 验证 | `host/static/build` |

将看板输入根目录切换到 `D:\zhuomian\embedded_framework`，识别目标工程 `00_Docs/04_需求文档` 下的平铺 `REQ-...-Spec.md`、`REQ-...-Integration-Plan.md` 和 `REQ-...-task.md`，没有 workflow state 时由 Task 表生成可读的降级状态；不修改目标工程源代码或 Git 状态。

## 4. 任务详情

### T-001：完成 dashboard 路径、snapshot 和状态解析核心

| 字段 | 内容 |
|---|---|
| order | `1` |
| parallel_group | `none` |
| source_plan_ids | `P-01` |
| source_spec_ids | `W-01`, `F-01`–`F-04`, `V-01`, `V-03`, `V-04` |
| owner_agent | `firmware-engineer` |
| support_agents | `system-architect` |
| owner_skill | `tools-verification` |
| supporting_skills | `tools-quality` |
| allocation_evidence | Plan P-01；现有 `lib/workflow-state.js:165-179` 已固定 state/events 路径；需要先建立可测试的只读数据边界。 |
| confidence | `confirmed` |
| status | `pass` |

#### 目标

新增 `lib/workflow-dashboard.js` 的路径解析、文档读取、Task 状态统计和 workflow snapshot API，并为这些行为建立主机测试。

#### 范围

- 包含：`resolveDashboardPaths()`、`readDashboardSnapshot()`、文档缺失/JSON/JSONL 错误收集、Task 表解析、状态摘要和事件读取。
- 不包含：HTML 模板、watcher、CLI、package script 和 README。
- 文件范围：`lib/workflow-dashboard.js`、`tests/workflow-dashboard.test.js`。
- 所属层：插件内部 Tools/Workflow，不属于固件 App/Service/Platform/Impl/Vendor。

#### 前置条件与依赖

- 前置任务：无。
- 外部前提：Node.js 内置 `fs`、`path` 可用；输入目录可由临时测试目录创建。
- 依赖证据：`lib/workflow-state.js:165-179`、`scripts/validate-workflow-gate.js:82-127` 的 Task 表解析约定。

#### 执行步骤

1. 固定输入路径解析规则，校验 `projectRoot`、`docsDir`、`requestId` 和输出目录边界。
2. 读取三份 Markdown、`state.json`、`events.jsonl`，每个输入单独记录缺失/损坏问题。
3. 解析 Task 表，兼容中文/英文状态；未知状态进入 `unknown` 和问题列表。
4. 从 workflow state 提取阶段、状态、blockers、open questions、verify 和 final review 摘要。
5. 为路径、混合 Task 状态、损坏 JSON/JSONL 和缺失文件补充 Jest 测试。

#### 输出物

- 文件：`lib/workflow-dashboard.js`、`tests/workflow-dashboard.test.js`。
- 符号/接口：`resolveDashboardPaths`、`readDashboardSnapshot`。
- 中间产物：Jest 主机测试输出。

#### 约束边界

- 接口和依赖：只读输入，使用 Node 内置模块；不修改 `lib/workflow-state.js`。
- 资源与生命周期：不创建常驻 watcher、不持有外部句柄。
- 并发、ISR、DMA：不适用；禁止引入固件/RTOS 概念。
- 内存和生成边界：不写 HTML、不写源文档、不新增运行时依赖。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `host` |
| 命令或条件 | `cwd=C:\\Users\\zhang\\Documents\\mcu-workbench`; `npm test -- --runInBand tests/workflow-dashboard.test.js -t "snapshot|task|input"` |
| 预期结果 | 路径、Task 统计、状态摘要和问题收集测试通过。 |
| 产物位置 | Jest 控制台输出；不写入用户项目文档。 |
| 当前状态 | `pass`；测试先行：模块不存在时 `npm test -- --runInBand tests/workflow-dashboard.test.js` 以退出码 1 失败；实现后同命令退出码 0，4 tests passed。 |

#### 失败处理与回滚

- 失败现象：路径越界、Task 统计错误、损坏输入导致读取整体失败。
- 定位顺序：路径解析 → 单文件读取 → Task 表 → state/events 解析 → 测试夹具。
- 重试/降级：单个输入失败只记录问题，保留其他输入；参数/路径错误直接失败。
- 回滚：删除本任务新增代码/测试，保留既有 workflow state 和用户目录。
- 回传条件：若需要修改 state 契约或改变 Task 状态语义，回传 Review Gate。

### T-002：完成安全 HTML 渲染和原子输出

| 字段 | 内容 |
|---|---|
| order | `2` |
| parallel_group | `none` |
| source_plan_ids | `P-01` |
| source_spec_ids | `W-01`、`G-01`–`G-03`、`V-01`、`V-02` |
| owner_agent | `firmware-engineer` |
| support_agents | `system-architect` |
| owner_skill | `tools-verification` |
| supporting_skills | `tools-quality` |
| allocation_evidence | Plan P-01；Spec §7.1 要求纯渲染边界和 Spec §8/V-02 的转义约束。 |
| confidence | `confirmed` |
| status | `pass` |

#### 目标

在 T-001 snapshot 基础上生成自包含 `workflow-dashboard.html`，并以原子方式写入输出文件。

#### 范围

- 包含：`renderDashboardHtml()`、`writeDashboard()`、内联 CSS/JS、三份文档原文、进度卡片、问题/事件区域、HTML/脚本安全序列化和原子写入。
- 不包含：文件监听、CLI、HTTP 服务、完整 Markdown 渲染和浏览器实机验证。
- 文件范围：`lib/workflow-dashboard.js`、`tests/workflow-dashboard.test.js`。
- 所属层：插件内部 Tools/Workflow。

#### 前置条件与依赖

- 前置任务：`T-001` 通过。
- 外部前提：snapshot API 已固定，临时目录可写。
- 依赖证据：T-001 输出、Spec §4.1、§7.1、§8、V-02。

#### 执行步骤

1. 设计纯函数 `renderDashboardHtml(snapshot, options)`，不在渲染阶段读取文件或访问网络。
2. 对文档原文、路径、错误、事件和脚本初始化数据分别进行安全编码。
3. 生成自包含页面结构，加入文档查看区域、Task 进度、问题和最近事件。
4. 采用临时文件 + rename 写入 `workflow-dashboard.html`，清理临时文件和异常状态。
5. 增加内容存在、`<script>`/`</script>`/`&` 转义和原子输出测试。

#### 输出物

- 文件：更新 `lib/workflow-dashboard.js`、`tests/workflow-dashboard.test.js`。
- 符号/接口：`renderDashboardHtml`、`writeDashboard`。
- 中间产物：自包含 HTML 临时测试输出。

#### 约束边界

- 接口和依赖：渲染只接受 snapshot；不允许原始 Markdown 直接拼接到脚本或 HTML。
- 资源与生命周期：一次性写入；输出由 dashboard 拥有，源文件只读借用。
- 并发、ISR、DMA：不适用；原子写入避免半成品被读取。
- 内存和生成边界：不引入 CDN/运行时包；完整原文嵌入 HTML，保留大文件风险提示能力。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `host` |
| 命令或条件 | `cwd=C:\\Users\\zhang\\Documents\\mcu-workbench`; `npm test -- --runInBand tests/workflow-dashboard.test.js -t "render|escape|write"` |
| 预期结果 | HTML 为自包含文本，恶意片段不会破坏结构，输出文件存在且内容完整。 |
| 产物位置 | 临时目录中的 `workflow-dashboard.html`；测试结束清理。 |
| 当前状态 | `pass`；测试先行：渲染/写入 API 缺失时 2 tests failed；实现后专项文件 6 tests passed。 |

#### 失败处理与回滚

- 失败现象：页面结构损坏、脚本注入、输出半写入或临时文件残留。
- 定位顺序：转义函数 → 页面模板 → JSON 序列化 → 原子写入/清理。
- 重试/降级：渲染失败返回错误；不回写源文件；写入失败清理临时文件。
- 回滚：恢复 T-001 后的核心文件，删除 T-002 增量。
- 回传条件：若需要第三方 Markdown 渲染器或 HTTP 服务，回传 Spec。

### T-003：完成 render/watch CLI 和 fs.watch 去抖

| 字段 | 内容 |
|---|---|
| order | `3` |
| parallel_group | `none` |
| source_plan_ids | `P-02` |
| source_spec_ids | `W-02`、`G-05`、`V-05`、`V-06` |
| owner_agent | `toolchain-engineer` |
| support_agents | `firmware-engineer` |
| owner_skill | `tools-verification` |
| supporting_skills | `tools-quality` |
| allocation_evidence | Plan P-02；Spec §7.2/§7.3 明确 CLI 参数、watcher 生命周期和去抖边界。 |
| confidence | `confirmed` |
| status | `pass` |

#### 目标

提供一次性 `render` 和常驻 `watch` 命令；源文件变化后去抖重渲染，并可停止释放所有句柄。

#### 范围

- 包含：`scripts/workflow-dashboard.js`、`watchDashboard()`、参数解析、退出码、首次生成、`fs.watch`、去抖、输出文件忽略和 stop。
- 不包含：宿主自动启动、HTTP 服务、浏览器自动刷新实机确认。
- 文件范围：`scripts/workflow-dashboard.js`、`lib/workflow-dashboard.js`、`tests/workflow-dashboard.test.js`。
- 所属层：插件内部 Tools/Workflow。

#### 前置条件与依赖

- 前置任务：`T-002` 通过。
- 外部前提：Node CLI 可执行，临时目录包含输入文件。
- 依赖证据：T-002 API、Spec CLI 契约、Plan P-02。

#### 执行步骤

1. 实现 `render`/`watch` 参数解析，默认 docs 目录和可选 `--docs-dir`/`--debounce-ms`。
2. `render` 首次生成并输出绝对路径、问题计数和状态摘要。
3. `watch` 首次生成，监听五类输入，忽略自身 HTML，合并重复事件后串行调用写入。
4. 对缺失/暂时不可读文件进行有限重试或问题展示，不进行无界重试。
5. 实现 `stop()` 和进程信号清理；增加 watcher 更新、重复事件和句柄释放测试。

#### 输出物

- 文件：`scripts/workflow-dashboard.js`、更新 `lib/workflow-dashboard.js` 和测试。
- 符号/接口：`watchDashboard`、CLI `render/watch`。
- 中间产物：CLI 输出和临时 dashboard 文件。

#### 约束边界

- 接口和依赖：只调用核心库；不接入宿主 Hook。
- 资源与生命周期：每个输入最多一个 watcher；去抖 timer 可取消；stop 后无存活句柄。
- 并发、ISR、DMA：不适用；同一时间只允许一次重渲染写入。
- 内存和生成边界：不写入源文档、state/events；不监听输出文件形成递归。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `host` |
| 命令或条件 | `cwd=C:\\Users\\zhang\\Documents\\mcu-workbench`; `npm test -- --runInBand tests/workflow-dashboard.test.js -t "watch|cli"` |
| 预期结果 | 首次生成成功，输入修改触发一次去抖重渲染，stop 后 Node 进程可退出。 |
| 产物位置 | 临时目录 HTML 和 Jest 控制台输出。 |
| 当前状态 | `pass`；测试先行：CLI/watcher 尚未导出时 2 tests failed；实现后专项文件 8 tests passed，`node --check` 退出码 0。 |

#### 失败处理与回滚

- 失败现象：watcher 递归触发、重复生成、进程无法退出或 CLI 退出码错误。
- 定位顺序：参数解析 → 输入监听 → 去抖 timer → 写入串行化 → stop/signal 清理。
- 重试/降级：文件暂不可读时按有界去抖重读；长期失败显示问题并继续监听。
- 回滚：删除 CLI 和 watcher 增量，保留 T-002 的一次性 render 能力。
- 回传条件：若需要宿主 Hook 或服务器模式，回传 Spec/Plan。

### T-004：完成 package 入口、README 和专项回归

| 字段 | 内容 |
|---|---|
| order | `4` |
| parallel_group | `none` |
| source_plan_ids | `P-03`, `P-04` |
| source_spec_ids | `W-03`–`W-05`, `V-07`, `V-08` |
| owner_agent | `verification-engineer` |
| support_agents | `toolchain-engineer` |
| owner_skill | `tools-verification` |
| supporting_skills | `tools-quality` |
| allocation_evidence | Plan P-03/P-04；需要把 CLI 暴露为可复现 npm 入口并记录验证边界。 |
| confidence | `confirmed` |
| status | `pass` |

#### 目标

将 dashboard CLI 接入 `package.json`，补齐 README 使用说明，并完成专项静态/主机回归。

#### 范围

- 包含：`package.json` script、`README.md` dashboard 章节、必要的 CLI smoke test 和测试清理。
- 不包含：插件 Manifest、宿主 Hook、既有根目录 Spec/Plan/Task 内容。
- 文件范围：`package.json`、`README.md`、必要时更新 `tests/workflow-dashboard.test.js`。
- 所属层：Tools/Documentation/Verification。

#### 前置条件与依赖

- 前置任务：`T-003` 通过。
- 外部前提：npm/Jest/插件校验入口保持现有可用状态。
- 依赖证据：`package.json:scripts`、README 现有验证章节、Plan P-03/P-04。

#### 执行步骤

1. 增加不改变现有脚本的 `workflow:dashboard` npm 入口。
2. README 记录 `render/watch` 命令、默认/可选路径、HTML 输出和未验证边界。
3. 运行专项 Jest、插件校验、链接检查和 diff 检查。
4. 清理测试生成的临时目录，确认只保留本任务允许的变更。

#### 输出物

- 文件：`package.json`、`README.md`，必要时测试文件。
- 符号/接口：npm script `workflow:dashboard`。
- 中间产物：专项测试、插件校验和链接检查输出。

#### 约束边界

- 接口和依赖：不新增运行时依赖，不改变现有脚本语义。
- 资源与生命周期：测试临时资源必须清理。
- 并发、ISR、DMA：不适用。
- 内存和生成边界：不生成用户项目 dashboard 作为仓库固定产物，不修改既有 request 目录。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `static/build/host` |
| 命令或条件 | `cwd=C:\\Users\\zhang\\Documents\\mcu-workbench`; `npm test -- --runInBand tests/workflow-dashboard.test.js`; `npm run validate:plugin`; `npm run validate:links`; `git diff --check` |
| 预期结果 | 专项测试、插件校验、链接检查和差异检查全部退出码 0。 |
| 产物位置 | 控制台输出；临时测试文件清理。 |
| 当前状态 | `pass`；测试先行：npm script 缺失时退出码 1；补入口后专项 Jest 8/8、插件校验、链接检查和 `git diff --check` 均退出码 0。 |

#### 失败处理与回滚

- 失败现象：npm script 不可执行、链接错误、既有测试回归或出现越界文件。
- 定位顺序：package JSON → CLI smoke → Jest → plugin/link validation → worktree 状态。
- 重试/降级：只在当前任务范围内修复；若需改变接口或 Spec，停止并回传上游。
- 回滚：移除新增 npm script、README 章节和本任务测试增量。
- 回传条件：发现既有用户变更冲突或需要修改宿主/根文档时，停止不覆盖。

### T-005：对照 Spec 执行最终 Verify 和 Final Review

| 字段 | 内容 |
|---|---|
| order | `5` |
| parallel_group | `none` |
| source_plan_ids | `P-05` |
| source_spec_ids | `V-01`–`V-09`、`W-06`、`W-07` |
| owner_agent | `embedded-lead` |
| support_agents | `verification-engineer`, `toolchain-engineer` |
| owner_skill | `workflow-final-review` |
| supporting_skills | `tools-quality`, `tools-verification` |
| allocation_evidence | Plan P-05；最终必须重新读取 Spec，逐条核对，不以 Task 勾选替代验收。 |
| confidence | `confirmed` |
| status | `blocked` |

#### 目标

对最终变更集执行 Spec 逐条追踪、全量测试、插件校验和最终质量检查，并分别记录浏览器/真实宿主未验证项。

#### 范围

- 包含：重读 Spec/Plan/Task、审阅最终 diff、全量 Jest、插件校验、链接检查、`git diff --check`、必要的 `tools-quality final-gate`。
- 不包含：在 Verify 阶段扩大 Spec、修改宿主 Hook、自动承诺浏览器或真实宿主通过。
- 文件范围：最终 dashboard 变更文件和本 request 内部状态。
- 所属层：Workflow/Verification。

#### 前置条件与依赖

- 前置任务：`T-004` 通过。
- 外部前提：最终 diff 已形成，既有用户未提交目录仍被保留。
- 依赖证据：Spec §9、Plan §11、T-001–T-004 测试输出。

#### 执行步骤

1. 重新读取 Spec、Plan、Task 和最终变更集，建立 V-01–V-09 追踪矩阵。
2. 运行 `npm test -- --runInBand`、`npm run validate:plugin`、`npm run validate:links` 和 `git diff --check`。
3. 对变更文件执行最终格式/必要注释质量门禁；整改仅限格式和必要注释。
4. 检查不修改根目录既有文档、用户未提交目录、Manifest 和 workflow-state 契约。
5. 将通过/阻塞、证据等级、命令、退出码和未验证项写入内部 state/events。

#### 输出物

- 文件：内部 workflow 状态更新；不生成 Final Review Markdown。
- 符号/接口：无新增接口。
- 中间产物：测试、校验、diff 和质量门禁输出。

#### 约束边界

- 接口和依赖：只审查已批准 Spec 范围；不替换用户选择。
- 资源与生命周期：不运行目标板、不烧录、不启动外部服务。
- 并发、ISR、DMA：不适用；浏览器/宿主行为单独标记。
- 内存和生成边界：不创建未约定项目文件，不删除既有用户文件。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `host/static/build`；浏览器行为 `unverified` |
| 命令或条件 | `cwd=C:\\Users\\zhang\\Documents\\mcu-workbench`; `npm test -- --runInBand`; `npm run validate:plugin`; `npm run validate:links`; `git diff --check`; 适用时 `tools-quality(mode: final-gate)` |
| 预期结果 | V-01–V-08 全部通过；V-09 单独记录，不伪称已验证。 |
| 产物位置 | `.mcu-workbench/workflows/REQ-HTML-DASHBOARD-20260819/state.json`、`events.jsonl` 和命令输出。 |
| 当前状态 | `blocked`；本需求专项和排除既有基线后的全量验证通过；全量 Jest 仍有 1 个既有 `tests/opencode-commands.test.js` 失败。 |

#### 失败处理与回滚

- 失败现象：任一 Spec 条目缺少证据、测试/校验失败、质量复检失败或发现越界变更。
- 定位顺序：Spec 追踪 → 变更范围 → 测试/构建 → 质量门禁 → 未验证边界。
- 重试/降级：直接对应已批准 Spec 且不扩大范围的问题可补测试后最小修复；否则回传 Spec/Plan。
- 回滚：不在 Verify 阶段盲目回退用户文件；保留证据并交回对应上游。
- 回传条件：需求、接口、资源边界、宿主范围或验收标准变化时，状态置 `blocked` 并回到 Router/Review Gate。

### T-006：增加安全常用 Markdown 子集渲染

| 字段 | 内容 |
|---|---|
| order | `6` |
| source_plan_ids | `P-01` |
| source_spec_ids | `V-01`、`V-02`、`V-11` |
| owner_agent | `firmware-engineer` |
| owner_skill | `tools-verification` |
| status | `pass` |

#### 目标

将三个文档从原始 `<pre>` 展示改为安全的常用 Markdown 渲染，同时保留可查看原文的能力。

#### 范围与约束

- 支持标题、粗体、斜体、删除线、链接、无序/有序列表、任务列表、引用、代码块、行内代码、表格和分隔线。
- 原始 HTML、脚本、iframe、外部图片和 `javascript:` 等不安全协议不得执行或注入页面。
- 不新增运行时依赖；渲染器只处理 snapshot，不读取文件、不访问网络。

#### 验证

`npm test -- --runInBand tests/workflow-dashboard.test.js -t "markdown|render|escape"`；覆盖正例和安全负例，退出码 0，证据等级为 `host`。

### T-007：重排中文优先的响应式看板布局

| 字段 | 内容 |
|---|---|
| order | `7` |
| source_plan_ids | `P-01` |
| source_spec_ids | `V-10` |
| owner_agent | `firmware-engineer` |
| owner_skill | `tools-verification` |
| status | `pass` |

#### 目标

将页面改为简体中文为主的概览界面：顶部显示任务总览，宽屏采用侧栏加主文档区，窄屏自动单列；问题、事件和三份文档可独立定位查看。

#### 范围与约束

- 只修改自包含 HTML 的内联模板、CSS 和必要的页面脚本。
- 保留当前进度统计、问题/阻塞项、验证摘要、最终审查摘要和事件信息。
- 不引入 HTTP 服务、外部资源或宿主专有能力。

#### 验证

`npm test -- --runInBand tests/workflow-dashboard.test.js -t "layout|中文|render"`；检查中文 UI 文案、分栏结构和窄屏媒体查询，专项测试已通过，证据等级为 `host`。

### T-008：完成 UI/Markdown 回归、README 和最终 Verify

| 字段 | 内容 |
|---|---|
| order | `8` |
| source_plan_ids | `P-03`、`P-04`、`P-05` |
| source_spec_ids | `V-01`–`V-11` |
| owner_agent | `verification-engineer` |
| owner_skill | `workflow-final-review` |
| status | `blocked_baseline` |

#### 目标

补齐 Markdown、中文布局和安全边界回归，更新 README 使用说明，重新执行 Spec 逐条 Verify；此前与本需求无关的 OpenCode 基线失败继续单独记录。

#### 验证

运行 dashboard 专项 Jest、`npm run validate:plugin`、`npm run validate:links`、`git diff --check`，并按条件运行全量 Jest。证据等级分别记录为 `host`、`static`、`build`；浏览器 `file://` 自动刷新仍为 `unverified`。

### T-009：增加文档选择视图和单文档阅读模式

| 字段 | 内容 |
|---|---|
| order | `9` |
| source_plan_ids | `P-01` |
| source_spec_ids | `V-12` |
| owner_agent | `firmware-engineer` |
| owner_skill | `tools-verification` |
| status | `pass` |

#### 目标

增加 Spec、Plan、Task 三个文档选择按钮；默认只展示一个文档，切换时更新当前阅读内容，避免三份长文档同时占满页面。

#### 范围与约束

- 保留 Markdown 渲染和“查看原文”能力，但原文只按当前文档按需展开。
- 使用自包含 HTML 内联脚本完成切换，不引入前端依赖或网络资源。
- 文档内容仍全部嵌入 HTML，但不同时展开；监听更新后默认回到 Spec 视图。

#### 验证

专项测试检查三个按钮、单文档默认显示、其他文档隐藏和切换脚本，11 项 dashboard 专项测试通过，证据等级为 `host`。

### T-010：将状态 JSON 改为中文项目实时视图并完成最终 Verify

| 字段 | 内容 |
|---|---|
| order | `10` |
| source_plan_ids | `P-01`、`P-03`、`P-04`、`P-05` |
| source_spec_ids | `V-13`、`V-01`–`V-11` |
| owner_agent | `verification-engineer` |
| owner_skill | `workflow-final-review` |
| status | `pass` |

#### 目标

把验证摘要、最终审查、问题和事件从原始 JSON 改为中文状态卡片、字段摘要、计数和时间线，不在主要页面展示大块 JSON。

#### 范围与约束

- 保留项目判断所需的状态、偏差/发现数量、任务 ID、事件类型、时间和错误摘要。
- 不提供 `state.json`/`events.jsonl` 原文查看器，不改变源状态文件。
- 更新 README，说明文档选择和阅读视图；完成 v0.3 Spec 验收和既有基线差异记录。

#### 验证

运行 dashboard 专项 Jest、`npm run workflow:dashboard -- render ...`、`npm run validate:plugin`、`npm run validate:links`、`git diff --check`，并按条件运行全量 Jest。专项测试 11/11、全量测试 44 套件/285 测试通过；证据等级分别记录为 `host`、`static`、`build`；浏览器 `file://` 自动刷新仍为 `unverified`。

### T-011：实现单 HTML 多页面和快速导航

| 字段 | 内容 |
|---|---|
| order | `11` |
| source_plan_ids | `P-01`、`P-03`、`P-04` |
| source_spec_ids | `V-14` |
| owner_agent | `firmware-engineer` |
| owner_skill | `tools-verification` |
| status | `pass` |

#### 目标

在同一个 `workflow-dashboard.html` 内提供项目总览、Spec、Plan、Task、状态与事件五个可切换页面，并在顶部提供快速导航。

#### 范围与约束

- 不拆分多个 HTML 文件，不引入前端依赖或本地服务器。
- 默认只显示项目总览；切换页面只改变当前 HTML 内的可见区域。
- 保留现有 Markdown、中文状态摘要、事件时间线和“查看原文”能力。

#### 验证

专项测试检查五个页面视图、导航按钮、默认总览和页面切换脚本；生成 HTML 后检查只有一个输出文件，专项 11/11、全量 44 套件/285 测试通过，证据等级为 `host`。

### T-012：实现仅内容变化时刷新并完成最终 Verify

| 字段 | 内容 |
|---|---|
| order | `12` |
| source_plan_ids | `P-01`、`P-03`、`P-05` |
| source_spec_ids | `V-15`、`V-16` |
| owner_agent | `verification-engineer` |
| owner_skill | `workflow-final-review` |
| status | `pass` |

#### 目标

移除 HTML 固定刷新机制，并让 watcher 根据源文档和 workflow 状态的稳定内容摘要决定是否重写 HTML。

#### 范围与约束

- 相同内容的 `rename/change` 重复事件不得重写 HTML。
- `spec.md`、`plan.md`、`task.md`、`state.json` 或 `events.jsonl` 内容变化后才允许生成新 HTML。
- 不引入 HTTP/SSE/WebSocket 服务；浏览器对 `file://` 文件的自动重新加载继续单独记录。

#### 验证

专项测试覆盖相同摘要跳过写入、真实内容变化写入、输出无 `meta refresh`；专项 12/12、全量 44 套件/286 测试、插件校验、链接检查和差异检查全部通过。

## 5. 任务级验收汇总

| task_id | 验收项 | 证据等级 | 命令/条件 | 预期结果 | 产物 | 状态 |
|---|---|---|---|---|---|---|
| T-001 | 路径、snapshot、Task/状态解析 | host | 专项 dashboard Jest | 输入分类和问题收集正确 | Jest 输出 | pass |
| T-002 | 安全渲染和原子输出 | host | 专项 dashboard Jest | 自包含 HTML、无结构破坏、输出完整 | 临时 HTML/Jest 输出 | pass |
| T-003 | CLI、watcher、去抖和 stop | host | 专项 dashboard Jest | 变更触发一次重渲染，stop 后可退出 | 临时 HTML/Jest 输出 | pass |
| T-004 | npm、插件、链接和差异回归 | static/build/host | 专项 Jest、`validate:plugin`、`validate:links`、`git diff --check` | 全部退出码 0 | 命令输出 | pass |
| T-005 | Spec v0.1 全量 Verify/Final Review | host/static/build | 全量测试、校验、质量门禁 | 因需求变更转为历史记录；旧基线阻塞保留 | 内部 state/events | superseded |
| T-006 | 常用 Markdown 子集和安全边界 | host | dashboard 专项 Jest | 支持项渲染，原始 HTML/脚本/不安全协议不执行 | Jest 输出 | pass |
| T-007 | 中文优先和响应式布局 | host | dashboard 专项 Jest | 中文 UI、宽屏分栏、窄屏单列和可扫描分区存在 | Jest 输出 | pass |
| T-008 | Spec v0.2 UI/Markdown Verify | host/static/build | 专项/全量测试、校验和质量门禁 | 需求变更后作为历史记录；旧基线阻塞保留 | 内部 state/events | superseded |
| T-009 | 文档选择和单文档阅读模式 | host | dashboard 专项 Jest | 选择按钮、默认单文档和切换行为存在 | Jest 输出 | pass |
| T-010 | v0.3 状态阅读视图和最终 Verify | host/static/build | 专项/全量测试、校验和质量门禁 | 需求变更后作为历史记录；旧基线结果保留 | 内部 state/events | superseded |
| T-011 | v0.5 单 HTML 多页面和快速导航 | host | dashboard 专项 Jest | 五个视图和顶部导航存在，默认只显示总览 | Jest/HTML 输出 | pass |
| T-012 | v0.6 内容变化刷新和最终 Verify | host/static/build | 专项/全量测试、校验和质量门禁 | 相同内容不重写，变化后重写，无固定刷新机制 | 内部 state/events | pass |

静态、主机、构建、目标运行和实物证据必须分开记录；本需求不涉及目标板/实物验证。

## 6. 阻塞与未验证项

| ID | 类型 | 内容 | 影响任务 | 证据/补证动作 | 状态 |
|---|---|---|---|---|---|
| B-01 | 未验证 | Windows 浏览器 `file://` 页面自动刷新行为 | T-005 | 运行 watcher 后人工打开 HTML 并修改输入 | open |
| B-02 | 未验证 | Claude/OpenCode/Codex 是否自动启动 watcher | T-005 | 需要宿主会话证据；本 Spec 非阻塞项 | open |
| B-03 | 未验证 | 超大 Markdown 对 HTML 文件大小的影响 | T-005 | 后续按实际项目样本测量 | open |
| B-04 | 已解决 | 全量 Jest 的 `tests/opencode-commands.test.js` 已通过 | T-010 | 本轮全量回归已验证 | closed |

其中 B-01 至 B-03 仍是未验证项，不阻塞本次主机交付；B-04 已在本轮全量回归中关闭。

## 7. 下游交接

- 需求/约束输入：`C:\\Users\\zhang\\Documents\\mcu-workbench\\00_Docs\\04_需求文档\\REQ-HTML-DASHBOARD-20260819\\spec.md`
- 实施路线输入：`C:\\Users\\zhang\\Documents\\mcu-workbench\\00_Docs\\04_需求文档\\REQ-HTML-DASHBOARD-20260819\\plan.md`
- 任务清单：本文件。
- 阶段级 Agent/Skill 基线：`plan.md 第 8A 节`。
- 执行规则：按 `T-001 → T-002 → T-003 → T-004 → T-005`，每次只施工一个任务；前置任务通过后才能继续。
- 代码完成后：交接 `workflow-final-review`。
- 新事实回传：不改变范围的事实回填当前 Task；改变接口、宿主范围、状态契约或验收标准时回传 `workflow-requirements-challenge` / `workflow-review-gate`。
