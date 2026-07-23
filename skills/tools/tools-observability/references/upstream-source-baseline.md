# 运行时观测源码基线

| 组件 | 来源与复核 commit | 目标端内容 |
| --- | --- | --- |
| RTT | [SEGGERMicro/RTT](https://github.com/SEGGERMicro/RTT) · `4d8feab3150f86f37a9d323ddc88d6cdf5673072` | `SEGGER_RTT.c`、`SEGGER_RTT_Conf.h`、通道和 Syscalls |
| SystemView | [SEGGERMicro/SystemView](https://github.com/SEGGERMicro/SystemView) · `92ca7a810c5765ba64911919acd511c61b6b083f` | Target、RTOS patch、事件时间戳 |
| EasyLogger | [armink/EasyLogger](https://github.com/armink/EasyLogger) · `a596b2642e27af3a2dbdeb0e5f04a6b5b673ef24` | 级别、标签、过滤、同步/异步输出和后端 |

采集证据必须包含目标端配置、PC 端命令、通道、时间戳和溢出判断。RTT/SystemView 的 J-Link 连接不等同于烧录或业务逻辑。
