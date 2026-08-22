# AGENTS.md — MCU-Workbench OpenCode 集成

插件根目录的 `agents/*.md` 同时面向 OpenCode 和 Claude Code。OpenCode 通过 `opencode.mjs` 将全部 agent（名册由 `lib/agent-domains.js` 的 `AGENT_ROSTER` 定义）暴露为可调用工具；Claude Code 自动发现 `agents/` 目录。

## Agent 团队

| Agent | 领域 | 工具 ID | 写入范围 |
|---|---|---|---|
| `embedded-lead` | 项目协调 | `mcu_agent_embedded_lead` | `.mcu-workbench/`、`00_Docs/06_嵌入式插件输出/devlog/` |
| `system-architect` | 分层架构 | `mcu_agent_system_architect` | `00_Docs/06_嵌入式插件输出/architecture/` |
| `firmware-engineer` | 固件实现 | `mcu_agent_firmware_engineer` | 项目固件目录与配置 |
| `hardware-integration` | 硬件集成 | `mcu_agent_hardware_integration` | `hardware/`、`00_Docs/06_嵌入式插件输出/verification/` |
| `toolchain-engineer` | 工具链 | `mcu_agent_toolchain_engineer` | 工具配置、`00_Docs/06_嵌入式插件输出/verification/` |
| `verification-engineer` | 验证质量 | `mcu_agent_verification_engineer` | 测试目录、`00_Docs/06_嵌入式插件输出/verification/` |
| `knowledge-engineer` | 知识沉淀 | `mcu_agent_knowledge_engineer` | `00_Docs/06_嵌入式插件输出/devlog/`、`00_Docs/06_嵌入式插件输出/notes/` |

## 在 OpenCode 中使用

### Agent 工具

OpenCode 加载插件后，每个 agent 以独立 tool 形式暴露。直接调用 tool 即可获取该 agent 的完整系统提示词和工作流说明。

**路由工具** `mcu_workbench_agent_route`：
根据用户的嵌入式需求推荐最合适的 agent，返回 agent 信息及其系统提示词。

### 开发工作流

推荐的标准流程：

```
embedded-lead → system-architect → firmware-engineer → verification-engineer
                    ↓
            hardware-integration / toolchain-engineer
                    ↓
              knowledge-engineer
```

1. 先用 `embedded-lead` 分析需求和项目状态
2. `system-architect` 设计软件分层和接口
3. `firmware-engineer` 实现固件代码
4. `hardware-integration` 验证板级连接
5. `toolchain-engineer` 管理构建/烧录/调试
6. `verification-engineer` 执行测试和回归
7. `knowledge-engineer` 整理开发日志和笔记

## Agent 交接规范

每次交接需包含：
- Summary — 完成的工作摘要
- Evidence — 文件路径、命令输出、测量数据
- Changed files — 修改的文件列表
- Tests — 测试结果
- Artifacts — 输出产物路径
- Blockers — 阻塞项
- Next handoff — 下一个交接目标

## 运行产物

```powershell
node scripts/agent-artifacts.js init --project . --project-id <name> --mcu <chip> --toolchain <tool>
node scripts/agent-artifacts.js record --project . --agent <name> --task "<desc>" --status completed --evidence <path> --artifact <path>
```

协议目录：`.mcu-workbench/project.json`、`.mcu-workbench/runs/*.json`、`00_Docs/06_嵌入式插件输出/architecture/`、`00_Docs/06_嵌入式插件输出/verification/`、`00_Docs/06_嵌入式插件输出/devlog/`、`00_Docs/06_嵌入式插件输出/notes/`
