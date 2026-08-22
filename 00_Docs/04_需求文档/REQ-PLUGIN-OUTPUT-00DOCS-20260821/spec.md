# Spec：嵌入式插件输出统一归档到 00_Docs

## 1. 元数据

| 字段 | 内容 |
|---|---|
| request_id | `REQ-PLUGIN-OUTPUT-00DOCS-20260821` |
| 版本 | `v1.0` |
| 状态 | `awaiting_user_review` |
| 源仓库 | `C:\\Users\\zhang\\Documents\\mcu-workbench` |
| 风险等级 | `full` |
| 叠加门禁 | `human_review`、`versioned` |
| 证据等级 | 静态源码、用户确认 |

## 2. 需求结论

将 MCU-Workbench 在目标嵌入式项目中生成的四类长期文档和 HTML 看板，统一归档到：

```text
<project-root>/00_Docs/06_嵌入式插件输出/
├─ architecture/
├─ verification/
├─ devlog/
├─ notes/
└─ workflow-dashboard.html
```

该目录是插件生成物的默认写入根目录。`workflow-dashboard.html` 是可重新生成的展示产物，不能替代源码、需求文档、Workflow 状态或验证日志作为事实源。

## 3. 目的与可行性质疑

### 3.1 目的结论

- `user-confirmed`：用户希望插件输出统一进入项目 `00_Docs`，便于项目文档集中管理。
- `confirmed`：当前 Agent 产物使用 `docs/*`，Dashboard 默认写入项目根目录，Claude 分层报告也使用旧架构文档路径。
- `inferred`：独立的 `06_嵌入式插件输出` 可以避免与 `04_需求文档`、`05_日志` 的职责混淆。

### 3.2 可行性结论

可行。修改集中在路径契约、目录初始化、看板证据扫描、分层报告、文档说明和测试；不涉及固件源码、HAL、RTOS、目标板或外部服务。

## 4. 范围与非目标

### 4.1 必须包含

1. 新增统一路径常量或等效路径契约，避免各模块继续散落硬编码。
2. `scripts/agent-artifacts.js init` 创建四个新目录，并在 `project.json.artifact_roots` 记录新路径。
3. Agent 的 scope、写入规则、根目录 `AGENTS.md`/`CLAUDE.md` 和相关 Skill 文档改为新路径。
4. Dashboard 默认输出到 `00_Docs/06_嵌入式插件输出/workflow-dashboard.html`。
5. Dashboard 监听并读取新输出目录中的架构、验证、开发日志和笔记资料。
6. `--output` 的显式路径必须位于新插件输出根目录内；默认输出和 `open/status/start/stop` 返回值保持一致。
7. Claude 分层报告的新写入路径为 `00_Docs/06_嵌入式插件输出/architecture/claude-layer-map.md`。
8. 保留旧 `docs/*` 的只读兼容读取，不删除、移动或覆盖既有用户文件。
9. 更新单元测试、README 和路径相关契约检查。

### 4.2 明确不包含

- 不移动 `00_Docs/04_需求文档/` 下的 `spec.md`、`plan.md`、`task.md`。
- 不移动 `00_Docs/05_日志/`，Dashboard 仍可读取既有运行日志。
- 不移动 `.mcu-workbench/workflows/`、`.mcu-workbench/runs/` 或项目 `project.json`。
- 不改变 `00_Docs/05_Codegen_Contracts/` 的既有代码生成契约路径。
- 不删除旧 `docs/*`，不自动迁移旧文件，不改固件代码和宿主 Hook。
- 不声称完成目标板、浏览器 `file://` 或真实宿主行为验证。

## 5. 接口与路径契约

### 5.1 路径契约

```text
PLUGIN_OUTPUT_ROOT = 00_Docs/06_嵌入式插件输出
PLUGIN_OUTPUT_DIRS = architecture | verification | devlog | notes
PLUGIN_DASHBOARD = 00_Docs/06_嵌入式插件输出/workflow-dashboard.html
```

