# 集成实施计划：三份工作流文档实时 HTML 看板

## 1. 元数据与状态

| 字段 | 内容 |
|---|---|
| request_id | `REQ-HTML-DASHBOARD-20260819` |
| 生成时间 | `2026-08-19T23:30:00+08:00` |
| 计划版本 | `v0.8` |
| 计划状态 | `approved-for-execution` |
| 项目路径 | `D:\\zhuomian\\embedded_framework` |
| 分支/提交 | `platform_common @ 9201618` |
| 输入 spec.md | `C:\\Users\\zhang\\Documents\\mcu-workbench\\00_Docs\\04_需求文档\\REQ-HTML-DASHBOARD-20260819\\spec.md` |
| 输入 Review-Package | `.mcu-workbench/workflows/REQ-HTML-DASHBOARD-20260819/state.json` 的 `review_package` |
| Spec 力度 | `full` |
| 风险叠加门禁 | `versioned` |
| 选定方案 | `方案 A：fs.watch 事件监听 + 去抖重渲染` |
| 方案选择人 | `user` |
| 用户审查状态 | `approved` |
| 方案审查结论 | `通过` |

## 2. 一句话说明

### v0.8 范围修正

生成命令的 `--root` 指向目标工程 `D:\zhuomian\embedded_framework`。看板从目标工程的架构资料、启动资料、Git 和 `00_Docs/04_需求文档` 平铺需求文件读取数据；输出唯一文件为 `D:\zhuomian\embedded_framework\workflow-dashboard.html`。插件仓库只提供生成器，不作为看板数据源。

- 要解决的问题：项目资料、AI 功能工作流和 Git 变更分散，用户无法在一个页面中持续查看项目全貌与当前调整。
- 计划做什么：扩展 Node dashboard 核心库和 CLI，聚合项目架构/启动证据、多个 workflow request、只读 Git 信息和当前文档，生成项目根目录唯一的自包含 HTML。
- 明确不做什么：不引入 HTTP 服务、外部前端依赖、宿主 Hook、完整 CommonMark/GFM 渲染、Git 写操作或源文档写回；不从 C/C++ 源码自动推测架构/启动图，不展示大量原始 JSON，不使用固定刷新定时器。
- 预期结果：执行 `render` 可生成一次项目级看板；执行 `watch` 后，项目证据、workflow 状态、事件或 Git 观测内容变化才在去抖后重写同一个 `workflow-dashboard.html`。

## 3. 输入依据与工程事实

| ID | 事实或约束 | 证据 | 可信等级 | 对计划的影响 |
|---|---|---|---|---|
| E-01 | 三份正式文档是 `spec.md`、`plan.md`、`task.md` | Spec F-01；`00_Docs/04_需求文档/spec.md:16-28` | confirmed | 作为看板文档输入 |
| E-02 | 状态路径由 `getWorkflowStatePaths()` 统一解析 | `lib/workflow-state.js:165-179` | confirmed | 复用 request_id 定位 state/events |
| E-03 | workflow state 使用原子替换写入 | `lib/workflow-state.js:120-145` | confirmed | watcher 必须处理 rename/change 重复事件 |
| E-04 | 插件没有三个宿主共用的文档写入 Hook | `.codex-plugin/plugin.json`、`.claude-plugin/plugin.json`、`opencode.mjs:150-183` | confirmed | 通过独立 CLI 保持宿主无关 |
| E-05 | 用户选择方案 A | 当前会话；Spec F-07 | user-confirmed | 采用事件监听而非固定轮询 |
| E-06 | 当前工作区存在其他未提交 request 目录 | `git status --short` | confirmed | 只新增本 request 文件，不覆盖根目录既有文档 |

## 4. 两个候选方案与用户选择记录

### 方案 A：`fs.watch` 事件监听 + 去抖重渲染

- 适用场景：需要低延迟观察工作流文档变化，并长期保持 watcher 运行。
- 做什么：监听五类输入文件，对 `rename/change` 事件进行 150–500 ms 有界去抖，重新读取 snapshot 并原子写入 HTML。
- 主要改动：`lib/workflow-dashboard.js`、`scripts/workflow-dashboard.js`、测试、package script 和 README。
- 优点：空闲时低资源消耗，变更响应快，适合实时看板。
- 缺点：Windows 原子替换可能产生重复事件，需要等待文件恢复后重读。
- 成本：中等实现成本，需覆盖 watcher stop、重复事件和缺失文件测试。
- 风险：`fs.watch` 行为依赖平台；错误必须进入 HTML 问题区且不能导致源文件改写。
- 验收方式：主机 Jest 测试验证 watcher 和渲染；静态插件校验验证入口；浏览器自动刷新保持 `unverified` 直到人工确认。
- 回滚方式：删除新增库、CLI、测试和 package/README 入口。

