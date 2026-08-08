---
name: platform_mcu
description: Platform 纯定义：MCU 能力接口（GPIO、I2C、SPI、UART、ADC、TIM、DMA、中断、启动初始化）。
---

# Platform MCU（平台抽象 · 纯定义）

## 边界

Platform 只定义能力契约，**零实现，不绑定芯片**。本技能面向 MCU 内置资源的能力接口：时钟、引脚、外设实例、中断/DMA、总线契约和后端算法接口。它调用厂商 Driver 的原生接口由 Impl 承接，不创建 Adapter，也不实现外部器件协议。

## 公共定义来源

错误码统一使用 [`platform_common`](../platform_common/SKILL.md) 的 `platform_error.h` 中 `platform_err_t` 枚举（`PLATFORM_ERR_*`），跨层判定用 `PLATFORM_IS_ERR`/`PLATFORM_IS_OK`；数据类型统一使用 `platform_type.h` 出口类型（`int8_t..uint64_t`、`float_t/double_t`、`char_t/uchar_t`、`bool_t`）；常用宏统一取自 `platform_def.h`（`PLATFORM_ALIGN`/`ARRAY_SIZE`/`PLATFORM_DELAY_MS/US` 等）。对象模型与生命周期亦由 `platform_common` 承载；本技能只负责 MCU 能力接口与后端契约。

## 必须读取（生成前 MUST，缺失任一即不得开始输出）

- 对象四元组模板：`../platform_common/references/object-four-tuple-template.md`（base + cfg/ctx/data/ops 判定标准）
- 生成代码完整注释 Profile：`../../tools/tools-quality/references/generated-bsp-comment-profile.md`
- 生成代码审查门禁：`../../tools/tools-quality/references/review-gates.md`
- 软件层契约：`../../workflow/workflow-review-gate/references/software-layer-contract.md`

## 四元组判定规则（MUST）

本技能定义的接口对象（如 `platform_i2c_t`）按对象四元组模板判定：

1. **必须套四元组**：若定义了「承载平台身份的 struct」（首字段 `platform_device_t`/`platform_service_t`，或含对象身份/生命周期字段）→ `base` 首字段 + 补齐 `cfg`/`ctx`/`data`/`ops` 四槽。
2. **豁免（须显式声明）**：仅纯粹行为函数表（`platform_<name>_ops_t`，只含 `pf_*` + `backend_context`，无身份/生命周期字段）可豁免；豁免必须在头注释显式声明「纯转发、不承载对象身份」。
3. **禁止**用「纯接口」边界豁免一个已定义了设备对象 struct 的类型。

## 生成自检门禁（输出前 MUST）

输出代码前逐项核对，任一不满足不得交付：

- [ ] 四元组：按上述判定规则核对
- [ ] 错误码：全部使用 `platform_err_t`/`PLATFORM_ERR_*`，不压平为 -1
- [ ] 类型/宏：字段类型来自 `platform_type.h`，宏来自 `platform_def.h`，不自造等价物
- [ ] 依赖：公共头不得暴露 HAL/FreeRTOS/CMSIS-OS/厂商类型
- [ ] 注释：完整注释 Profile（`@file`/`@brief`/`@par dependencies`/`@author`/版本 + 六分区）
- [ ] 代码质量：按 `review-gates.md` 自查风格/功能/安全三类问题

## 工作流

从芯片参考手册和工程启动文件建立外设资源表，确认 IRQ/DMA/时钟依赖，再输出可被 Impl 使用的初始化和事务级传输**能力接口**。I2C/SPI/UART 仅描述 MCU 控制器和总线能力，不描述外部器件协议。

## I2C 后端边界

Platform I2C 公共接口提供初始化、释放、事务 read/write、memory read/write、可选 DMA/IRQ 启动、取消、`platform_err_t` 状态码（源自 `platform_error.h`）和带明确单位的超时；它不是只有读写函数的薄封装。Platform 只定义 `platform_i2c_ops_t` 与硬件/软件后端**接口**，不拥有锁、任务、业务缓存或设备协议；锁与回调上下文属于 Handler。Impl 可持有平台对象并选择后端，但不能包含器件协议或把自身变成软件时序后端。START、STOP、ACK、逐字节发送、SDA 方向和位时序只属于软件后端私有实现（Impl）。

## 生成契约

`mcu-workbench core --peripheral <name>` 每类外设只生成 `03_Platform/platform_mcu/Inc/platform_<name>.h` 和 `03_Platform/platform_mcu/Src/platform_<name>.c`。`iic` 仅是 CLI 输入别名，统一归一化为 `i2c`；公开文件名、API 和文档只能使用 `i2c`。公共头不包含 HAL、FreeRTOS、CMSIS-OS 或厂商类型；使用 `void *backend_context` 隔离平台上下文。生成代码不得自行重定义 `platform_err_t` 或基础类型；若生成物为独立可编译单元，其枚举值编号必须与 `platform_error.h` 完全一致（`PLATFORM_ERR_OK=0`、`PLATFORM_ERR_PARAM=3`、`PLATFORM_ERR_NOT_SUPPORTED=6`、`PLATFORM_ERR_BUSY=9`）。

公共头不得暴露 `I2C_HandleTypeDef`、`GPIO_TypeDef`、RTOS 句柄或其他厂商类型。跨设备共享总线互斥由 Platform 总线实例契约负责，但只可调用公开 `osal_mutex_*` 或注入的 lock/unlock Ops，不得调用原生 RTOS API。历史上位于 BSP 的 GPIO 模拟 I2C 应迁移为 Impl 层软件时序后端（位时序私有实现）。

CMSIS Core/Device 的源码路径和审计顺序见 [`cmsis-core-map.md`](references/cmsis-core-map.md)。
寄存器、中断、内存、总线和 MCU 外设的完整能力资料见 [`capability-index.md`](references/capability-index.md)。
硬件 IIC 与软件 IIC 解耦案例见 [`core-iic-backends-case.md`](references/core-iic-backends-case.md)。

交接：厂商 HAL/LL/CMSIS 交给 [`vendor_stm32`](../../vendor/vendor_stm32/SKILL.md)，板上器件流程交给 [`impl_bsp`](../../impl/impl_bsp/SKILL.md)。

共享层契约见 [`software-layer-contract.md`](../../workflow/workflow-review-gate/references/software-layer-contract.md)。
