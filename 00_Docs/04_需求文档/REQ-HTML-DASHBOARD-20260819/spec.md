# Spec：三份工作流文档实时 HTML 看板

## 1. 元数据

| 字段 | 内容 |
|---|---|
| request_id | `REQ-HTML-DASHBOARD-20260819` |
| Spec 版本 | `v0.8` |
| Spec 状态 | `approved-for-execution` |
| Spec 力度 | `full` |
| Spec 叠加门禁 | `versioned` |
| 项目路径 | `D:\\zhuomian\\embedded_framework` |
| 分支/提交 | `platform_common @ 9201618` |
| 内部状态 | `.mcu-workbench/workflows/REQ-HTML-DASHBOARD-20260819/state.json`、`events.jsonl` |
| 正式文档目录 | `00_Docs/04_需求文档/REQ-HTML-DASHBOARD-20260819/` |
| 用户审查状态 | `approved-for-v0.7` |
| 决策负责人 | `user` |

## 2. 需求结论

插件在生成或更新 `spec.md`、`plan.md`、`task.md` 时，应能通过一个宿主无关的本地文件监听器生成并持续更新 `workflow-dashboard.html`。用户打开该 HTML 后，可以查看三份文档的完整内容、Task 进度、当前问题、阻塞项、验证状态和最近状态事件。

第一版不依赖 Claude、OpenCode 或 Codex 的专有 Hook，不要求浏览器运行本地服务器，也不修改源文档或 workflow 状态。监听器读取项目资料、Git 只读信息和 workflow 状态，生成每个项目唯一的自包含 HTML 驾驶舱；只有被观测内容真正变化时才重新生成 HTML，不使用固定时间间隔刷新。看板界面以简体中文为主，采用多个可切换页面展示项目总览、软件架构、启动流程、工程进度、调整记录、Git 管理和 AI 功能任务进展。架构与启动流程只读取项目已有文档/明确记录，缺失证据时显示“未确认”，不从 C/C++ 源码自动猜测。

## 3. 目的与可行性质疑

### 3.1 目的结论

- `user-confirmed`：用户需要在三份工作流文档之外，实时观察文档内容、Task 进度和问题。
- `confirmed`：当前工作流已有固定三份文档和 `.mcu-workbench/workflows/<request_id>/state.json`、`events.jsonl` 状态来源。
- `inferred`：将看板做成独立文件监听器，可以覆盖不同宿主而不依赖宿主级回调。

### 3.2 可行性结论

`有条件可行`。Node.js 可通过 `fs.watch` 监听三份 Markdown、`state.json` 和 `events.jsonl`，使用内联 CSS/JavaScript 生成不依赖外部资源的 HTML。由于当前 Codex/Claude manifest 没有统一 Hook，监听器的自动启动不能由静态插件测试证明；第一版提供明确的 CLI `render`/`watch` 入口，宿主自动启动属于后续集成项。

## 4. 范围与非目标

### 4.0 v0.8 项目范围修正

本看板的实际项目根目录固定为 `D:\zhuomian\embedded_framework`，不再把 `mcu-workbench` 插件仓库作为被展示项目。目标工程的需求文档采用 `00_Docs/04_需求文档/REQ-...-Spec.md`、`REQ-...-Integration-Plan.md`、`REQ-...-task.md` 平铺命名；看板必须识别这种格式，并在同一个项目级 HTML 中汇总各功能需求的进度。目标工程自身不存在对应的 `.mcu-workbench/workflows/<request_id>/` 状态目录时，依据 Task 表生成降级状态，并明确保留未确认/阻塞问题。

### 4.1 第一版必须包含

1. 对指定文档目录读取 `spec.md`、`plan.md`、`task.md`。
2. 根据 `request_id` 读取对应 `state.json` 和 `events.jsonl`。
3. 生成 `workflow-dashboard.html`，包含：
   - 总览卡片：当前阶段、工作流状态、整体 Task 完成率、更新时间；
   - 三份文档的完整原文查看区域；
   - Task 表格与总数、已完成、执行中、阻塞/失败、未开始统计；
   - blockers、open questions、verify summary、final review summary；
   - 最近状态事件；
   - 源文件缺失、JSON/JSONL 损坏和监听错误提示。
