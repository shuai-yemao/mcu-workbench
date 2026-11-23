# 信息来源地图

用本文件判断哪些报告字段可以自动发现、哪些属于工程推断、哪些需要用户确认。

## 来源标签

当某个声明可能被质疑时，在报告中使用这些标签：

- `自动发现`：从项目文件、Git、日志、构建产物、map/ELF 报告或仓库已有文档中直接提取。
- `工程推断`：从文件路径、命名约定、代码结构、变更模块或嵌入式开发模式推断。
- `用户确认`：由用户或项目负责人明确提供。
- `待用户确认`：强结论所必需，但当前不可用。

## 可自动发现的信息

AI 可以从工程工作区提取：

- 项目类型：STM32CubeMX、Keil、IAR、CMake、PlatformIO、ESP-IDF、Arduino、Makefile 或 bare-metal layout。
- 工具链和构建系统标记：`.uvprojx`、`.ewp`、`CMakeLists.txt`、`platformio.ini`、`sdkconfig`、`Makefile`、`.ioc`、`.mex`。
- Git 元数据：branch、commit、tag、status、diff stat、changed files、added/deleted files、staged files、untracked files、recent commits。
- 变更文件类别：application、BSP、HAL/SDK、driver、interrupt、DMA、RTOS、protocol、startup、linker、build config、generated code。
- 路径风险线索：`startup_*.s`、`*.ld`、`*.icf`、`*_it.c`、`bsp/`、`drivers/`、`FreeRTOS`、`platformio.ini`、`.ioc`、`sdkconfig`。
- MCU 线索：startup 文件名、linker scripts、`.ioc`、`.uvprojx`、`platformio.ini`、HAL/SDK 目录名、`STM32F407xx` 等宏。
- 外设线索：init 文件、HAL MSP 文件、BSP 文件、driver 名称、CubeMX `.ioc`、pinmux 文件、device tree 文件。
- 有日志时的构建证据：成功/失败、error/warning 数量估计、输出产物名、选定 Flash/RAM 行。
- 有 map/ELF/report 文件时的内存证据：Flash/RAM 用量、符号大小线索、有 baseline 时的前后尺寸变化。
- 有日志时的验证证据：串口日志、CAN 日志、Modbus 日志、单元测试日志、HIL 日志、静态分析报告。
- 版本线索：Git tags、commit messages、version headers、release note drafts、artifact names。

## 工程推断

AI 可以推断这些信息，但必须标为推断：

- 变更文件的可能模块职责。
- 修改 driver、ISR、DMA、RTOS task、clock、boot 或 linker 文件带来的可能硬件影响。
- 可能需要硬件验证。
- parser、register-map、CAN ID、timeout 或 frame-format 变化带来的协议兼容性风险。
- 新 buffer、更大表、栈分配或 map 增长带来的内存风险。
- 基于 diff 推断的可能回滚文件或 commit。

可使用类似措辞：

- `基于文件路径和 diff 判断`
- `从工程结构推断`
- `从变更模块推断`
- `该结论需要结合硬件验证确认`

## 需要用户确认的信息

不要编造或静默假设这些内容：

- 真实变更背景、需求意图、客户请求或缺陷优先级。
- 根因是否已被工程、QA 或客户接受。
- 是否执行了硬件验证。
- 观测行为是否满足 pass/fail 标准。
- warning 是否符合项目策略。
- 没有阈值时，内存使用是否可接受。
- 固件是否获准发布或投产。
- 客户或现场影响、现场风险。
- 验证中实际使用的硬件版本。
- 外部器件型号、I2C 地址、SPI mode、CAN baud rate、register 含义或协议版本，除非产物中有记录。
- 已部署产品中的回滚安全性。
- certification、safety 或 compliance 状态。
- 自动脱敏后的日志是否可对外分享。

当报告需要其中任一项时，使用 `待用户确认`。

## 报告模式

复杂或面向发布的报告中，加入简短来源摘要：

```markdown
## 信息来源分层

| 信息 | 来源类型 | 证据 / 状态 |
| --- | --- | --- |
| 变更文件清单 | 自动发现 | git diff |
| 影响 CAN 驱动 | 工程推断 | 文件路径包含 drivers/can |
| 上板验证结果 | 待用户确认 | 未提供串口/CAN/测试日志 |
```

## 决策规则

不确定时：

1. 只有直接证据才用 `自动发现`。
2. 合理技术解释使用 `工程推断`。
3. 业务、验证、发布、客户或接受类声明使用 `待用户确认`。
