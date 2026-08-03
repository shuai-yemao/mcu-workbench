---
name: bsp-hal-driver
description: Use when implementing, refactoring, or reviewing a BSP device Driver that isolates device protocol from HAL, RTOS, and board bindings.
---

# BSP Driver

先读取共享 [`BSP 架构专用契约`](../references/bsp-architecture-contract.md)，再从数据手册和原理图提取器件协议证据。

## 固定流程

1. 创建 `bsp_xxx_config.h`，集中地址、时序、能力开关和编译期限制；板级句柄不放入配置头。
2. 写出南北向接口表：北向为实例 `pf_*`；南向注入事务级总线、tick/delay、GPIO、IRQ、DMA、yield、trace。可注入函数以 `void *context` 为首参，确保 Port 可以直接组装 Ops。事务级 Bus Ops 至少说明 read/write/memory read/memory write 的地址、长度、超时单位和错误码；不得注入 START、STOP、ACK、send-byte、SDA 方向或临界区等软件 IIC 细节。
3. 定义实例状态：`is_inited`、注入 Ops、私有上下文和 `pf_*`；初始化失败回滚，反初始化可重复。
4. 默认采用 `instance_only`：模块级仅 `bsp_xxx_driver_inst()`，其余函数为实例函数表或 `static`。兼容例外遵循 [`api-policy.md`](references/api-policy.md)。
5. 用 Fake Bus/Timebase/GPIO 覆盖成功、超时、重试和回滚路径，并把板级四级证据写入契约规定的位置。

GPIO 输出设备（LED、继电器、使能脚）遵循 [`GPIO 输出外设检查表`](../references/gpio-output-peripheral-checklist.md)：逻辑状态与物理电平分离，必须保留极性、Core GPIO 上下文、失败状态和 deinit 规则，不能为套用通用器件模板虚构协议或 MCU Ops。

## 生成目录与 DMA/IRQ

按设备类别创建 `Bsp/BoardDriver/<type>/Driver/<DEVICE>/Inc|Src`，Driver 使用 `bsp_<device>_driver.c/.h` 与独立的 `bsp_<device>_config.h`；同一类别的 Handle 位于相邻 `Handle/Inc|Src`。Driver 必须把 Core 的 DMA/IRQ 完成事件转换为设备事件，不直接配置 HAL/NVIC，也不创建任务。生成代码采用 [`完整注释 Profile`](../../tools/tools-quality/references/generated-bsp-comment-profile.md) 的文件/API 注释和 `Includes`、`Private Defines`、`Private Types`、`Private State`、`Private Functions`、`Public Functions` 分区。

Port 可长期持有具体 Driver 并把其北向回调注册到 Wrapper；这种所有权不允许 Port 复制设备协议、命令常量或状态机。

## 禁止项

- 包含或调用 HAL、FreeRTOS、CMSIS-OS。
- 导出额外的 Driver 行为函数（除获批的 `legacy_event_api` 桥接）。
- 在 Driver 放置 Handler 的缓存、队列、线程或业务调度。

状态机、错误恢复和交接证据见 [`hal-driver-evidence.md`](references/hal-driver-evidence.md)；器件样例见 [`capability-index.md`](references/capability-index.md)。
共享温湿度案例见 [`bsp-aht21-case.md`](../references/bsp-aht21-case.md)。
跨 skill 通用错误模式与调试教训见 [`../references/common-error-patterns.md`](../references/common-error-patterns.md)。

交接：MCU 外设实现交给 [`core-mcu`](../../core/core-mcu/SKILL.md)，厂商库交给 [`mcu-platform`](../../mcu/mcu-platform/SKILL.md)，绑定交给 [`bsp-port`](../bsp-port/SKILL.md)。