4. HTML 仅使用内联 CSS/JavaScript 和已嵌入的数据，不请求 CDN、网络接口或额外资源。
5. `render` 执行一次生成；`watch` 持续监听并在源文件变化后重新生成。
6. 监听器对 `rename`/`change` 重复通知进行有界去抖，并忽略自身输出文件变化。
7. 文档和状态内容在嵌入 HTML 前必须进行 HTML/JavaScript 安全转义；源内容只能作为数据展示。
8. 源文件暂时缺失或格式损坏时，仍生成带问题提示的 HTML，不覆盖源文件、不篡改状态，并保持 watcher 继续运行。
9. 页面主要文本、状态标签、统计卡片、问题提示、事件和文档导航使用简体中文；在窄窗口下自动降为单列布局。
10. 文档渲染支持标题、粗体、斜体、删除线、链接、无序/有序列表、任务列表、引用、代码块、行内代码、表格和分隔线。
11. 三份文档通过 Spec、Plan、Task 选择按钮切换；默认只展示一个选中的文档，其他文档不在首屏同时展开。
12. `verify_summary`、`final_review_summary`、事件和问题对象转换为中文摘要、状态标签、计数和时间线；页面不得把大量原始 JSON 作为主要展示内容。
13. 单个 `workflow-dashboard.html` 内提供“项目总览、Spec、Plan、Task、状态与事件”五个可切换页面；顶部快速导航按钮切换页面，默认显示项目总览。
14. watcher 对三份 Markdown、`state.json`、`events.jsonl` 的可读内容计算稳定摘要；重复 `rename/change` 事件或内容未变化时不得重写 HTML。
15. 生成的 HTML 不包含固定 `meta refresh` 或定时刷新脚本；浏览器对本地文件的自动重新加载行为单独记录为宿主/浏览器验证项。

### 4.2 明确非目标

- 不修改固件、HAL、RTOS、BSP、Vendor 或目标工程源代码。
- 不改变 Router、Challenge、Review Gate、Plan、Task 的业务规则和状态机。
- 不把 HTML 看板作为新的正式工作流文档，不参与 Gate 判定。
- 不提供在线协作、远程访问、HTTP 服务、数据库、登录权限或多项目聚合。
- 不承诺 Claude/OpenCode/Codex 会话自动启动 watcher；真实宿主自动启动需后续单独设计和验收。
- 不实现完整 CommonMark/GFM 标准；只实现本 Spec 明确列出的常用 Markdown 子集，结构化进度仍由解析器单独提取。
- 不执行或渲染原始 HTML、脚本、iframe 和外部图片；不允许 `javascript:` 等不安全链接协议。
- 不提供原始 `state.json`/`events.jsonl` 的全文查看器；如需诊断，保留必要的文件名、事件类型、时间、任务和错误摘要，不展开完整对象。
- 不生成多个 dashboard HTML 文件；页面切换只改变当前 HTML 内的可见视图。
- 不通过固定秒数轮询或 `meta refresh` 维持页面更新；更新触发源必须是 watcher 检测到内容摘要变化。

## 5. 工程事实与证据

| ID | 事实 | 证据 | 可信等级 | 影响 |
|---|---|---|---|---|
| F-01 | 正式工作流文档为 `spec.md`、`plan.md`、`task.md` | `00_Docs/04_需求文档/spec.md:16-28` | confirmed | 看板输入 |
| F-02 | workflow 状态路径由 `getWorkflowStatePaths()` 固定生成 | `lib/workflow-state.js:165-179` | confirmed | 看板状态输入 |
| F-03 | Gate 同时读取三份文档和 `state.json` | `scripts/validate-workflow-gate.js:202-218` | confirmed | 复用同一状态来源 |
| F-04 | 当前已有原子写入 workflow state 的模式 | `lib/workflow-state.js:120-145` | confirmed | 看板输出写入 |
| F-05 | 当前插件没有统一宿主文档写入 Hook | `.codex-plugin/plugin.json`、`.claude-plugin/plugin.json`、`opencode.mjs:150-183` | confirmed | 采用独立 watcher |
| F-06 | 当前工作区存在其他未提交 request 目录 | `git status --short` | confirmed | 禁止覆盖既有文件 |
| F-07 | 用户选择宿主无关 watcher 和自包含 HTML | 当前会话 | user-confirmed | 第一版架构决策 |

## 6. 文件施工清单

