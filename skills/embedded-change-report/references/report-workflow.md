# 报告工作流

当需要根据项目证据生成嵌入式变更报告时，使用本工作流。

## 1. 确定报告范围

识别：

- 报告目的：评审、发布、交付、缺陷关闭、客户沟通、内部归档。
- 目标读者：固件工程师、硬件工程师、测试工程师、项目经理、客户、认证评审人员。
- 证据范围：working tree diff、commit range、branch comparison、release tag、patch files、用户说明。
- 输出约束：Markdown、Word-ready Markdown、表格化摘要、简洁评审说明、正式发布报告。

如果用户说“current changes”或“当前修改”，默认使用 working tree 和 staged changes。
如果用户指定 branch、tag 或 commit range，则使用该范围。
如果范围含糊但 Git 可用，收集 `git status` 和近期 commits；只有多个可能范围会显著改变报告时才询问。

## 2. 收集证据

优先自动采集证据：

```bash
python <skill-dir>/scripts/collect_change_context.py --output change-context.json
```

加入可选证据：

- `--base` 和 `--head`：指定 commit range。
- `--build-log`：用于 Keil、IAR、CMake、PlatformIO、ESP-IDF、Make、Ninja 或 GCC 日志。
- `--test-log`：用于 unit、integration、HIL 或脚本化硬件测试。
- 用户提供时加入 `--serial-log`、`--can-log`、`--modbus-log` 或其他通信日志。
- 内存影响重要时，加入来自 `memory-analysis` 的 map/ELF 摘要。

如果证据由用户在聊天中手动提供，标注为用户提供证据，不要伪装成来自文件。

## 3. 规范化发现

按工程区域分组变更：

- 应用逻辑
- BSP / board configuration
- 外设驱动
- 通信协议
- RTOS task / scheduler / synchronization
- Interrupt / DMA / timing
- Boot / startup / linker / flash layout
- Build system / compiler options
- Configuration / calibration / production parameters
- Documentation / comments / generated code only

每个区域记录：

- 变更文件
- 变更内容
- 可能变更原因
- 直接影响
- 可能副作用
- 验证证据
- 缺失证据

## 4. 判断风险等级

默认风险映射：

- High：startup、linker、bootloader、flash layout、clock tree、power、watchdog、interrupt vector、ISR、DMA、RTOS scheduling、communication protocol compatibility、安全相关逻辑、production parameters。
- Medium：BSP pin mapping、peripheral init、driver state machine、persistent storage format、memory usage increase、compiler/build flags、error handling。
- Low：comments、docs、无行为变化的局部重构、test-only changes、formatting、logs、non-production debug text。

如果变更模块已经通过硬件验证、时序敏感、已量产或由多个产品共享，则提升风险。

## 5. 写报告

使用 `assets/` 中的模板。

保持以下区别清晰：

- 事实：直接可见于 diff、日志、commit 或用户提供产物。
- 分析：基于文件名、代码结构或嵌入式领域知识的工程推断。
- 验证：有精确来源的构建、测试或硬件证据。
- 风险：尚未被证据完全证明或排除的可能副作用。
- 待确认：缺失的硬件、需求、测试或评审输入。

## 6. 最终检查

最终输出前检查：

- 每个变更文件是否出现在范围或附录中？
- 高风险嵌入式区域是否被点名？
- 验证声明是否有证据支持？
- 缺失日志是否被如实标注？
- 回滚是否具体且可执行？
- 结论是否符合证据等级？
