# 信息来源地图

使用这些标签，让生成的测试保持诚实。

## 自动发现

可来自：

- 源代码和头文件
- 函数签名
- Macro 和 enum 定义
- 既有测试
- 构建文件
- Git diff 和 commit message
- 测试日志和覆盖率报告
- `.ioc`、`sdkconfig`、`platformio.ini`、`CMakeLists.txt`、`.uvprojx`、`.ewp` 等配置文件

示例：

- 函数 `foo_init` 返回 `int`。
- 既有测试使用 Unity。
- 变更文件触及 `Drivers/`。
- 代码检查 `NULL` 并返回 `ERR_INVALID_ARG`。

## 工程推断

可来自：

- 命名约定
- 常见嵌入式模式
- 文件路径语义
- 依赖调用
- 没有规范性措辞的注释

示例：

- 名为 `parse_frame` 的函数很可能需要 malformed-frame 测试。
- `BSP/` 下的文件很可能涉及硬件抽象。
- `HAL_I2C_Master_Transmit` 调用提示存在 I2C 依赖。

工程推断可以指导 draft cases，但没有确认或代码证据时，不应变成硬断言。

## 用户确认

以下信息需要用户确认：

- 需求意图
- 代码含糊时的正确行为
- 可接受误差
- 硬件 setup
- safety 或 regulatory 覆盖要求
- 是否允许引入新测试框架
- 是否允许为可测试性重构生产代码
- mock 是否代表可接受验证

## 待用户确认

当测试会编码一个合理但未证明的行为时，使用此标签。
