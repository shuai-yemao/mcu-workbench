---
description: 列出 MCU-Workbench 嵌入式开发 agent 团队（7 个）
agent: general
---

You are using the MCU-Workbench embedded development agent team. Here is the team roster:

| Agent | 领域 | 写入范围 | 命令 |
|---|---|---|---|
| embedded-lead | 项目协调 | .mcu-workbench/, docs/devlog/ | /mcu-embedded-lead |
| firmware-engineer | 固件实现 | 项目固件目录与配置 | /mcu-firmware-engineer |
| hardware-integration | 硬件集成 | hardware/, docs/verification/ | /mcu-hardware-integration |
| knowledge-engineer | 知识沉淀 | docs/devlog/, docs/notes/ | /mcu-knowledge-engineer |
| system-architect | 分层架构 | docs/architecture/ | /mcu-system-architect |
| toolchain-engineer | 工具链 | 工具配置, docs/verification/ | /mcu-toolchain-engineer |
| verification-engineer | 验证质量 | 测试目录, docs/verification/ | /mcu-verification-engineer |

推荐工作流：
1. embedded-lead 分析需求和项目状态
2. system-architect 设计软件分层和接口
3. firmware-engineer 实现固件代码
4. hardware-integration 验证板级连接
5. toolchain-engineer 管理构建/烧录/调试
6. verification-engineer 执行测试和回归
7. knowledge-engineer 整理开发日志和笔记

根据用户需求 $ARGUMENTS，推荐最合适的 agent 并建议使用对应命令。