| ID | 动作 | 文件/目录 | 所属层 | 施工内容 | 状态 |
|---|---|---|---|---|---|
| W-01 | 新增 | `lib/workflow-dashboard.js` | Tools/Workflow | 文档读取、Task/状态解析、中文项目摘要、安全 Markdown/HTML 渲染、原子写入和 watcher API | ready |
| W-02 | 新增 | `scripts/workflow-dashboard.js` | Tools/Workflow | 提供 `render`、`watch` CLI，解析绝对项目根、文档目录、request_id 和刷新参数 | ready |
| W-03 | 新增 | `tests/workflow-dashboard.test.js` | Verification | 主机测试快照、转义、Task 统计、文档选择、中文摘要、JSON 隐藏、损坏输入、输出和监听去抖 | ready |
| W-04 | 修改 | `package.json` | Tools | 增加不依赖宿主的 dashboard CLI script | ready |
| W-05 | 修改 | `README.md` | Documentation | 记录输出位置、CLI 用法、刷新机制和验证边界 | ready |
| W-06 | 不修改 | `.codex-plugin/plugin.json`、`.claude-plugin/plugin.json`、`opencode.mjs` | Host boundary | 第一版不引入宿主 Hook；只通过 CLI 使用 | confirmed |
| W-07 | 版本更新 | `00_Docs/04_需求文档/REQ-HTML-DASHBOARD-20260819/spec.md`、`plan.md`、`task.md` | Workflow docs | 记录本次已确认的 UI/Markdown 需求变更；不覆盖根目录既有文档 | confirmed |

## 7. 接口与行为契约

### 7.1 程序化 API

`lib/workflow-dashboard.js` 应提供可测试的纯数据边界：

- `resolveDashboardPaths(options)`：解析 `projectRoot`、`docsDir`、`requestId`、源文档、状态和输出路径；路径必须绝对化，输出必须位于显式文档目录内。
- `readDashboardSnapshot(options)`：只读源文档、`state.json`、`events.jsonl`，返回文档文本、结构化 Task 统计、状态摘要、事件和问题列表；单个输入损坏不得导致其他输入丢失。
- `renderDashboardHtml(snapshot, options)`：只从 snapshot 生成自包含 HTML；在渲染阶段完成安全 Markdown 子集转换，不读取文件或访问网络。
- 页面脚本只负责文档选择和必要的视图切换；状态摘要在生成 HTML 时完成，避免把内部 JSON 数据包作为页面主内容。
- `writeDashboard(options)`：读取、渲染并原子写入 `workflow-dashboard.html`。
- `watchDashboard(options)`：监听源输入并去抖调用 `writeDashboard`，返回可停止的 watcher 句柄；停止后必须释放全部监听器和定时器。

### 7.2 CLI

```text
node scripts/workflow-dashboard.js render --root <absolute-project-root> --request-id <id> [--docs-dir <absolute-dir>]
node scripts/workflow-dashboard.js watch  --root <absolute-project-root> --request-id <id> [--docs-dir <absolute-dir>] [--debounce-ms <n>]
```

- 默认文档目录为 `<root>/00_Docs/04_需求文档`；`--docs-dir` 用于 request 专属文档目录。
- 默认输出为 `<docs-dir>/workflow-dashboard.html`；第一版不允许输出到项目根之外。
- `render` 输出生成文件绝对路径、输入状态和问题计数，并以非零退出码报告参数或不可恢复的路径错误。
- `watch` 首次立即生成，随后监听输入；Ctrl+C 或进程终止时释放资源。

### 7.3 资源与并发边界

- watcher 在宿主 Node 进程/独立 CLI 进程中运行，不创建 RTOS 任务、线程、队列或硬件资源。
- 源文档和 workflow 状态属于外部拥有；监听器只借用并读取，HTML 输出由监听器拥有。
- 读取期间遇到原子替换或部分写入时，保留最近一次成功内容或显示当前输入错误，不删除、不回写源文件。
- 不使用动态网络服务；文件读写为低频工具路径，不承诺实时毫秒级刷新。

## 8. 代码生成约束

- 使用 Node.js 内置模块优先，不新增运行时依赖。
- 所有用户文档、状态文本、事件文本、路径和错误信息都必须经过安全编码后嵌入 HTML。
- Markdown 先按块解析，再对文本节点进行 HTML 转义；只有渲染器明确生成的标签可以进入 HTML。
- 链接只允许 `http:`、`https:` 和 `mailto:` 协议，并使用安全的 `rel` 属性；原始 HTML 一律作为文本显示。
- JSON 状态只允许通过显式字段映射为中文文案、计数和时间线；禁止在摘要区调用 `JSON.stringify` 输出完整状态对象。
- 不使用 `innerHTML` 拼接未经转义的源文本；如果 HTML 模板需要脚本数据，必须安全序列化并阻断 `</script>` 注入。
- Task 状态解析必须容忍中文和英文状态，未知状态归入 `unknown` 并在问题区提示，不能静默计入完成。
- 不把 `task.md` 勾选或单个状态字段作为最终验收结论；看板明确标注它只是工作流观测视图。
- 不修改既有 `lib/workflow-state.js` 的状态契约；看板调用现有读取能力或兼容其错误边界。

