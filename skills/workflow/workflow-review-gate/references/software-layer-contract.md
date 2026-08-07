# 软件层契约

```text
APP ──┬─ OS Wrapper (`osal_*`) → OS Port (`os_*_impl()`) → OS Runtime
      ├─ BSP Wrapper → BSP Port → BSP Handler → BSP HAL Driver → Core → MCU
      └─ Middleware Public API

Middleware Port ── OS Wrapper + BSP Wrapper
OS Port ── BSP Wrapper（仅在需要板级能力时）
```

| 层 | 单一职责 | 允许依赖 | 禁止事项 |
|---|---|---|---|
| APP | 业务、UI、连接和应用状态 | OS Wrapper、BSP Wrapper、Middleware 公共 API | HAL、原生 RTOS、BSP Port、Handler、HAL Driver、Core、MCU |
| Middleware | 可复用协议、GUI、存储、算法和公共 API | Middleware 公共 API；Port 仅可用 OS Wrapper、BSP Wrapper | 具体设备、BSP Port、Handler、HAL Driver、Core、MCU、原生 RTOS |
| OS Wrapper | 稳定的 `osal_*` 公共 API、语义转换和错误码 | 内部 OS Port | 业务状态、板级协议、原生 RTOS 调用 |
| OS Port | `os_*_impl()` 与 FreeRTOS、RT-Thread、裸机 Runtime 的绑定 | OS Runtime；必要时 BSP Wrapper | APP/BSP/Middleware 业务、直接访问 BSP Port/Handler/Driver |
| BSP Wrapper | 函数表、注册槽位和稳定转发 | 标准类型与自身公共声明 | Port、Handler、HAL Driver、Core、MCU、OS、HAL、RTOS 具体依赖 |
| BSP Port | 唯一组合根：构造实例、注入 Ops、注册 BSP Public Ops | Core Ops、MCU Ops、OS Wrapper Ops、Driver/Handler 实例、BSP Wrapper 注册口 | 设备协议、业务缓存、任务循环、重试、回调、直接 HAL/RTOS |
| BSP Handler | 生命周期、任务循环、队列、缓存、重试、回调和请求串行化 | 注入的 OS Wrapper Ops、HAL Driver Ops | Port/Wrapper/Core/MCU/HAL/RTOS 具体实现、设备寄存器协议 |
| BSP HAL Driver | 外部器件协议与事务级错误映射 | 注入的 Core Ops、MCU Ops | HAL、RTOS、OS Wrapper、Handler、Port、业务状态 |
| Core | MCU 编程的公共能力：片上总线、GPIO、DMA、IRQ、时基与事务 API | MCU 层；公开 `osal_*` 或注入锁 Ops | 外部器件协议、BSP Adapter、业务状态 |
| MCU | CMSIS、厂商 HAL/LL/SPL、寄存器、SDK 与芯片专有能力 | 芯片硬件 | APP/BSP/Middleware/OS Wrapper 业务逻辑 |

## OS 契约

`osal_*` 是 APP、BSP、Middleware 与 Middleware Port 唯一可见的 OS API；`os_*_impl()` 是仅供 Wrapper 使用的 OS Port 内部函数；`os-runtime` 负责 FreeRTOS、RT-Thread 或裸机的实际运行时绑定。`osal_internal_*.h` 只表示 Wrapper/Port 的内部边界，不形成第三层。原生 RTOS 头、类型和 API 不得越过 OS Port。

## BSP 注入顺序

1. BSP Port 创建 HAL Driver，并注入 Core Ops 与仅表达 Core 无法表达的 MCU Ops。
2. BSP Port 创建 Handler，并注入 OS Wrapper Ops 与 HAL Driver Ops。
3. BSP Port 将同形 BSP Public Ops 注册到 BSP Wrapper。

生产 Port 与 Fake Port 必须保留相同的 Wrapper 函数表；差异只能位于注入的 Ops。`User_Task/*/Platform/*_port/` 是 APP Facade/Task Adapter，不是 BSP Port。

## Core 与 MCU 裁决

Core 优先表达项目公共 MCU 编程能力。只有芯片独有且无法用 Core 事务/资源 API 表达的能力，才作为 MCU Ops 注入 BSP HAL Driver。CMSIS、厂商 HAL/LL/SPL、寄存器和 SDK 归 MCU；其调用应被 Core 私有后端或受职责约束的 MCU 绑定消化。

## 验收边界

静态门禁只证明依赖边界。构建、烧录、RTT/串口运行和板上现象分别需要独立记录，不能互相替代。
