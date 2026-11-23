# MCU-Workbench Agent Team

插件根目录的 `agents/*.md` 是 Claude Code 自动发现的 Custom Agents。当前团队由 7 个角色组成；没有默认主 agent，调用由用户或任务编排决定。

## 调用

```powershell
claude --plugin-dir .
```

在 Claude Code 中可使用 `@mcu-workbench:embedded-lead`、`@mcu-workbench:system-architect` 等显式调用；通过 `/context` 检查 Custom Agents 是否已加载，插件更新后可执行 `/reload-plugins`。

## 角色交接

| Agent | 领域 | 写入范围 |
|---|---|---|
| `embedded-lead` | 分诊、编排、最终汇总 | `.mcu-workbench/`、`docs/devlog/` |
| `system-architect` | 软件分层与迁移 | `docs/architecture/` |
| `firmware-engineer` | APP/OS/BSP/Core 集成实现 | 项目固件目录与配置 |
| `hardware-integration` | 板级连接与测量证据 | `hardware/`、`docs/verification/` |
| `toolchain-engineer` | 构建、烧录、链接、调试、观测 | 工具配置、`docs/verification/` |
| `verification-engineer` | 测试、质量、回归验证 | 测试目录、`docs/verification/` |
| `knowledge-engineer` | 日志、学习笔记、知识整理 | `docs/devlog/`、`docs/notes/` |

每次交接都必须给出 Summary、Evidence、Changed files、Tests、Artifacts、Blockers 和 Next handoff。专用 agent 不覆盖其他领域文件；Lead 负责最终汇总。所有记录使用唯一时间戳，禁止覆盖已有 run。

## 稳定产物

项目初始化：

```powershell
node scripts/agent-artifacts.js init --project . --project-id gr5526-lvgl --mcu GR5526 --toolchain Keil
```

写入运行记录：

```powershell
node scripts/agent-artifacts.js record --project . --agent system-architect --task "audit layers" --status completed --evidence docs/architecture/layers.md --artifact docs/architecture/layers.md
```

协议目录为 `.mcu-workbench/project.json`、`.mcu-workbench/runs/*.json`、`docs/architecture/`、`docs/verification/`、`docs/devlog/` 和 `docs/notes/`。Obsidian 写入必须经过用户确认。

本实现遵循 Claude Code 官方插件约定：插件根目录使用 `agents/`，不在 `plugin.json` 增加未经支持的 agents 字段，也不启用 hooks、MCP 或默认 settings agent。参见 [Plugins reference](https://code.claude.com/docs/en/plugins-reference) 与 [Create plugins](https://code.claude.com/docs/en/plugins)。