## 9. 验收测试清单

| ID | 证据等级 | 验收项 | 命令/条件 | 预期结果 |
|---|---|---|---|---|
| V-01 | host | 从三份 Markdown、state.json、events.jsonl 生成 HTML | `npm test -- --runInBand tests/workflow-dashboard.test.js` | 快照和页面包含三份文档的渲染内容、Task 统计、状态、问题和事件 |
| V-02 | host | HTML 转义 | 测试输入包含 `<script>`, `</script>`, `&`, 引号和中文 | 输出不执行/破坏页面结构，源文本可查看 |
| V-03 | host | Task 进度统计 | 测试 completed/in_progress/blocked/pending/unknown 混合状态 | 总数和各分类统计正确，unknown 被提示 |
| V-04 | host | 损坏或缺失输入 | 删除一个文档、破坏 JSON 或插入坏 JSONL 行 | HTML 仍生成，问题区指出文件和错误，其他内容保留 |
| V-05 | host | watcher 更新 | 修改文档或 state，触发 change/rename 重复事件 | 在 debounce 窗口后重新生成，输出不发生递归触发 |
| V-06 | host | watcher 停止和资源释放 | 启动后调用返回句柄的 stop | 监听器和定时器释放，进程可退出 |
| V-07 | static | CLI 和文档契约 | `npm run validate:plugin`、`npm run validate:links`、`git diff --check` | 插件校验、链接检查和差异检查通过 |
| V-08 | build | 全量回归 | `npm test -- --runInBand` | 既有测试和新增测试全部通过 |
| V-09 | manual/unverified | Windows 浏览器打开 `file://.../workflow-dashboard.html` | 运行 `watch` 并修改源文档 | 页面自动刷新；若浏览器行为不一致，记录为宿主/浏览器未验证，不伪称通过 |
| V-10 | host | 中文优先界面和响应式布局 | 专项测试检查中文标题、状态文案、主内容/侧栏结构和窄窗口 CSS | 页面主要 UI 文本为简体中文，宽屏分栏、窄屏单列，文档/问题/事件可独立扫描 |
| V-11 | host | 常用 Markdown 子集和安全边界 | 专项测试覆盖标题、列表、任务项、引用、代码、表格、链接、原始 HTML 和 `javascript:` | 支持项被渲染；原始 HTML/脚本/不安全链接不执行，源文档不会破坏页面结构 |
| V-12 | host | 文档选择视图 | 专项测试和 HTML 静态检查 | 页面有 Spec/Plan/Task 选择按钮，默认只显示一个文档，切换后只显示所选文档 |
| V-13 | host | 项目状态阅读视图 | 专项测试和 HTML 静态检查 | 页面不展示大块原始 JSON；验证、审查、事件和问题以中文摘要/时间线呈现 |
| V-14 | host | 单 HTML 多页面导航 | 专项测试和 HTML 静态检查 | 一个 HTML 包含五个视图页面，导航按钮可切换，默认只显示项目总览 |
| V-15 | host | 内容变化触发刷新 | 专项测试使用相同内容重复事件和真实内容变化 | 相同内容不重写 HTML；文档、状态或事件内容变化后才重写 |
| V-16 | static/host | 无固定刷新机制 | HTML 静态检查和专项测试 | 输出不包含 `meta refresh`、固定刷新间隔或定时刷新脚本 |

## 10. 风险、回滚与未验证项

### 风险

- `fs.watch` 在 Windows 上可能产生重复 `rename/change` 事件；以去抖和可停止句柄降低影响。
- 浏览器打开本地 HTML 的自动刷新属于实际环境行为，主机测试不能替代人工确认。
- 极大 Markdown 文件会增大单个 HTML；第一版保留完整原文，必要时后续增加折叠或大小提示。
- Markdown 语法组合可能存在边界情况；通过明确的子集和安全负例测试控制范围，不宣称完整标准兼容。
- 过度压缩状态信息可能损失诊断细节；保留文件名、状态、时间、任务 ID、错误摘要和必要计数，原始 JSON 仍只在源文件中保留。

### 回滚

