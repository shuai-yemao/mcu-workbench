# 工作流详情

当请求涉及生成嵌入式单元测试、回归测试或测试计划时，使用本工作流。

## 1. 确定目标范围

识别最小可测试单元：

- 一个源模块及其 public header
- 一组共享状态的函数
- 一个 bugfix diff
- 一个 protocol parser/encoder
- 一个 state machine 或 RTOS task helper

如果用户要求测试整个固件工程，先提出模块分组，并从最安全的纯逻辑模块开始。

## 2. 收集证据

收集：

- 目标 source 和 header 文件
- 既有测试和测试框架文件
- `CMakeLists.txt`、`Makefile`、`platformio.ini`、`.uvprojx`、`.ewp` 或 `project.yml` 等构建系统文件
- 用于回归测试的 Git diff 或 commit range
- 断言需要业务意图时，收集 requirement、issue、bug report 或 user story
- 只有在总结实际结果时，才使用先前测试运行日志

优先用脚本发现，再直接检查相关文件，然后生成断言。

## 3. 判断什么可以测试

把目标代码分类为：

- 可直接单元测试的逻辑
- 通过 mock/stub 依赖可测试
- 需要重构后才可单元测试
- 只能做集成或硬件验证

不要为代码或需求中不可见的行为生成断言。

## 4. 生成测试矩阵

每个候选用例包含：

- Case ID
- Function 或 behavior
- Inputs 和 preconditions
- Mock/stub setup
- Expected result
- Evidence source
- Status：ready、inferred、pending confirmation 或 not unit-testable

除非用户明确要求 draft placeholders，否则只为 `ready` 用例生成代码。

初版矩阵可运行：

```bash
python <skill-dir>/scripts/generate_test_matrix.py --analysis module-analysis.json --output test-matrix.md
```

把生成的 `pending` 行视为用户确认或需求查证提示，不要视为最终断言。

## 5. 生成测试代码

如果项目已有测试风格，遵循现有风格。保留命名约定和目录结构。

TODO expectations 被替换为有证据支持的断言，并且测试构建已执行前，生成的 skeleton 都是 `skeleton-only`。

如果没有既有风格：

- 简单 C 模块使用 Unity。
- 项目可接受 Ruby-based test runner 和 CMock 时使用 Ceedling。
- 需要 C-compatible mocks 的 C/C++ 嵌入式项目使用 CppUTest。
- 项目已有 CMake/C++ host testing 时使用 GoogleTest。

## 6. 验证

只有命令和环境清晰且安全时才运行测试。总结：

- Test command
- Exit status
- Passed/failed/ignored counts
- Failure names 和第一条相关 message
- 是否测量了 coverage

如果未运行，写 `未执行`，并列出缺失的命令或环境。