### 方案 B：固定间隔轮询

- 适用场景：优先平台行为一致和实现简单，不要求低延迟。
- 做什么：按固定间隔检查输入文件的修改时间或摘要，变化时重渲染 HTML。
- 主要改动：与方案 A 相同，但不依赖 `fs.watch`。
- 优点：平台行为简单，原子替换和 rename 语义更容易处理。
- 缺点：空闲时持续检查，更新延迟受轮询周期限制。
- 成本：低到中等实现成本，需验证计时器释放和重复渲染抑制。
- 风险：轮询间隔过大时不满足实时体验，过小时增加文件系统访问。
- 验收方式：主机测试验证计时器和重渲染，浏览器自动刷新仍需人工确认。
- 回滚方式：删除新增库、CLI、测试和 package/README 入口。

### 方案对比

| 维度 | 方案 A | 方案 B | 结论依据 |
|---|---|---|---|
| 易理解程度 | 中 | 高 | B 的控制流更简单 |
| 改动范围 | 小 | 小 | 两者共用同一渲染和 CLI 边界 |
| 实现复杂度 | 中 | 低 | A 需处理 Windows 重复事件 |
| 运行时资源 | 低 | 中 | A 只在文件事件后重渲染 |
| 架构风险 | 中 | 低 | A 的风险集中在 watcher 适配，不扩散到状态契约 |
| 可验证性 | 中 | 高 | B 的时序更确定；A 可通过 fake event 和短去抖验证 |
| 回滚难度 | 低 | 低 | 两者均为新增工具路径 |
| 后续扩展性 | 高 | 中 | A 更适合未来接入宿主启动或多输入事件 |

### 用户选择

```text
selected_option: A
decision_owner: user
decision_rationale: 需要宿主无关且接近实时的本地看板，接受对 Windows 文件事件做去抖处理
rejected_option: B
new_constraints: none
```

## 5. 选定方案概览

- 选定方案：`A`
- 选定原因：在不引入宿主 Hook 和 HTTP 服务的前提下，事件驱动更接近实时，同时保持输出为单个自包含文件。
- 与 `spec.md` 的一致性：保持五类输入只读、HTML 自包含、无外部依赖、无源状态写回和 `render/watch` 双入口。
- 施工边界：Node 工具库、CLI、主机测试、package script、README 使用说明。
- 非目标：固件及其分层、宿主 Manifest/Hook、Workflow 业务状态契约、HTTP 服务。
- 主要风险：Windows 文件原子替换的 watcher 事件顺序，以及浏览器 `file://` 自动刷新行为。

## 6. 分层、调用链与接口边界

本需求属于插件 Tools/Workflow 横切能力，不进入固件的 `App → Service → Platform ← Impl → Vendor` 运行时链路。

```text
CLI / 外部宿主命令
        ↓
workflow-dashboard API
        ├─ read: spec.md / plan.md / task.md / state.json / events.jsonl
        ├─ parse: task summary / workflow summary / issues
        ├─ render: self-contained HTML
        └─ write: workflow-dashboard.html
```

- 允许依赖：Node.js 内置 `fs`、`path`、`crypto`（如需要摘要）、现有 `lib/workflow-state.js` 的只读契约。
- 禁止依赖：固件代码、HAL、RTOS、Vendor、浏览器网络接口、外部 CDN、宿主专有 Hook。
- 输入所有权：源 Markdown/JSON/JSONL 由工作流拥有；dashboard 只读借用。
- 输出所有权：`workflow-dashboard.html` 由 dashboard 生成器拥有，可被后续生成覆盖。
- 阻塞属性：`render` 为同步一次性工具调用；`watch` 为常驻进程，不能阻塞源工作流写入。
- 线程安全：Node 单进程事件循环；所有重新生成通过去抖串行执行，不并行写同一个 HTML。
- 停止契约：watcher 返回 `stop()`，必须清理所有 `fs.FSWatcher` 和定时器。

## 7. 文件施工顺序

