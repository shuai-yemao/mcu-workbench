# 实施任务清单：嵌入式插件输出统一归档到 00_Docs

## 1. 元数据

| 字段 | 内容 |
|---|---|
| request_id | `REQ-PLUGIN-OUTPUT-00DOCS-20260821` |
| spec_version | `v1.0` |
| plan_version | `v1.0` |
| task_version | `v1.0` |
| execution_mode | `auto_until_final_check` |
| 状态 | `completed` |

## 2. 执行约束

- 严格按 `T-001 → T-005` 顺序执行。
- 每个任务只有一个主实现 Skill；辅助 Skill 只提供审查或验证，不并行修改同一文件。
- 不回退用户已有的 Dashboard/UI 修改。
- 不修改固件源码、Vendor 源码、既有需求文档和 `.mcu-workbench` 旧请求状态。
- 需求、接口或验收标准发生变化时，停止当前任务并回传 Spec。

## 3. 任务索引

| ID | 任务 | 主 Agent | 主 Skill | 状态 |
|---|---|---|---|---|
| T-001 | 新增共享输出路径契约并迁移 Agent 产物初始化 | firmware-engineer | tools-build | completed |
| T-002 | 迁移 Dashboard、Watcher 和 Manager 默认输出路径 | firmware-engineer | tools-verification | completed |
| T-003 | 迁移 Claude 分层报告和 Agent/规则/Skill 文档 | system-architect | workflow-claude-layering | completed |
| T-004 | 更新测试、README 和路径契约回归 | verification-engineer | tools-verification | completed |
| T-005 | 执行最终 Verify、质量检查和 Final Review | embedded-lead | workflow-final-review | completed |

## 4. 任务详情

### T-001：共享输出路径契约与 Agent 产物

- 主实现：`firmware-engineer` / `tools-build`
- 文件范围：新增 `lib/project-output-paths.js`；修改 `scripts/agent-artifacts.js`、`tests/agent-artifacts.test.js`。
- 实现内容：
  - 提供 `00_Docs/06_嵌入式插件输出`、四个子目录和 Dashboard 相对路径；
  - 提供目标工程绝对路径解析和路径包含判断；
  - `agent-artifacts init` 创建新目录；
  - `project.json.artifact_roots` 记录新路径；
  - 保留 `.mcu-workbench/runs`。
- 验收：Agent Artifact 专项测试通过；路径模块不依赖 Dashboard 或宿主 API。

### T-002：Dashboard、Watcher 和 Manager 路径迁移

- 主实现：`firmware-engineer` / `tools-verification`
- 文件范围：修改 `lib/workflow-dashboard.js`、`lib/workflow-dashboard-manager.js`、相关 Dashboard 测试。
- 实现内容：
  - 默认 Dashboard 写入 `00_Docs/06_嵌入式插件输出/workflow-dashboard.html`；
  - Dashboard 读取新四类目录，并兼容读取旧 `docs/*`；
  - 显式 `outputPath` 限制在新输出根目录内；
  - Watcher 监听新目录但忽略自身输出；
  - `start/status/open/render/stop` 返回路径一致。
- 验收：Dashboard 和 Manager 专项测试通过；覆盖中文路径、越界输出、旧路径兼容和 watcher 去重。

### T-003：Claude 分层报告和规则文档迁移

- 主实现：`system-architect` / `workflow-claude-layering`
- 文件范围：修改 `lib/claude-layer.js`、`skills/workflow/workflow-claude-layering/SKILL.md`、`agents/*.md`、`AGENTS.md`、`CLAUDE.md`、必要的 Codex 规则说明。
- 实现内容：
  - Claude 分层报告新写入 `00_Docs/06_嵌入式插件输出/architecture/claude-layer-map.md`；
  - 旧 `docs/architecture` 只保留兼容识别，不删除用户文件；
  - Agent scope、写入规则和插件文档改为新默认路径；
  - 保留项目 `00_Docs/04_需求文档`、`05_日志` 和 `.mcu-workbench` 边界说明。
- 验收：Claude Layer 专项测试和链接检查通过；规则描述不再把旧路径当作默认写入路径。

### T-004：测试、README 和回归

- 主实现：`verification-engineer` / `tools-verification`
- 文件范围：README、相关测试和必要的路径说明。
- 实现内容：
  - 更新目标项目目录示例和 Dashboard 命令输出说明；
  - 更新 Agent Artifact、Dashboard、Claude Layer 测试断言；
  - 增加旧路径读取兼容和新路径写入回归；
  - 检查当前未提交变更未被覆盖。
- 验收：专项测试、`validate:plugin`、`validate:links`、`git diff --check` 通过。

### T-005：最终 Verify 和 Final Review

- 主实现：`embedded-lead` / `workflow-final-review`
- 辅助：`tools-quality`、`tools-verification`
- 文件范围：本请求涉及的全部变更和内部状态。
- 验证：
  - `npm test -- --runInBand`；
  - `npm run validate:plugin`；
  - `npm run validate:links`；
  - `git diff --check`；
  - `node --check` 检查新增/修改 JavaScript；
- 按 Spec V-01–V-10 建立验收追踪。
- 未验证：目标板、浏览器 `file://` 自动刷新、真实宿主强制 Router 行为。

执行结果：通过。`npm test -- --runInBand` 通过 50 个 suite、315 个测试；`validate:plugin`、`validate:links`、`git diff --check` 和 JavaScript 语法检查均通过。目标板、浏览器 `file://` 自动刷新和真实宿主强制 Router 行为仍为 `unverified`。

## 5. 回滚

- 仅回滚本请求修改的源码、测试和文档；保留新建的目标目录，不删除用户文件。
- 如果发现当前用户 Dashboard/UI 修改与路径迁移冲突，停止并报告，不使用 `git checkout` 或破坏性恢复。
