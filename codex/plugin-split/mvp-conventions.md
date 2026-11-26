# MCU Workbench MVP 统一格式与最小架构

状态：`draft / awaiting_user_review`

目标：先建立一套能运行、能测试、能扩展、能回滚的最小插件骨架，再迁移现有 Skill。MVP 不追求一次完成五插件和全部宿主能力。

## 1. MVP 分层

```text
Host Adapter
  ↓
Plugin Runtime
  ├─ Contracts
  ├─ Registry
  ├─ Profile Loader
  ├─ Lifecycle
  └─ Evidence Store
      ↓
Workflow Plugin
      ↓
Architecture / Verification / DevOps / Observability
```

MVP 第一阶段只实现：

1. 一个共享 `contracts` 包；
2. 一个最小 `plugin-runtime`；
3. 一个 Workflow 插件；
4. 一个 Architecture 示例 Skill；
5. 一个 Verification 示例测试；
6. 一个 `embedded-default` profile；
7. 一个扩展 fixture，用来证明无需修改核心即可增加能力。

DevOps、Observability、MCP 和其余 Skill 在 MVP 阶段先以 descriptor、stub 和 contract test 接入，不立即全部迁移。

硬件分析作为后续独立的 `mcu-workbench-hardware` 插件，不进入本轮五插件 MVP；旧单插件入口继续作为兼容聚合入口保留。

外部 Skill 采用“登记 → 功能分类 → 唯一插件归属 → 兼容 Adapter → 测试 → 可选改写”的迁移顺序。来源、版本、许可证或依赖不清晰时保持 `blocked`。

## 2. 统一 Plugin Descriptor

```json
{
  "id": "mcu-workbench-architecture",
  "version": "0.1.0",
  "apiVersion": "plugin-v1",
  "kind": "capability-plugin",
  "capabilities": ["architecture.layer-audit"],
  "skills": ["architecture-layer-audit"],
  "agents": ["system-architect"],
  "rules": ["five-layer-contract"],
  "hooks": [],
  "mcp": [],
  "dependencies": {"mcu-workbench-runtime": ">=0.1.0 <0.2.0"},
  "profiles": ["embedded-default"],
  "entry": "./index.js"
}
```

约束：ID 全局唯一、版本遵循 SemVer、依赖有范围、能力有稳定命名空间；宿主 manifest 由该 descriptor 生成，不手工复制维护。

## 3. 统一命名标准

### 3.1 总体规则

| 对象 | 新标准 | 示例 |
|---|---|---|
| 插件 ID | `mcu-workbench-<domain>`，全小写 kebab-case | `mcu-workbench-architecture` |
| Skill ID | `<domain>-<verb>-<object>`，全小写 kebab-case | `architecture-layer-audit` |
| Agent ID | `<domain>-<role>`，全小写 kebab-case | `verification-engineer` |
| Rule ID | `<domain>-<constraint>`，全小写 kebab-case | `architecture-five-layer` |
| Hook ID | `<event>-<purpose>`，全小写 kebab-case | `skill-after-evidence-record` |
| MCP ID | `<domain>-<capability>-mcp`，全小写 kebab-case | `observability-serial-mcp` |
| MCP tool | `<verb>_<object>`，snake_case | `serial_read` |
| Event ID | `<subject>.<phase>`，点分隔 | `skill.after` |
| Profile ID | `<product>-<scenario>`，全小写 kebab-case | `embedded-default` |
| 脚本文件 | `<domain>-<command>.js`，全小写 kebab-case | `validate-plugin.js` |
| Schema 文件 | `<object>.schema.json` | `plugin-descriptor.schema.json` |
| 测试文件 | `<subject>.test.js` | `plugin-runtime.test.js` |
| 文档文件 | `<topic>.md`，全小写 kebab-case | `plugin-lifecycle.md` |

### 3.2 代码和字段规则

- JavaScript/TypeScript 变量、函数使用 `camelCase`；类和构造器使用 `PascalCase`。
- JSON/YAML 字段使用 `camelCase`；环境变量使用 `UPPER_SNAKE_CASE`。
- 目录、文件、ID 不使用中文、空格、大小写混合或隐含版本号。
- 版本统一使用 SemVer：`major.minor.patch`。
- API/schema 版本单独使用 `apiVersion`，例如 `plugin-v1`，不把 API 版本混进插件 ID。
- 布尔字段使用 `is`、`has`、`allow`、`require` 前缀。
- 错误码使用 `<DOMAIN>_<REASON>`，例如 `RUNTIME_DEPENDENCY_CONFLICT`。