| ID | 阶段 | 动作 | 文件或目录 | 所属层 | 施工内容与理由 | 责任 Skill | 前置条件 | 生成/覆盖边界 | 状态 |
|---|---|---|---|---|---|---|---|---|---|
| P-01 | 1 | 修改 | `lib/workflow-dashboard.js` | 在既有 snapshot/Task 统计基础上增加内容摘要、中文项目摘要、单 HTML 多页面导航、状态时间线和安全 Markdown 渲染 | `tools-verification` | Spec v0.6 已批准 | 仅修改 dashboard 实现；不写源文档 | ready |
| P-02 | 2 | 新增 | `scripts/workflow-dashboard.js` | Tools/Workflow | 将核心 API 暴露为 `render/watch`，处理参数和退出码 | `tools-verification` | P-01 | 仅新增 CLI；不修改宿主入口 | ready |
| P-03 | 3 | 新增/修改 | `tests/workflow-dashboard.test.js`、`package.json` | Verification/Tools | 建立 Markdown、文档选择、多页面导航、内容摘要去重、无固定刷新和 npm 入口 | `tools-verification` | P-01、P-02 | 只增加测试和 script | ready |
| P-04 | 4 | 修改 | `README.md` | Documentation | 记录使用、输出位置、自动刷新、单 HTML 多页面、中文状态视图和 Markdown 子集边界 | `tools-quality` | P-02 | 只增加 dashboard 说明 | ready |
| P-05 | 5 | 验证 | 受影响文件及全量测试 | Verification | 执行 Spec 追踪、测试、插件校验和 diff 检查 | `workflow-final-review` | P-01–P-04 | 不在 Verify 阶段扩大范围 | ready |

## 8. 阶段计划与交接

| 阶段 | 目标 | 输入 | 输出 | 完成条件 | 交接对象 |
|---|---|---|---|---|---|
| 1 | 完成读取、解析、内容摘要、Markdown、中文摘要和单 HTML 多页面核心 | Spec、现有 workflow-state 契约 | `lib/workflow-dashboard.js` | V-01–V-04、V-10–V-16 对应主机测试通过 | P-02 / `tools-verification` |
| 2 | 完成 CLI 和事件 watcher | P-01 核心 API | `scripts/workflow-dashboard.js`、npm script | V-05–V-06 通过，错误退出行为明确 | P-03 / `tools-verification` |
| 3 | 完成回归测试和使用说明 | P-01、P-02 | 测试文件、README 修改 | V-07–V-08、V-10–V-16 通过 | P-05 / `workflow-final-review` |
| 4 | 最终 Verify 和质量门禁 | Spec、Plan、最终 diff | 内部 Verify/Final Review 状态 | V-01–V-08、V-10–V-16 无偏差；V-09 单独记录 | 用户交付 |

## 8A. 下游执行 Agent 与 Skill 基线

| 阶段/ID | 主 Agent | 协作 Agent | 主实现 Skill | 辅助 Skill | 分配理由与证据 | 状态 |
|---|---|---|---|---|---|---|
| P-01 | `firmware-engineer` | `system-architect` | `tools-verification` | `tools-quality` | 需要增加源内容摘要、Markdown 块渲染、中文项目摘要、单 HTML 多页面导航、安全链接和响应式布局；Spec W-01、V-10–V-16 | ready |
| P-02 | `toolchain-engineer` | `firmware-engineer` | `tools-verification` | `tools-quality` | 需要 CLI 参数、Windows watcher 进程生命周期和退出码；Spec W-02、V-05、V-06 | ready |
| P-03 | `verification-engineer` | `toolchain-engineer` | `tools-verification` | `tools-quality` | 需要主机测试覆盖 Markdown 语法、安全负例、文档选择、多页面导航、内容摘要去重、无固定刷新、中文布局、插件校验和既有回归；Spec W-03、V-07、V-10–V-16 | ready |
| P-04 | `knowledge-engineer` | `verification-engineer` | `tools-quality` | `tools-verification` | README 记录已实现入口、中文界面、单 HTML 多页面、项目状态视图、Markdown 子集和证据边界；Spec W-05 | ready |
| P-05 | `embedded-lead` | `verification-engineer`, `toolchain-engineer` | `workflow-final-review` | `tools-quality`, `tools-verification` | 对照 Spec 独立审查最终 diff，不把 Task 状态当完成证据 | ready |

## 9. 资源、并发与生命周期约束