路径应由共享模块提供 POSIX 相对路径和当前平台绝对路径转换，禁止各模块重复定义不同字符串。

### 5.2 Dashboard

- `resolveDashboardPaths()` 的默认 `outputPath` 为 `PLUGIN_DASHBOARD`。
- `outputPath` 必须位于 `PLUGIN_OUTPUT_ROOT` 内，路径越界时报错。
- `collectEvidence()` 优先读取新目录；旧 `docs/*` 仅作为兼容来源。
- Watcher 必须监听新输出目录、Workflow 状态、需求文档、Git 和既有日志输入，但必须忽略自身 HTML 输出，避免递归触发。
- `status`、`open`、`start`、`stop` 返回的新旧路径必须统一为新 Dashboard 路径。

### 5.3 Agent 产物

- `init` 创建 `.mcu-workbench/runs` 和四个新文档目录。
- `artifact_roots` 使用新路径。
- 运行记录仍写入 `.mcu-workbench/runs`，不放入 HTML 输出目录。

## 6. 所有权、生命周期与兼容性

- 新目录由插件初始化/写入逻辑创建；目录内文件由对应 Agent 或生成器负责。
- Dashboard 由 Dashboard 生成器独占写入，可被后续运行原子覆盖。
- 旧 `docs/*` 由用户所有；本次只读，不删除、不移动、不覆盖。
- Workflow 状态由 `.mcu-workbench` 所有；Dashboard 只读状态。
- 看板写入失败时保留原 HTML，清理临时文件并返回错误。

## 7. SOLID 约束

| 原则 | 本需求约束 |
|---|---|
| SRP | 路径模块只负责输出路径；Agent、Dashboard、Claude 报告分别负责自身产物 |
| OCP | 增加新输出目录应通过路径契约扩展，不复制路径判断逻辑 |
| LSP | 新路径适配不能破坏旧 `docs/*` 的只读读取能力 |
| ISP | Dashboard、Agent 和分层报告只依赖各自需要的路径函数 |
| DIP | 业务模块依赖抽象路径契约，不直接依赖散落字符串 |

## 8. 验收标准

| ID | 验收项 | 证据等级 |
|---|---|---|
| V-01 | `agent:artifacts init` 创建四个新目录并记录新 `artifact_roots` | host |
| V-02 | Dashboard 默认输出到 `00_Docs/06_嵌入式插件输出/workflow-dashboard.html` | host |
| V-03 | Dashboard `render/watch/status/open/stop` 使用一致的新路径 | host |
| V-04 | 越界 `--output` 被拒绝 | host |
| V-05 | 新目录中的架构、验证、开发日志和笔记可被 Dashboard 读取 | host |
| V-06 | 旧 `docs/*` 仍可作为兼容读取来源 | host |
| V-07 | Claude 分层报告写入新 architecture 目录，旧报告不被删除 | host/static |
| V-08 | 现有 `00_Docs/04_需求文档`、`05_日志`、`.mcu-workbench` 行为不回归 | host |
| V-09 | 相关 Skill、Agent、README 和根规则不再把旧路径描述为默认写入位置 | static |
| V-10 | `npm test -- --runInBand`、`npm run validate:plugin`、`npm run validate:links`、`git diff --check` 通过；既有基线失败单独记录 | host/static |

## 9. 风险与未验证项

- 现有工作区包含未提交 Dashboard/UI 变更；实现必须基于当前内容增量修改，不能回退或覆盖。
- 目标项目中可能同时存在新旧两套文档目录；兼容读取可能造成重复来源，需要在快照中保留来源路径。
- Windows 文件系统大小写和中文路径需要专项主机测试。
- 浏览器打开 `file://` 后是否自动刷新仍为 `unverified`。
- 本需求不包含真实 Codex/Claude/OpenCode 宿主行为证明。

## 10. 用户审查

本 Spec 需要用户确认后，才生成 `plan.md` 和 `task.md`，然后进入实现阶段。
