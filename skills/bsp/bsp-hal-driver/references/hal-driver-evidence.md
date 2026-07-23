# BSP hal_driver 证据

hal_driver 面向一个具体外部器件，必须从数据手册、时序图和总线波形建立证据。它可以调用 Core 提供的 SPI/I2C/UART/GPIO/DMA 能力，但不能调用 OS、APP 或其他器件 Handler。

## 最小状态机

```text
reset → detect → configure → ready
                         ↘ error → recover → detect
```

每个器件至少说明 `init/read/write/control/sleep/wakeup` 的前置条件、超时、返回码、缓存和幂等性。SFUD 等通用库只能作为器件实现参考，不能替代板级 Port 和 Handler 的资源所有权。

## 交接

- 总线控制器和 DMA：[`core-mcu`](../../../platform/core-mcu/SKILL.md)
- 厂商 HAL/LL/CMSIS：[`driver-vendor`](../../../platform/driver-vendor/SKILL.md)
- 板级函数表：[`bsp-adapter`](../../bsp-adapter/SKILL.md)
- 多实例和生命周期：[`bsp-handler`](../../bsp-handler/SKILL.md)