- 不创建 RTOS 任务、队列、信号量、ISR 或 DMA 资源。
- watcher 使用 Node 事件循环和有限数量的 `FSWatcher`；每个输入文件最多一个监听器。
- 去抖定时器有界且可取消；重新生成串行化，避免两个写入同时替换 HTML。
- 源文件读取失败只进入 snapshot 的问题列表；不可恢复的参数/路径错误由 CLI 返回非零退出码。
- 输出采用临时文件加原子 rename；临时文件和异常备份必须在成功/失败路径清理。
- watcher 停止时释放监听器和定时器，不能遗留保持 Node 进程存活的句柄。

## 10. 代码生成约束

| ID | 约束类别 | 必须遵守 | 禁止事项 | 证据 | 状态 |
|---|---|---|---|---|---|
| G-01 | 路径 | 所有输入和输出路径绝对化；输出限制在显式 docs 目录 | 写入项目根、插件缓存或用户已有文档 | Spec §7.1–7.2、W-06/W-07 | ready |
| G-02 | 安全渲染 | Markdown 先按块解析，文本节点、属性和内联脚本数据分别安全转义/序列化；状态只做字段映射 | 将原始 Markdown、不安全链接或完整 JSON 拼入 HTML/脚本 | Spec §8、V-02、V-11、V-13 | ready |
| G-03 | 状态边界 | 只读 state/events，并保留损坏输入问题 | 修改 state.json/events.jsonl 或重算工作流判定 | Spec §4.2、§7.3 | ready |
| G-04 | 兼容性 | 使用 Node 内置模块，不新增运行时依赖 | 引入 CDN、HTTP 服务或宿主 Hook | Spec §4.1、§4.2 | ready |
| G-05 | watcher | 去抖、忽略输出文件、支持 stop 和错误提示 | 无界重试、递归监听输出、静默吞错 | Spec V-05/V-06 | ready |

## 11. 验收与验证计划

| ID | 证据等级 | 验收项 | 命令/条件 | 预期结果 | 责任 Skill | 产物 | 状态 |
|---|---|---|---|---|---|---|---|
| V-01–V-04 | 主机 | snapshot、渲染、转义、Task 统计和损坏输入 | `npm test -- --runInBand tests/workflow-dashboard.test.js` | 新增测试通过 | `tools-verification` | Jest 输出 | not-run |
| V-05–V-06 | 主机 | watcher 去抖、更新、stop 和资源释放 | 同上，使用临时目录和短 debounce | watcher 测试通过且进程可退出 | `tools-verification` | Jest 输出 | not-run |
| V-07 | 静态 | CLI、插件链接和差异检查 | `npm run validate:plugin`; `npm run validate:links`; `git diff --check` | 全部退出码 0 | `tools-quality` | 命令输出 | not-run |
| V-08 | 构建/主机 | 全量回归 | `npm test -- --runInBand` | 既有和新增测试全部通过 | `tools-verification` | Jest 输出 | not-run |
| V-09 | 人工/未验证 | Windows 浏览器打开本地 HTML 并修改源文档 | 运行 `watch`，打开 `file://` HTML，修改输入 | 自动刷新行为单独记录；不能由主机测试替代 | 用户/`verification-engineer` | 人工记录 | unverified |
| V-10 | 主机 | 中文优先和响应式布局 | 专项 dashboard Jest | 中文 UI 文案、宽屏分栏和窄屏单列结构存在 | `tools-verification` | Jest 输出 | not-run |
| V-11 | 主机 | 常用 Markdown 子集和安全边界 | 专项 dashboard Jest | 支持项渲染，原始 HTML/脚本/不安全协议不执行 | `tools-verification` | Jest 输出 | not-run |
| V-12 | 主机 | 文档选择视图 | 专项 dashboard Jest | Spec/Plan/Task 按钮和单文档默认视图存在 | `tools-verification` | Jest 输出 | not-run |
| V-13 | 主机 | 项目状态阅读视图 | 专项 dashboard Jest | 不出现大块原始 JSON，摘要/事件为中文可读视图 | `tools-verification` | Jest 输出 | not-run |
| V-14 | 主机 | 单 HTML 多页面导航 | 专项 dashboard Jest | 一个 HTML 包含五个页面视图，导航按钮和默认总览存在 | `tools-verification` | Jest 输出 | not-run |
| V-15 | 主机 | 内容变化触发刷新 | 专项 dashboard Jest | 相同内容不重写，内容变化才重写 | `tools-verification` | Jest 输出 | not-run |
| V-16 | 静态/主机 | 无固定刷新机制 | 专项 dashboard Jest、HTML 检查 | 不存在 `meta refresh` 或固定刷新定时器 | `tools-verification` | Jest/HTML 输出 | not-run |

