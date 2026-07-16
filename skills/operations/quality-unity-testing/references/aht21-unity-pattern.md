# AHT21 Unity 工程参考

来源：`BSP/AHT21/Test/aht21_unity_test.c`、`User/Debug/Src/debug.c`、`Core/Src/freertos.c` 和 Keil `.uvprojx`。

## 入口与隔离

- `aht21_unity_test.c` 在 `UNITY_SMOKE_TEST` 下编译，统一提供 `aht21_unity_test_run()`，同时覆盖 Driver 与 Handler。
- `debug.c` 负责 `UNITY_BEGIN()`、基础 Unity 断言、模块 runner 和 `UNITY_END()`；不要在同一固件 Target 再定义测试 `main()`。
- `freertos.c` 通过 `UNITY_SMOKE_TEST` 在测试 runner 与正常 `system_init_resources()` 路径之间切换。
- 关闭测试宏后，测试源可以保留在工程分组，但不能引入测试入口、测试状态或生产链接冲突。

## 当前测试组织

Driver 测试覆盖实例化、参数、I2C/状态失败回滚、温度、湿度、忙超时、CRC、公式边界、睡眠/唤醒、反初始化和销毁。Handler 测试覆盖实例化依赖、容量、注册、队列/线程失败、事件读取、时间基准、错误传播和清理。

## RTT/elog 规则

Unity 字符输出应先按行缓存并转交工程 logger，保持 `I/UNITY` 行格式。测试构建应使用足够的 RTT 上行缓冲和不丢失汇总的阻塞策略；验收必须看到完整测试数量、失败数量和最终 `OK`，不能只看最后一行。

## 迁移时重新确认

不同工程可能使用 UART、RTT、printf 或其他 logger；重新读取其 Unity 输出适配和构建宏。必须分别验证测试 Target、正常 Target 和目标板真实外设行为。
