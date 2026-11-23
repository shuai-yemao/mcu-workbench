# 框架选择

优先根据项目证据选择框架，而不是个人偏好。

## 检测线索

- Ceedling：`project.yml`、`test/`、`vendor/ceedling`、`ceedling`、`CMock`、`Unity`
- Unity only：`unity.h`、`Unity`、`TEST_ASSERT_*`、`RUN_TEST`
- CppUTest：`CppUTest`、`TEST_GROUP`、`TEST`、`MockSupport`
- GoogleTest：`gtest`、`gmock`、`TEST_F`、`EXPECT_EQ`、`add_subdirectory(googletest)`
- CTest/CMake：`enable_testing()`、`add_test`、`ctest`、`compile_commands.json`
- PlatformIO Unity：`platformio.ini`、`test/`、`pio test`

## 默认选择

没有既有框架时，C 模块默认使用 Unity。它轻量，且在 embedded C 中常见。

使用 Ceedling 的场景：

- 用户需要自动 mock 生成。
- 项目中已经有 Ruby/Ceedling。
- 多个 C 模块需要重复 host tests。

使用 CppUTest 的场景：

- 项目混合 C 和 C++。
- 团队偏好 C++ test harness，但通过 `extern "C"` 测试 C 模块。
- 需要 mock support，但不想引入 Ceedling。

使用 GoogleTest 的场景：

- 项目已经使用 CMake host tests。
- 目标模块是 C++，或很容易包装。
- gMock 已经可用。

## 避免不安全选择

- 未经用户确认，不要把新框架引入生产构建文件。
- host unit test 能覆盖行为时，不要选择 target-board test。
- 对需要真实外设时序的代码，除非硬件访问已抽象，否则不要选择 host tests。