删除新增的 `lib/workflow-dashboard.js`、`scripts/workflow-dashboard.js`、测试文件和 package/README 中对应入口即可；不需要恢复或修改源文档、workflow state 和用户已有未提交目录。

### 未验证

- `unverified`：Claude/OpenCode/Codex 是否能在工作流结束后自动启动 watcher。
- `unverified`：不同 Windows 浏览器对 `file://` 页面 meta/脚本自动刷新的细节。
- `unverified`：目标项目文档目录的最大可接受 HTML 文件大小。

## 11. 下游交接

- 本 v0.2 Spec 已由用户确认 UI/Markdown 变更，并交由 `workflow-integration-plan` 更新紧凑实现方案；实现只在 Plan/Task 更新记录后开始。
- Plan 放行后交给 `workflow-task-breakdown`，拆分读取/渲染、CLI/监听、测试/文档和最终 Verify 任务。
- 实现阶段主 Skill：`tools-verification`（主机验证和工具产物）与插件本地 Node 实现；不进入固件层 Skill。
- 最终交接给 `workflow-final-review`，执行 Spec 逐条追踪、全量测试、插件校验和 `git diff --check`。
- 如果实现过程中需要宿主 Hook、HTTP 服务、完整 Markdown 渲染或修改文档状态契约，必须回到 Router/Challenge/Review Gate 更新 Spec。

## 12. v0.7 项目级驾驶舱变更

### 12.1 必须提供的内部页面

同一个 `<project-root>/workflow-dashboard.html` 内提供以下页面，页面通过顶部快速导航切换，不生成第二个看板文件：

1. **项目总览**：项目元数据、当前工作流、总体 Task 进度、关注项和最近调整。
2. **软件架构**：读取 `docs/architecture/**`、明确的架构 Markdown/Mermaid 记录及项目上下文，展示来源路径、可信等级和流程图预览。
3. **启动流程**：读取 `docs/boot/**`、`docs/startup/**`、文件名包含 boot/startup/init/启动/初始化/流程的文档和明确记录，展示来源路径、可信等级和流程图预览。
4. **工程进度**：汇总 `.mcu-workbench/workflows/*/state.json`、各 request 的 Task 表和运行记录，展示每个功能的进度与阻塞。
5. **调整记录**：从需求变更、Spec/Plan/Task 版本变更、门禁和阻塞事件中生成时间线/趋势，不凭空生成调整原因。
6. **Git 管理**：只读展示仓库根目录、分支、HEAD、工作区 staged/unstaged/untracked 摘要、最近提交和 diff stat。
7. **AI 功能任务**：按 request/功能展示需求、Plan、Task、验证、审查、当前任务、完成度、阻塞项和最近 AI 事件。
8. **当前文档**：保留当前 request 的 Spec/Plan/Task Markdown 阅读和原文折叠查看能力。

### 12.2 数据来源与可信边界

- `confirmed`：项目中实际存在且被读取的资料、Git 命令输出和 workflow 状态。
- `user-confirmed`：用户确认的“文档/记录优先、缺失时未确认、不从源码猜测”边界。
- `unverified`：缺少架构/启动资料时的空状态、浏览器 `file://` 自动重载和宿主自动启动 watcher。
- 不读取或展示大量原始 JSON；状态转换为中文摘要，必要时仅显示来源路径、任务 ID、时间和错误摘要。
- Git 命令只读，超时、非 Git 目录或命令不可用时页面保留并显示问题，不阻塞其他页面。

### 12.3 v0.7 验收标准

| ID | 证据等级 | 验收内容 | 通过条件 |
|---|---|---|---|
| V-17 | host | 项目级单文件输出 | 项目根目录默认只有一个 `workflow-dashboard.html` 输出，页面包含 v0.7 全部内部页面 |
| V-18 | host | 架构/启动证据边界 | 存在资料时显示来源和 Mermaid/流程预览；无资料时明确显示“未确认”，不扫描源码生成图 |
| V-19 | host | 工程进度和调整 | 汇总多个 workflow request 的 Task、状态、阻塞和需求变更事件 |
| V-20 | host | Git 管理 | 正确展示 branch、HEAD、工作区分类、最近提交和 diff stat；Git 不可用时可降级 |
| V-21 | host | AI 功能进展 | 至少展示 request、Spec/Plan/Task 版本、当前阶段、任务计数、验证/审查和阻塞 |
| V-22 | host/static | 变化去重边界扩展 | 架构/启动资料、workflow、Git 观测输入变化才允许重写；相同摘要跳过写入 |
