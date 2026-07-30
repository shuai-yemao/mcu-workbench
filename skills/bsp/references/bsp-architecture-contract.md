# BSP 架构专用契约

本文件细化 [`软件层契约`](../../workflow/workflow-project-integration/references/software-layer-contract.md) 中 BSP 的实现边界；它不替代全局层级规则。

## 链路与装配

```text
APP / Middleware
  → APP Facade / Task Adapter（可选）
  → BSP Wrapper
  → BSP Port 回调
  → BSP Handler
  → BSP Driver
  → Core Bus
```

术语固定如下：`drv_adapter_*.c/.h` 是 BSP Wrapper（历史名 Adapter），`drv_adapter_port_*.c/.h` 是 BSP Port；`User_Task/*/Platform/*_port/` 是 APP Facade/Task Adapter，而不是 BSP Port。

Wrapper 仅持有 `xxx_drv_t` 抽象函数表、注册槽位和稳定转发 API；它只包含标准类型和自身声明。Port 持有具体 Driver、Handler 与平台对象，完成 Core Bus、OSAL、时基及 Driver Ops 的装配后，将同形函数表注册到 Wrapper。Port 的装配方向可以同时指向 Driver 与 Handler，但运行时调用仍遵守上面的链路。

Port 完成实例装配而不在生成运行时路径直接调用板级 HAL/LL；通用总线、GPIO、时基和 OSAL 资源通过 Core 后端或注入 Ops 提供。它不得放置设备命令、寄存器语义、协议状态机、软件 IIC/SPI 位时序或 Handler 业务缓存；硬件/软件总线后端及共享锁属于 Core。Port 可创建 Handler 所需任务、队列或同步资源，但任务入口、循环、重试、缓存和回调实现属于 Handler。生产 Port 和 Fake Port 使用同形函数表，Fake 注入 Fake Core Bus、时基和 OSAL。

## Driver 契约

Driver 仅封装器件协议。模块级默认只导出 `bsp_xxx_driver_inst()`；其他操作是实例 `pf_*` 或 `static` 函数。Driver 不包含 HAL、FreeRTOS 或 Handler 资源管理代码。

| 能力 | 南向注入接口 | 使用条件 |
|---|---|---|
| SPI/IIC/UART | 事务级总线读写 Ops | 器件通信；不暴露 START、STOP、ACK 或 SDA 位操作 |
| tick/delay | timebase Ops | 超时、上电和复位时序 |
| GPIO | GPIO Ops | CS、复位、背光或数据命令脚 |
| IRQ/DMA | IRQ/DMA Ops | 中断通知或异步传输 |
| yield/trace | 可选 Ops | 长轮询让步与诊断 |

每个实例持有 `is_inited`、注入 Ops、`pf_*` 北向表和明确的资源所有权。初始化失败必须回滚本次取得的资源；反初始化应可安全重复调用。

## Handle 契约

Handler 通过注册函数接收泛化的 Driver Ops，管理设备生命周期、单设备请求串行化、缓存、队列、线程、事件与回调。跨设备共享总线互斥由 Core Bus 实例负责。ISR 只使用 OSAL 的 ISR 安全接口投递事件；协议读写、解码和用户回调在任务上下文运行，回调位于锁和临界区外。停止采用“停止投递 → 唤醒 → 自然退出 → 回收”的协作式顺序。

## 验收证据

每个目标工程提交 `docs/verification/<module>-acceptance.md`，至少填写：

| 层级 | 必填证据 |
|---|---|
| 构建 | 命令、配置、编译结果 |
| 下载 | 工具、目标、结果 |
| 运行 | 计数器、日志或断言 |
| 实物 | 观察结果；未完成时明确标记“未验证”及原因 |

静态校验只能证明结构，不能替代下载、运行或实物确认。

温湿度实例和固定源码差异见 [`bsp-aht21-case.md`](bsp-aht21-case.md)。
