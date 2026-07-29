# 软件层契约

```text
APP
├─ OS Wrapper
├─ BSP Wrapper
└─ Middleware 公共 API

OS Wrapper → OS Port → FreeRTOS / RT-Thread / 裸机
BSP Wrapper → BSP Port → BSP Handler → BSP Driver → Core Bus → Vendor Driver
```

| 层 | 单一职责 | 允许依赖 | 不负责 |
|---|---|---|---|
| APP | 业务、UI、连接和应用状态 | OS Wrapper、BSP Wrapper、Middleware API | 直接调用 HAL、管理 RTOS 原生对象 |
| Middleware | 可复用协议、GUI、存储和算法 | 公共 API、必要的 OS/BSP Wrapper | 设备绑定、Adapter 设计 |
| OS | 任务、队列、同步、定时和内存抽象 | OS Port | 业务逻辑、器件协议 |
| BSP | 板上器件协议、实例和设备生命周期 | BSP Port、Handler、Driver、Core Bus | 直接暴露厂商 HAL、实现 MCU 总线位时序 |
| Core | MCU 内置 GPIO/I2C/SPI/UART/ADC/TIM/DMA/IRQ、时基和总线后端 | Driver、公开 OSAL 或注入锁 Ops | BSP Adapter、业务和外部器件协议 |
| Driver | 厂商 SDK、CMSIS、HAL/LL/SPL、寄存器访问 | 芯片硬件 | Adapter、项目业务 |

## Adapter 规则

OS Adapter：`osal_*` Wrapper 定义稳定 API，内部通过 `os_*_impl()` 进入 Port，再绑定具体 RTOS。`osal_internal_*.h` 只是两层之间的内部边界。

BSP Adapter：Wrapper 定义稳定设备 API，Port 注入 Core Bus、OSAL、时基和 Driver Ops；Wrapper 不得反向依赖 Driver、Handler、HAL 或 RTOS。Port 不实现软件 IIC，也不调用 HAL。

BSP 的接口、装配、生命周期和验收细节见 [`BSP 架构专用契约`](../../../bsp/references/bsp-architecture-contract.md)。Handle 通过泛化 Driver Ops 调用实例 `pf_*`，不要求“Handler 必然经 Wrapper 调 Driver”。

Core、Middleware、Driver 不采用 BSP 的 Wrapper/Port Adapter 调用层。Core 可以用私有 Backend/Port 隔离厂商外设实现，但其公共 API 保持事务级、无厂商和 RTOS 类型。

## 归属裁决

- Core 负责片上外设、时钟、GPIO、DMA、IRQ、时基、总线后端和硬件低功耗入口。
- Bootloader、OTA 回滚、系统恢复、任务看门狗和恢复策略归 [`software-system`](../../../system/software-system/SKILL.md)。
- 外部 Flash 器件 Driver 归 BSP；分区、配置和持久化策略归 storage/system；安全算法归 system 或算法 Middleware，不塞入 Core。
- Tickless、Idle Hook 和 Trace Hook 归具体 RTOS Skill。

架构意图、图片表达与固定源码的冲突见 [`ec-s100-architecture-audit.md`](ec-s100-architecture-audit.md)。

## 验收边界

构建和链接成功不等于分层合规；静态门禁通过也不等于器件、并发和恢复路径已验证；连接 RTT 只证明观测通道可用，不证明业务读数正确。源码警告必须独立记录，不能因未启用 `-Werror` 而视为无风险。
