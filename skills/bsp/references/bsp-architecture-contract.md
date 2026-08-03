# BSP 架构专用契约

`drv_adapter_*.c/.h` 是 BSP Wrapper；`drv_adapter_port_*.c/.h` 是 BSP Port；`User_Task/*/Platform/*_port/` 是 APP Facade/Task Adapter，不能当作 BSP Port。

```text
APP / Middleware → BSP Wrapper → BSP Public Ops
                                  ↑ register
BSP Port ── inject Core Ops + MCU Ops ──→ BSP HAL Driver
    └──── inject OS Wrapper Ops + HAL Driver Ops ──→ BSP Handler
```

## 四个独立层

| 层 | 只能负责 | 只能依赖 |
|---|---|---|
| Wrapper | 函数表、注册槽位、稳定转发 | 标准类型、自身声明 |
| Port | 唯一组合根；创建实例、注入 Ops、向 Wrapper 注册 Public Ops | 注入源、实例构造接口、Wrapper 注册口 |
| Handler | 任务循环、缓存、重试、回调、生命周期和请求串行化；设备类别级缓存 | 注入的 OS Wrapper Ops 与 HAL Driver Ops |
| HAL Driver | 器件协议和事务级错误映射 | 注入的 Core Ops 与 MCU Ops |

非 Port BSP 层不得包含或依赖其他层的具体实现。Wrapper 不保存平台对象；Handler 不访问具体 Driver 成员；HAL Driver 不直接包含 HAL、RTOS、OS Wrapper、Port 或 Handler。Core/MCU 的具体对象只由 Port 选择并通过 Ops 注入。

## 设备类别与 context-first Ops

Driver 属于具体设备型号；Handle 属于设备类别，不能包含具体 Driver 或配置头。Port 把型号几何、能力和同形 Driver Ops 注入类别 Handle。所有跨层可注入函数以 `void *context` 为首参，Port 直接传递函数表和上下文，禁止为签名转换新增桥接函数或函数指针强转。

Handler 自身缓存的并发资源由 Port 创建后通过公开 OSAL Ops 注入；跨设备共享总线锁仍归 Core Bus。Port 必须按 profile 创建、注入并在装配失败时回收 mutex、queue、task 等声明资源。

## Port 的固定装配责任

1. 构造 HAL Driver，注入事务级 Core Ops；若有 Core 无法表达的芯片特性，再注入 MCU Ops。
2. 构造 Handler，注入公开 OS Wrapper Ops 与 HAL Driver Ops。
3. 建立 BSP Public Ops 并注册到 Wrapper；生产与 Fake Port 的函数表形状相同。

Port 可以创建 Handler 所需任务、队列或同步资源，但不得定义工作入口、循环、缓存更新、重试或回调。Port 不实现设备命令、寄存器语义、状态机和软件 IIC/SPI 位时序，也不直接调用 HAL 或原生 RTOS。

## GPIO 输出设备

LED、继电器和使能脚等同步 GPIO 输出设备可省略队列、线程、DMA/IRQ 和不适用的 MCU Ops；但不得省略 GPIO 实例/引脚/极性证据、失败状态回滚、deinit、错误码语义、Fake Port 和板级电平验证。完整要求见 [`gpio-output-peripheral-checklist.md`](gpio-output-peripheral-checklist.md)。

## 验收

静态检查应阻止 Wrapper 具体依赖、Port 漏注入、Handler 具体依赖和 HAL Driver 的 HAL/RTOS 依赖。它不替代交叉编译、烧录、运行日志或板上验证。
