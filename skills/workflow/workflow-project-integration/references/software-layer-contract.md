# 软件层契约

```text
APP
├─ OS Wrapper
├─ BSP Wrapper
└─ Middleware 公共 API

OS Wrapper → OS Port → FreeRTOS / RT-Thread / 裸机
BSP Handler → BSP Wrapper → BSP Port → hal_driver → Core → Driver
```

| 层 | 单一职责 | 允许依赖 | 不负责 |
|---|---|---|---|
| APP | 业务、UI、连接和应用状态 | OS Wrapper、BSP Wrapper、Middleware API | 直接调用 HAL、管理 RTOS 原生对象 |
| Middleware | 可复用协议、GUI、存储和算法 | 公共 API、必要的 OS/BSP Wrapper | 设备绑定、Adapter 设计 |
| OS | 任务、队列、同步、定时和内存抽象 | OS Port、BSP Wrapper | 业务逻辑、器件协议 |
| BSP | 板上器件流程、实例和资源所有权 | BSP Adapter、Core | 直接暴露厂商 HAL |
| Core | MCU 内置 GPIO/I2C/SPI/UART/ADC/TIM/DMA/IRQ 初始化 | Driver | Adapter、业务和外部器件协议 |
| Driver | 厂商 SDK、CMSIS、HAL/LL/SPL、寄存器访问 | 芯片硬件 | Adapter、项目业务 |

## Adapter 规则

OS Adapter：`osal_*` Wrapper 定义稳定 API，`os_impl_*` Port 绑定具体 RTOS。

BSP Adapter：`drv_adapter_*` Wrapper 定义设备 API，`drv_adapter_port_*` Port 注入板级函数表；Port 再调用 `hal_driver`，不得反向依赖 Handler。

Core、Middleware、Driver 没有 Adapter 目录、命名或调用层。需要移植时使用其原生配置或厂商实现。
