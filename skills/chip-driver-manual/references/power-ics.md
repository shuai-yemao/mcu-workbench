# 电源 IC

用于 PMIC、LDO、DCDC 转换器、充电器、监控器、电源开关、负载开关和电量/电源管理器件。

## 通用提取项

- 输入电压、输出电压/电流范围、热限制和封装功率限制。
- 电源轨/通道、enable 引脚、默认状态、放电行为和时序。
- I2C/SPI/GPIO 控制接口、寄存器表和器件地址。
- 电压/电流设置公式、步进和有效范围。
- Power-good、reset、interrupt、fault 和 status 输出。
- 故障类型：UVLO、OVP、OCP、SCP、thermal shutdown、watchdog、battery faults。
- 故障锁存和清除序列。
- Soft-start、ramp rate、debounce、blanking 和 retry 行为。
- 相关时记录电池充电器状态机、JEITA、安全定时器和终止规则。
- Watchdog/default-mode 行为，以及 watchdog 到期时哪些寄存器会复位。

## 驱动风险

- 没有板级约束时，不要改变电源轨电压。
- 在假设系统能够通信前，确认默认上电状态。
- 谨慎处理故障清除序列；清除可能会重新使能电源。
- 有意维护或关闭 watchdog；到期可能会让 PMIC/充电器回到自主默认模式。
- 遵守稳压器建立时间和上电时序延迟。
