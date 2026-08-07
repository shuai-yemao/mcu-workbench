---
name: workflow-claude-layering
description: 当用户要为嵌入式固件工程初始化、扫描、更新、审计或校验 Claude Code 的多文件规则（CLAUDE.md、.claude/rules、规则漂移、分层上下文）时使用。必须先扫描真实工程，再生成可审计的分层规则；对未知目录不猜测归层，也不得静默覆盖手写 Claude 文件。
---

# Claude 分层管理工作流

## 职责

为目标固件工程维护受管的 Claude 上下文：根 `CLAUDE.md` 的受管区块、
`.claude/rules/mcu-workbench/` 中的路径规则、分层扫描快照和架构报告。

本 Skill 编排扫描、预览、同步和校验；不替代 `workflow-review-gate` / `workflow-integration-plan`
进行架构设计与审查，不生成固件业务代码，也不把静态检查描述为目标板验证。

## 触发与输入

使用 `mcu-workbench claude-layer <action> --root <firmware-root>`，其中 action 为：

- `scan`：只读扫描目录、CMake、CubeMX、FreeRTOS 和 C/C++ include 证据。
- `init`：建立首次配置与受管产物计划。
- `sync`：依据已有配置重新扫描并生成更新计划。
- `validate`：检查扫描快照、受管文件和现有架构契约。

`init` 与 `sync` 默认只显示计划。只有用户明确要求写入时才追加 `--write`。
`--strict` 把 `unverified` 路径从告警提升为错误。

可选配置位于 `.mcu-workbench/claude-layering.json`。`layout` 可为 `app`、
`middleware`、`os`、`bsp`、`core`、`driver` 指定正则表达式数组，覆盖默认目录识别。

## 受管文件边界

| 文件 | 所有权 | 规则 |
|---|---|---|
| `CLAUDE.md` | 共享 | 仅更新 `mcu-workbench:managed` 标记区块；保留其他手写内容。 |
| `.claude/rules/mcu-workbench/` | 本 Skill | 每层规则使用 `paths` 限定生效目录。 |
| `.claude/rules/` 的其他文件 | 用户/项目 | 不读取后重写，不删除。 |
| `.mcu-workbench/claude-layering*.json` | 本 Skill | 配置由用户确认，state 由扫描器生成。 |
| `docs/architecture/claude-layer-map.md` | 本 Skill | 记录静态扫描事实与未确认项。 |

若工程已有 `AGENTS.md`，受管区块引用 `@AGENTS.md`，不复制其内容。

## 工作流

1. 执行 `scan`，报告 `confirmed` 目录、配置和源码引用证据，以及 `unverified` 路径。
2. 对首次接入执行 `init` 预览；检查根文件保留内容、规则目录和配置覆盖是否正确。
3. 在用户确认差异后运行 `init --write` 或 `sync --write`。
4. 运行 `validate`；它必须同时报告规则漂移、架构静态错误和未确认项。
5. 仅在配置确认后使用 `validate --strict` 作为 CI 门禁。CI 不调用 `--write`。

## 分层硬约束

- APP 只能调用 Middleware 公共 API、OS Wrapper 和 BSP Wrapper；不得直接调用 HAL、原生 RTOS、Port 或 Driver。
- Adapter 仅位于 OS 与 BSP，且由 Wrapper 与 Port 组成。
- BSP Wrapper 是平台无关的函数表注册和转发层；Port 才能绑定具体 Driver、Handler、Core 和 OSAL 对象。
- Handler 拥有工作循环、缓存、重试和回调；Port 不得复制业务缓存。
- Core、Middleware 与 Driver 不创建项目专属 Adapter；Driver 仅处理器件协议并经 Core 公共能力访问总线。

发现层归属冲突或需要变更依赖图时，交接 `workflow-review-gate`；
需要实施代码改动时交接 `workflow-final-review`；质量检查交接 `tools-quality`。

## 输出格式

每次输出包含：

```text
Action: scan | init | sync | validate
Firmware root: <absolute path>
Confirmed evidence: <config and relative/path:line items>
Unverified: <paths or none>
Planned changes: <create/modify list; init/sync only>
Writes: <absolute paths; only with --write>
Validation: <static findings, warnings, exit code>
Evidence boundary: static scan only; build/board proof is separate
Next handoff: <if needed>
```

## 验证边界

`validate` 仅验证配置、受管 Claude 文件、目录/源码静态证据和现有架构规则。
它不证明编译、烧录、RTT、串口或实机功能；这些必须通过对应工具链和板级证据单独确认。
