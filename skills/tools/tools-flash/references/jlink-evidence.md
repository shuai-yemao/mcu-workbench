# J-Link 烧录证据

## 工具边界

J-Link Commander、J-Link GDB Server、JFlash 和 Ozone 是 SEGGER 专有主机工具；当前没有可作为官方实现依据的完整开源 J-Link 主机仓库。因此本 reference 不复制或猜测内部协议，只记录已安装软件版本、设备型号和命令输出。

## 运行前检查

1. 记录 J-Link 软件包版本、探针序列号、目标芯片和 VTarget。
2. 确认 SWD/JTAG、接口速度、复位策略和目标供电方式。
3. 先生成 Commander 脚本并 dry-run，检查 `.hex/.bin/.elf` 地址和擦除范围。
4. 烧录后执行读回/校验，并保留失败日志；禁止自动对非目标序列号探针操作。

## GitHub 源码关联

- RTT 目标端源码：[SEGGERMicro/RTT](https://github.com/SEGGERMicro/RTT)，由 `tools-observability` 负责。
- SystemView 目标端源码：[SEGGERMicro/SystemView](https://github.com/SEGGERMicro/SystemView)，由 `tools-observability` 负责。
- 开源替代调试/烧录链：[openocd-org/openocd](https://github.com/openocd-org/openocd)，由 `tools-debug`/`tools-flash` 负责。
