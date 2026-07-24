---
name: tools-quality
description: 负责嵌入式代码审查、Map 分析、静态分析、MISRA 和 Unity 测试；当用户要求质量门禁、内存占用分析或单元测试时使用。
---

# 质量与验证工具

## 职责

统一处理代码审查、编译产物分析、静态规则、内存占用和目标无关的 Unity 测试。先声明检查范围、基线和输出格式，再选择工具变体。

## 变体

代码审查、Map 分析、静态分析和 Unity 的原始资料分别保留在 `references/quality-*/GUIDE.md` 下；需要脚本时使用对应命名空间中的脚本。

Unity 源码版本和测试证据见 [`upstream-source-baseline.md`](references/upstream-source-baseline.md)。
AI 协作编码规范、审查清单与质量工具完整流程见 [`capability-index.md`](references/capability-index.md)。

## 输出

输出可复现命令、问题等级、证据文件、基线差异和修复后的回归结果。构建产物由 [`tools-build`](../tools-build/SKILL.md) 提供，发布验证交接 [`tools-release`](../tools-release/SKILL.md)。
