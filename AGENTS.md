# AGENTS.md — MCU-Workbench Agent 协作指南

插件根目录的 `agents/*.md` 定义嵌入式开发角色；Claude Code、Codex 和 Cursor 的发现及调用方式由各自宿主配置决定。Agent 名册由 `lib/agent-domains.js` 的 `AGENT_ROSTER` 定义。

## Agent 团队

| Agent | 领域 | 写入范围 |
|---|---|---|
| `embedded-lead` | 项目协调 | `.mcu-workbench/`、`00_Docs/06_嵌入式插件输出/devlog/` |
| `system-architect` | 分层架构 | `00_Docs/06_嵌入式插件输出/architecture/` |
| `firmware-engineer` | 固件实现 | 项目固件目录与配置 |
| `hardware-integration` | 硬件集成 | `hardware/`、`00_Docs/06_嵌入式插件输出/verification/` |
| `toolchain-engineer` | 工具链 | 工具配置、`00_Docs/06_嵌入式插件输出/verification/` |
| `verification-engineer` | 验证质量 | 测试目录、`00_Docs/06_嵌入式插件输出/verification/` |
| `knowledge-engineer` | 知识沉淀 | `00_Docs/06_嵌入式插件输出/devlog/`、`00_Docs/06_嵌入式插件输出/notes/` |

## 开发工作流

```text
embedded-lead → system-architect → firmware-engineer → verification-engineer
                    ↓
            hardware-integration / toolchain-engineer
                    ↓
              knowledge-engineer
```

1. `embedded-lead` 分析需求和项目状态。
2. `system-architect` 设计软件分层和接口。
3. `firmware-engineer` 实现固件代码。
4. `hardware-integration` 验证板级连接。
5. `toolchain-engineer` 管理构建、烧录和调试。
6. `verification-engineer` 执行测试和回归。
7. `knowledge-engineer` 整理开发日志和笔记。

## Agent 交接规范

每次交接需包含 Summary、Evidence、Changed files、Tests、Artifacts、Blockers 和 Next handoff。

## 运行产物

```powershell
node scripts/agent-artifacts.js init --project . --project-id <name> --mcu <chip> --toolchain <tool>
node scripts/agent-artifacts.js record --project . --agent <name> --task "<desc>" --status completed --evidence <path> --artifact <path>
```

协议目录：`.mcu-workbench/project.json`、`.mcu-workbench/runs/*.json`、`00_Docs/06_嵌入式插件输出/architecture/`、`00_Docs/06_嵌入式插件输出/verification/`、`00_Docs/06_嵌入式插件输出/devlog/`、`00_Docs/06_嵌入式插件输出/notes/`。

Agent 遵循分域写入和显式交接协议；Lead 维护最终汇总，写入 Obsidian 必须经过用户确认。
