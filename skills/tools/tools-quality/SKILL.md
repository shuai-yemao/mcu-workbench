---
name: tools-quality
description: 负责嵌入式项目的代码质量门禁：必要注释、公开 API Doxygen、格式检查、代码审查、Cppcheck、MISRA 和静态质量报告。项目级验证、Map/RAM/ROM/栈分析与 Unity 测试交给 tools-verification。
---

# 代码质量工具

## 职责

统一执行和记录嵌入式 C/C++ 的代码质量检查，覆盖 AI 生成代码、代码生成器产物、人工新增/修改代码和已有代码重审。检查范围包括：

- 必要的文件/模块说明、公开 API Doxygen，以及表达所有权、阻塞/ISR/DMA/并发、硬件约束和错误恢复所必需的中文注释；
- 项目格式规则、`.editorconfig`、`.clang-format`、80 列硬限制及相邻源码风格；
- 编译器诊断、Cppcheck、MISRA 规则和项目静态分析配置；
- 代码审查中的接口契约、错误路径、资源所有权、边界、ISR/DMA/并发和分层问题；
- 质量问题的严重级别、基线差异、定位、修复建议和复检证据。

## 路由边界

本 Skill 是唯一的代码质量检查入口。它不承担链接 Map 文件解析、RAM/ROM/栈占用分析、Unity/Fake 测试编排、目标板运行观测或发布验证；这些交给 [`tools-verification`](../tools-verification/SKILL.md)、[`tools-observability`](../tools-observability/SKILL.md)、[`tools-build`](../tools-build/SKILL.md) 或 [`tools-release`](../tools-release/SKILL.md)。

静态检查只能说明源码或配置满足检查规则，不能证明目标板运行、时序、DMA、IRQ 或硬件电平正确。需要运行时证据时，必须明确交接给验证、调试或观测流程。

## 输入与规则优先级

开始前声明：变更范围、绝对项目根目录、分支/提交或 diff、受管辖目录、第三方 Vendor 排除项、工具版本、配置文件、质量基线和输出位置。

规则优先级固定为：

1. 用户明确要求；
2. 目标工程的 `.editorconfig`、`.clang-format`、编译/构建配置和已确认的质量配置；
3. 目标目录相邻源码的稳定写法；
4. 本 Skill 的 [`style-profile.md`](references/style-profile.md) 与 [`review-gates.md`](references/review-gates.md)；
5. 保守的 C/C++ 默认规则。

任何偏差都要记录来源、适用范围、理由和是否需要用户确认。不能用猜测补齐缺失的项目规则。

## 执行流程

### 1. 先确定范围和基线

检查 `git status`、目标 diff、工程配置和相邻源码，区分新增问题与既有基线问题。记录每条命令的绝对 `cwd`、工具版本、退出码、检查文件范围和 `relative/path:line` 定位。

### 2. 注释与 API 文档

检查文件/模块职责、公开函数/类型的 Doxygen、参数、返回值、所有权、生命周期、阻塞属性、ISR/DMA/并发约束、硬件限制和错误恢复说明。注释必须解释非显然约束，不得逐行翻译实现、推测不存在的硬件事实或掩盖功能缺陷。

### 3. 格式检查

优先使用项目已有的格式工具和配置。适用时运行 `clang-format --dry-run --Werror`，并运行 `git diff --check`。格式整改只能改格式，不得改变函数签名、控制流、常量、数据结构、资源路径或包含依赖。

### 4. Cppcheck 与静态分析

按项目配置执行 Cppcheck 和已有静态分析入口，记录规则集、抑制项、工具版本、扫描范围和退出码。必须区分 error、warning、style、performance、portability、information 与基线问题；不能把静态告警直接改写为运行时故障或目标板结论。

### 5. MISRA 规则

按项目采用的 MISRA 版本和规则元数据执行检查。每条偏差必须标明规则编号、严重级别、代码位置、是否属于已有基线、处置方式和复检证据。缺少规则映射时标记 `UNMAPPED`，不得假称已完成 MISRA 合规认证。

### 6. 代码审查与报告

使用 [`capability-index.md`](references/capability-index.md) 选择详细检查表，分离报告：风格/注释、静态规则、功能风险、接口/资源所有权、ISR/DMA/并发、安全和分层问题。代码审查可提出问题，但不擅自扩大实现范围。

## 受限整改

`workflow-final-review` 或用户明确授权时，本 Skill 只能直接写回格式问题和必要注释。Cppcheck、MISRA、接口、功能、架构、安全、资源生命周期和并发问题必须交回对应实现或验证流程处理。整改前后必须审阅 diff，确认无行为变化，再用同一工具和范围复检。

## 固定输出

输出至少包含：

- 检查范围、项目根目录、基线和规则来源；
- 命令、绝对 `cwd`、工具版本、退出码和检查文件；
- 注释/格式、Cppcheck、MISRA 和代码审查结果；
- 每个问题的严重级别、`relative/path:line`、影响、修复建议和基线标记；
- 整改前后 diff 审阅、复检结果、未验证项和 `通过`/`阻塞` 结论。

## 参考资料

- [`capability-index.md`](references/capability-index.md)
- [`style-profile.md`](references/style-profile.md)
- [`review-gates.md`](references/review-gates.md)
- [`quality-code-review`](references/capabilities/quality-code-review/GUIDE.md)
- [`quality-format-check`](references/capabilities/quality-format-check/GUIDE.md)
- [`quality-static-analysis`](references/quality-static-analysis/GUIDE.md)
