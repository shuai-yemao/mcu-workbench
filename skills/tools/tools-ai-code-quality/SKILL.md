---
name: tools-ai-code-quality
description: 解析目标项目的嵌入式 C 代码风格，为 AI 生成提供约束，并独立审查生成代码的风格、功能和安全风险。用户要求统一代码格式、修正 AI 生成代码注释、制定生成约束或审查 AI 输出时使用。
---

# AI 代码风格与审查

## 职责

以目标项目事实而不是固定模板约束 AI 输出。先按 [项目风格 profile](references/style-profile.md) 解析风格，再按 [审查门禁](references/review-gates.md) 检查代码；通用静态分析、Map 和 Unity 测试仍交给 [`tools-quality`](../tools-quality/SKILL.md)。

## 执行顺序

1. 读取用户要求、格式配置、相邻源码和构建配置，建立可追溯的 profile。
2. 在生成或重构前展示 profile 来源与适用范围；冲突按 profile 优先级裁决。
3. 审查时将“违反已确认 profile”与“功能/安全风险”分开分级。
4. 仅在项目或用户明确采用时使用 Doxygen、文件前缀或额外命名规则。

## 禁止

- 不强制 `ec_*` 文件名前缀、变量前缀或全函数 Doxygen。
- 不使用居中横线分隔注释，不将 80 列当作硬限制。
- 不因风格问题把已验证的功能缺陷降级，也不将风格偏好伪装成安全问题。

## 参考

- [项目风格 profile](references/style-profile.md)
- [生成代码审查门禁](references/review-gates.md)
- [迁移比对资料](references/capability-index.md)
