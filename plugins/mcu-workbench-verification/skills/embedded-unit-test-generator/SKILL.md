---
name: embedded-unit-test-generator
description: >-
  用于为嵌入式 C/C++ 固件、单片机模块、RTOS 任务、BSP/驱动、协议栈、算法模块或 bugfix diff 生成规范的单元测试计划、测试用例矩阵、Unity/Ceedling/CppUTest/GoogleTest
  测试骨架和 mock/stub 建议。适用于用户要求为嵌入式固件代码生成 unit tests、test cases、test plans、test skeletons、mock strategy、regression tests
  或 coverage-oriented tests。该 skill 会从源文件、头文件、Git diff、构建系统、既有测试和项目结构中收集证据，并区分自动发现事实、工程推断和用户确认信息。
---

# Embedded Unit Test Generator

为嵌入式 C/C++ 项目生成工程级单元测试计划和测试骨架。把生成的测试当作可追溯工程工件：每个期望行为都必须来自代码证据、既有测试、需求、issue 说明，或明确标注的工程推断。

## 工作流

1. 识别测试目标：
   - 指定的 `.c`、`.h`、`.cpp` 或 `.hpp` 模块
   - driver、BSP 层、协议模块、算法模块、RTOS 任务或 middleware 组件
   - 需要回归测试的 Git diff、commit range 或 bugfix
   - 用户提供的需求、缺陷说明或验收标准

2. 写测试前先收集证据：
   - 优先在项目根目录运行 `scripts/collect_unit_test_context.py`。
   - 对特定源文件，运行 `scripts/analyze_c_module.py --source <file>`。
   - 纳入用户提供的需求、bug 描述、测试日志、既有测试文件、compile commands 或构建输出。
   - 依赖采集结果前，先检查 `ok`、`status`、`warnings` 和 `evidence_gaps`。
   - 证据缺失时，只能带着明确标注的假设和待确认项继续。

3. 分类信息来源：
   - 判断什么可自动发现、什么可推断、什么必须用户确认前，先读 `references/information-source-map.md`。
   - 必要时使用标签：`自动发现`、`工程推断`、`用户确认`、`待用户确认`。
   - 不要把从命名或注释推断出的可能行为写成已验证需求。

4. 选择测试策略：
   - 选择 Unity/Ceedling、CppUTest、GoogleTest、CTest 或最小自定义 harness 时，阅读 `references/framework-selection.md`。
   - 目标涉及寄存器、HAL/BSP、中断、DMA、timer、clock、power、flash、boot、通信总线或 RTOS 调度时，阅读 `references/embedded-test-risk-taxonomy.md`。
   - 对纯逻辑、parser、state machine、转换函数、checksum 和协议 framing，优先使用 host unit tests。
   - 面向硬件的模块要隔离纯逻辑并生成 mock/stub 边界，不要假装硬件行为已经被单元测试验证。

5. 先生成测试计划，再生成代码：
   - 使用 `assets/test-case-matrix-template.md` 或 `assets/test-plan-template.md`。
   - 优先运行 `scripts/generate_test_matrix.py --analysis <analysis.json>`，根据发现的函数和依赖风险生成初版矩阵。
   - 覆盖正常路径、边界值、非法输入、错误返回、状态迁移、回归用例和依赖失败，但前提是有证据支持。
   - 未确认行为标为 `待用户确认`；除非用户确认，否则不要编码成断言。

6. 生成测试代码：
   - Unity 或简单 C 测试使用 `assets/unity-test-template.c`。
   - 项目使用或准备采用 Ceedling 时，使用 `assets/ceedling-project-snippet.yml`。
   - 使用 CppUTest 的 C/C++ 项目用 `assets/cpputest-test-template.cpp`。
   - 使用 GoogleTest 的 CMake/C++ host tests 用 `assets/googletest-test-template.cpp`。
   - 能提取函数签名时，用 `scripts/generate_test_skeleton.py` 生成初版 skeleton。
   - TODO 断言被替换且测试构建已执行前，生成的 skeleton 都是 `skeleton-only`。

7. 验证或报告限制：
   - 如果测试命令存在且运行安全，运行测试并用 `scripts/summarize_test_results.py` 汇总结果。
   - 如果生成了测试但未执行，说明 `已生成，未执行`。
   - 没有真实证据时，不要声称 pass/fail、覆盖率百分比、硬件验证、时序验证或回归闭环。

## 证据收集

尽量在嵌入式项目根目录运行：

```bash
python <skill-dir>/scripts/collect_unit_test_context.py --project-root . --output unit-test-context.json
```