### 3.3 旧名兼容

现有 `platform_mcu`、`tools-build` 等名称不能在 MVP 迁移中直接删除。新标准建立 `aliases`：

```json
{
  "id": "architecture-mcu-platform",
  "aliases": ["platform_mcu", "platform-mcu"],
  "canonical": true
}
```

新代码和新文档只使用 canonical kebab-case；旧名只存在于兼容解析、迁移报告和弃用测试中。

## 4. Skill 统一格式

每个 Skill 使用一个目录和一个 `SKILL.md`，必须包含以下 frontmatter：

```yaml
---
name: architecture-layer-audit
description: 审计 App、Service、Platform、Impl、Vendor 依赖边界。
plugin: mcu-workbench-architecture
version: 0.1.0
kind: capability
inputs: [project_root, request_id]
outputs: [audit_report, evidence_refs]
evidence_levels: [static, host]
side_effects: none
dependencies: [mcu-workbench-runtime]
---
```

正文固定包含：职责、输入、输出、允许依赖、禁止事项、执行步骤、失败分类、测试和交接。

## 5. Agent 统一格式

Agent 仍使用 Markdown + frontmatter：

```yaml
---
name: system-architect
plugin: mcu-workbench-architecture
domain: architecture
scope: [layer-boundary, interface-design]
skills_from: plugin
handoff_to: [workflow, verification]
---
```

Agent 不保存重复 Skill 清单；Runtime 根据 `plugin` 和 `domain` 派生可用 Skill。

## 6. Rule 统一格式

Rule 使用 Markdown + frontmatter，内容只描述约束：

```yaml
---
id: five-layer-contract
plugin: mcu-workbench-architecture
severity: blocking
applies_to: [architecture, codegen, review]
source: software-layer-contract.md
---
```

Rule 不执行命令、不直接调用 MCP、不替代 Skill。优先级固定为：用户要求 > 项目规则 > 插件规则 > Runtime 默认规则。

## 7. Hook 统一格式

MVP 只实现 Runtime 内部生命周期 Hook，不立即依赖宿主私有 Hook：

```json
{
  "id": "evidence-recorder",
  "events": ["skill.after", "tool.after", "plugin.dispose"],
  "handler": "./hooks/evidence-recorder.js",
  "timeoutMs": 3000,
  "failurePolicy": "record-and-continue"
}
```

Hook 必须幂等、可超时、可撤销；业务决策必须放在 Agent/Skill，工具调用必须经过 Runtime policy。

## 8. Script 统一格式

MVP 统一一个 CLI 入口，避免每个插件生成一套不一致脚本：

```text
node scripts/mcu-workbench.js <plugin> <command> --root <absolute-path> [--json]
```

统一约束：参数使用 kebab-case；路径必须为绝对路径；stdout 只输出结果；stderr 输出诊断；`--json` 输出稳定 schema；退出码统一为 `0` 成功、`2` 参数错误、`3` 环境缺失、`4` 验证失败、`5` 权限/安全阻塞；每次运行记录 command、cwd、版本、退出码、产物和 evidence level。

## 9. MCP 统一格式

MCP 只作为可选外部能力，descriptor 中只声明引用：

```json
{
  "id": "serial-log-mcp",
  "transport": "stdio",
  "tools": ["serial_open", "serial_read"],
  "permissions": ["serial.read"],
  "timeoutMs": 5000,
  "dispose": true
}
```

MVP 先做 fake MCP server 和 contract test，真实 MCP 连接放到宿主能力验证阶段。

## 10. MVP 测试出口

```text
contracts       → schema tests
runtime         → register/dispose/dependency tests
skills          → metadata/link/fixture tests
agents          → frontmatter/derived-skill tests
rules           → precedence/conflict tests
hooks           → event/order/timeout/idempotency tests
scripts         → CLI/exit-code/JSON-output tests
MCP             → fake-server/permission/timeout tests
host adapters   → Codex/Cursor/Claude smoke tests
```

只有上述主机测试通过后，才进入五插件批量迁移；目标板、真实串口、烧录和调试仍按独立目标证据验证。

## 11. MVP 宿主验证顺序

真实加载验证顺序固定为：

```text
Codex → Cursor → Claude
```

OpenCode 不属于拆分后的目标宿主，不进入 MVP 验证、适配和发布矩阵。现有 OpenCode 文件在迁移任务批准前保持不动。
