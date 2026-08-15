# BSP 架构专用契约

`platform_*_model.c/.h` 是 Platform Device Model；`impl_*_port.c/.h` 是 BSP Port（legacy 名 `drv_adapter_port_*`）；`User_Task/*/Platform/*_port/` 是 APP Facade/Task Adapter，不能当作 BSP Port。`platform_*_wrapper.c/.h` 仅作为历史迁移输入，不是新 BSP 的默认产物。

```text
Service → Platform Device Model → typed Platform Ops
                                  ↑ bind/register
impl_board Port ── inject MCU/Core Ops ──→ BSP Driver
    └──────────── inject same-class Drivers ──→ BSP Handle
                                      └──────→ Platform Device Ops
```

## 四个独立层

| 层 | 只能负责 | 只能依赖 |
|---|---|---|
| Platform Device Model | 设备身份、`cfg/ctx/data/ops` 契约和 typed Ops | Platform 公共类型 |
| Port | 唯一组合根；创建实例、注入 Ops、把 Handle 函数绑定到 Platform Device Ops | 资源、构造接口、Platform Model |
| Handle | 同一设备类别 Driver 集合的生命周期、选择/遍历、缓存、重试、回调和请求串行化 | 同类 Driver 与后续 OS 同步接口 |
| Driver | 器件协议和事务级错误映射 | 注入的 Core Ops 与 MCU Ops |

非 Port BSP 层不得包含或依赖其他层的具体实现。Platform Model 不保存 Driver/Handle；Handle 只通过 Driver 的公开实例 API 或内部 Driver Ops 使用 Driver，不复制协议状态；HAL Driver 不直接包含 HAL、RTOS、OS Wrapper、Port 或 Handle。Core/MCU 的具体对象只由资源系统提供、由 Port 选择并通过 Ops/context 注入。

## 设备类别、实例和 context-first Ops

Driver 是一个具体物理设备实例；Handle 只组合一个设备类别的多个 Driver，不得混入不同类别或不同协议族的 Driver。Driver 与 Handle 均使用标准 `cfg / ctx / data / ops` 四元组；`ops` 是其内部行为表，不作为 Platform 公共 API 暴露。Handle 的 Platform-facing API 使用独立函数声明，Port 再将这些函数绑定到 `platform_<type>_ops_t`。

Driver 的 `cfg` 保存型号/实例静态配置，`ctx` 保存已注入的 MCU/Core 资源，`data` 保存运行状态；Handle 的 `cfg` 保存同类 Driver 集合及策略，`ctx` 保存选择/并发/事件上下文，`data` 保存聚合结果、缓存和状态。Handle 不保存不同类型 Driver，也不让 Service 直接遍历 Driver。

所有跨层可注入函数以 `void *context` 为首参，Port 直接传递函数表和上下文，禁止为签名转换新增桥接函数或函数指针强转。

Handle 的 OS/并发资源由 Port 按 profile 注入；本架构阶段不改变 OS 抽象。跨设备共享总线锁仍归 Core Bus。Port 必须按 profile 创建、注入并在装配失败时回收声明资源。IRQ/DMA 由 Driver 通过注入的 platform_mcu 能力完成；ISR 只完成事件确认和有界投递，Handle 在任务/调用者上下文完成协议后处理和回调。

## Port 的固定装配责任

1. 从 resource 获取 MCU/Core 实例，构造一个或多个同类 Driver，注入事务级 Core Ops；若有 Core 无法表达的芯片特性，再注入 MCU Ops。
2. 构造同类 Handle，注入 Driver 指针集合及必要 OS/并发资源；Handle 不构造 Driver，也不复制 Driver 协议状态。
3. 建立 `platform_<type>_ops_t`，将 Handle 的公开函数声明绑定到 Platform Device Model，并注册 Platform Device；生产与 Fake Port 的函数表形状相同。

Port 可以创建 Handle 所需任务、队列或同步资源，但不得定义工作入口、循环、缓存更新、重试或回调。Port 不实现设备命令、寄存器语义、状态机和软件 IIC/SPI 位时序，也不直接调用 HAL 或原生 RTOS。

## GPIO 输出设备

LED、继电器和使能脚等同步 GPIO 输出设备可省略队列、线程、DMA/IRQ 和不适用的 MCU Ops；但不得省略 GPIO 实例/引脚/极性证据、失败状态回滚、deinit、错误码语义、Fake Port 和板级电平验证。完整要求见 [`gpio-output-peripheral-checklist.md`](gpio-output-peripheral-checklist.md)。

## 验收

静态检查应阻止新产物依赖历史 Wrapper、Port 漏注入、Handle 混入异类 Driver 和 HAL Driver 的 HAL/RTOS 依赖。它不替代交叉编译、烧录、运行日志或板上验证。
