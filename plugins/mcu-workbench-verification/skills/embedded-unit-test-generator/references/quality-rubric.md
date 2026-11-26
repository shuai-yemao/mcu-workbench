# 质量准则

生成测试定稿前检查：

- 已命名目标模块和框架。
- 非平凡工作有测试矩阵。
- 生成代码状态明确：`skeleton-only`、`draft assertions` 或 `executed`。
- 每个断言都有证据来源，或标为 pending。
- 没有夸大硬件相关行为。
- 已列出 mocked dependencies。
- 生成文件遵循项目命名和目录约定。
- 测试原则上能编译：include、function names 和 fixture names 连贯。
- 未解决依赖和缺失构建命令已披露。
- 没有编造测试结果、覆盖率结果或硬件验证。
- 除非用户明确要求并确认编辑范围，否则不修改生产代码。