## 12. 方案审查记录

| 审查项 | 责任 Agent | 结论 | 证据 | 修订或后续动作 |
|---|---|---|---|---|
| 分层和接口 | `system-architect` | 可采用 | Spec §7；只读输入与独立 Tools 边界 | 保持不进入固件五层 |
| 文件和数据流 | `firmware-engineer` | 可采用 | Spec W-01–W-07、`lib/workflow-state.js:120-179` | 先做 snapshot，再渲染和写入 |
| 验收和回归 | `verification-engineer` | 可采用 | Spec V-01–V-14 | 浏览器自动刷新保持 unverified；Markdown/布局/阅读视图/多页面导航纳入主机验收 |
| 硬件边界 | `hardware-integration` | 不适用 | 无 MCU、板卡、HAL、RTOS 或实物资源 | 不分配硬件任务 |
| 工具链和产物 | `toolchain-engineer` | 可采用 | `package.json` 现有 npm/Jest 入口 | 增加 dashboard CLI，不新增运行时依赖 |

### 审查结论

- 可采用项：方案 A 的事件监听、去抖、独立 CLI、自包含 HTML 和只读状态输入。
- 已完成修订：将宿主自动启动、浏览器自动刷新和大文件容量列为未验证项，不作为主机通过条件。
- 未关闭阻塞：无。
- 是否改变 `spec.md`：是，因用户新增文档选择、“面向阅读、不展示大量 JSON”和单 HTML 多页面导航的需求变更。
- 最终结论：通过，需求边界明确，允许进入实现任务。

## 13. 回滚与失败处理

- 代码或配置回滚方式：删除 P-01–P-04 新增/修改文件中的 dashboard 变更；保留源文档和 workflow 状态。
- 中途失败后的保留状态：保留测试失败输出、临时 dashboard 产物和内部事件记录；不删除用户已有目录。
- 验收失败后的定位顺序：路径解析 → 输入读取/损坏恢复 → Task/状态解析 → HTML 转义/渲染 → watcher 去抖/停止 → CLI/回归。
- 不可恢复情况：若需要宿主 Hook、HTTP 服务或改变 state 契约，停止并回传 Router/Review Gate，不在本计划内猜测扩展。

## 14. 下游交接

- 正式需求/约束输入：`C:\\Users\\zhang\\Documents\\mcu-workbench\\00_Docs\\04_需求文档\\REQ-HTML-DASHBOARD-20260819\\spec.md`
- 正式实施计划：本文件
- 阶段级 Agent/Skill 基线：本文件第 8A 节
- 下一步：交给 `workflow-task-breakdown` 生成 `task.md`。
- 目标文件范围：`lib/workflow-dashboard.js`、`scripts/workflow-dashboard.js`、`tests/workflow-dashboard.test.js`、`package.json`、`README.md`。
- 禁止扩大：不修改根目录既有 Spec/Plan/Task，不修改宿主 Manifest/Hook，不修改 `lib/workflow-state.js` 契约。
- 实现完成后交接：`workflow-final-review`。
- 未验证项：真实宿主自动启动、Windows 浏览器 `file://` 自动刷新、无架构资料时的项目现场补录、最大 HTML 文件大小。
- 回传规则：新增需求、路径/状态契约变化或需要外部服务时回到 Router/Review Gate。

## 15. 当前状态与下一步

- 当前状态：`approved-for-execution`
- 当前唯一动作：生成并执行 `task.md`
- 阻塞项：`none`
- 下一步：生成 `task.md`，再进入逐项实现与测试。

## 16. v0.7 项目级实施结果

本节 supersede v0.6 的单 request 输出描述：

- `lib/workflow-dashboard.js` 生成项目级 snapshot，汇总多个 workflow request、Task、需求变更事件、架构/启动证据和只读 Git 信息。
- `workflow-dashboard.html` 默认写入项目根目录；`--output` 可显式指定项目内的唯一输出位置。
- 页面导航包含项目总览、软件架构、启动流程、工程进度、调整记录、Git 管理、AI 功能任务、当前 Spec/Plan/Task 和问题与事件。
- 架构/启动页面只扫描文档/记录入口，不扫描 C/C++ 源码推断流程；资料缺失时展示未确认状态。
- watcher 递归监听项目文档、workflow 和 Git 目录，使用内容摘要去重，保持“仅内容变化时刷新”。
- 实现范围不进入固件 App/Service/Platform/Impl/Vendor，不执行 Git 写操作，不修改源文档或 workflow 状态。