常用选项：

```bash
python <skill-dir>/scripts/collect_unit_test_context.py --project-root . --target Src/foo.c --base main --head HEAD --output unit-test-context.json
python <skill-dir>/scripts/analyze_c_module.py --source Src/foo.c --include Include/foo.h --output foo-analysis.json
python <skill-dir>/scripts/generate_test_matrix.py --analysis foo-analysis.json --output foo-test-matrix.md
python <skill-dir>/scripts/generate_test_skeleton.py --analysis foo-analysis.json --framework unity --placeholder skip --output test_foo.c
python <skill-dir>/scripts/summarize_test_results.py --log build/test.log --framework ceedling --output test-summary.json
```

如果项目没有 Git 仓库或没有构建/测试系统，就收集 source/header 文件、既有测试和用户提供的需求。只有断言会变成猜测时，才要求补充缺失需求。

## 可测试性规则

- 优先测试输入输出清晰的确定性逻辑。
- 建议中把硬件访问与逻辑分离，但除非用户明确要求并确认编辑边界，不要修改生产代码。
- volatile 寄存器、ISR 行为、DMA 完成、时钟时序、看门狗行为、Flash erase/write 和总线电气行为属于集成或硬件验证，除非已有 simulator/fake 层。
- 对 RTOS 任务，单元测试抽取出的状态机或 helper 函数；除非存在确定性的 RTOS test harness，不要声称调度器行为已被单元测试覆盖。
- 对 STM32CubeMX 等生成代码区域，除非用户要求重构计划，不要建议直接修改 user-code 区域之外的生产代码。

## 输出规则

- 使用用户要求的语言；中文请求默认用简体中文。
- 可用时保留精确文件路径、函数名、宏、enum 值、寄存器名、错误码和测试命令输出。
- 对非平凡模块，在生成代码前包含紧凑测试矩阵。
- 将生成的测试代码与假设、待确认项分开。
- 说明代码状态是 `test-plan`、`skeleton-only`、`draft assertions` 还是 `executed tests`。
- 不受支持的声明标为 `未提供证据`、`未验证`、`工程推断` 或 `待用户确认`。
- 不隐藏缺失 mock、未编译测试、未解析依赖或不可单测的硬件路径。
- 除非用户要求写入项目文件，默认使用简洁 Markdown。

## 与其他嵌入式 Skill 集成

需要对应证据时使用这些 skill：

- 修改生产代码或项目构建文件前使用 `embedded-llm-guardrails`。
- 测试依赖项目构建环境时，使用 `build-cmake`、`build-keil`、`build-iar`、`build-platformio` 或 `build-idf`。
- 测试目标来自缺陷高发代码或 MISRA/static-analysis findings 时，使用 `static-analysis`。
- 单元测试改动影响构建 flags、库或重型测试插桩时，使用 `memory-analysis`。
- `serial-monitor`、`can-debug`、`modbus-debug` 或 `rtos-debug` 只能提供集成证据；不要把这些结果标为纯单元测试。

## Agent 兼容性

- Codex 调用方式：`$embedded-unit-test-generator`
- Claude Code 调用方式：`/embedded-unit-test-generator`
- Codex 安装路径：`%USERPROFILE%\.codex\skills\embedded-unit-test-generator`
- Claude Code 个人安装路径：`%USERPROFILE%\.claude\skills\embedded-unit-test-generator`
- Claude Code 项目内安装路径：`<project-root>\.claude\skills\embedded-unit-test-generator`
- 在安装、分享或复制到其他 agent 前阅读 `README.md`。

## 资源

- 安装和使用指南：`README.md`
- 工作流详情：`references/workflow.md`
- 框架选择：`references/framework-selection.md`
- 测试用例设计：`references/test-case-design.md`
- Mock 和 stub 策略：`references/mock-stub-strategy.md`
- 嵌入式风险分类：`references/embedded-test-risk-taxonomy.md`
- 覆盖率和验证措辞：`references/coverage-and-verification.md`
- 信息来源地图：`references/information-source-map.md`
- 最终质量准则：`references/quality-rubric.md`
- 测试计划模板：`assets/test-plan-template.md`
- 测试矩阵模板：`assets/test-case-matrix-template.md`
- 矩阵生成器：`scripts/generate_test_matrix.py`
- 框架模板：`assets/unity-test-template.c`、`assets/cpputest-test-template.cpp`、`assets/googletest-test-template.cpp`、`assets/ceedling-project-snippet.yml`
