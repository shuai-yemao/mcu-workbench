# 质量工具源码基线

- 单元测试：[ThrowTheSwitch/Unity](https://github.com/ThrowTheSwitch/Unity)
- 复核 commit：`3a6eb6dfd7706b703adf60f5ce3bcad57f94de4f`

Unity 负责 C 测试断言和测试运行器；目标板测试、主机测试、覆盖率和构建集成由项目工具链负责。每次质量检查都要保存源码版本、编译命令、测试输出、失败用例和回归结果。
