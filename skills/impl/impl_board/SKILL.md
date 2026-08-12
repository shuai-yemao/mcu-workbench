---
name: impl_board
description: Impl 落地：板级组合根——构造实例、注入 Ops、资源绑定（board_resource_config + board_bsp_register）。
---

# Impl Board（平台适配 · 组合根）

先读取共享 [`BSP 架构专用契约`](../../bsp/references/bsp-architecture-contract.md)。本层是**组合根**：为具体板卡构造 Driver/Handler 实例、绑定 Platform 接口、注册函数表。固定运行时调用链为 `APP → Service → Platform 接口 → Impl 回调 → Driver → Platform MCU Bus`；启动时由本层把函数表注册到 platform_bsp。

## 组合根职责

为每个抽象函数建立"抽象函数 → Platform 能力 → 参数/状态转换 → 阻塞与 ISR 限制"映射表。生成 Impl 不直接调用 HAL/LL；平台初始化与总线绑定应封装在 platform_mcu 后端或注入 Ops。

- 允许：持有具体 Driver/Handler/平台对象，选择并绑定平台后端，并创建后注入 Handler 所需 OSAL 任务、队列或同步资源。
- 禁止：放置设备命令、寄存器语义、协议状态机、软件 IIC/SPI 位时序，或在 Impl 定义 Handler 的任务入口、业务循环、重试、缓存更新和回调逻辑。
- Handler 的业务缓存只能保留在 Handler 实例；组合根不得维护重复的 `latest`/`cache` 数据副本。
- 先从目标工程公开 `platform_os.h` 确认 profile 声明的 mutex、queue、task 或时基 API；组合根创建资源、注入 Handle、在装配失败时回收。缺少该证据时只能输出带 `UNRESOLVED_PLATFORM_OS_API` 的预览，不能虚构可编译 Platform OS 名称。
- 对 context-first Ops，直接复制 `pf_*` 与 `p_context` 到下一层函数表；禁止函数指针强转和仅为签名转换而存在的桥接函数。
- 生产组合根与 Fake 组合根必须注册同形函数表。生产实现绑定具体芯片/平台/OSAL，Fake 实现绑定 Fake Bus/时基/OSAL，接口不因测试而分叉。
- GPIO 输出实现必须以 platform_mcu 公开头和板级 pin/极性证据构造上下文；裸 `extern` 回调或无说明的 `NULL` context 只能是带 `UNRESOLVED_GPIO_BINDING` 的预览。按阶段装配，任一步失败必须恢复先前注册状态。

## 与 platform_bsp 的关系

platform_bsp 只包含标准类型头和自身公共声明，不能包含本层、HAL、RTOS 或具体 Driver/Handler。它静态持有抽象函数表、提供注册入口和稳定转发 API；不持有平台句柄或具体实例。

`User_Task/*/Platform/*_port/` 不是 Impl，而是 APP Facade/Task Adapter：只能转发到平台公共 API，不得包含 HAL、Driver、Handler 或 OSAL。

## 生成契约

目录和名称固定为 `04_Impl/impl_board/<type>/Inc|Src/impl_<type>_port.c/.h` 与 `03_Platform/platform_bsp/<type>/Inc|Src/platform_<type>_wrapper.c/.h`。组合根只导出一个 `impl_<type>_port_register()`；私有装配区可以绑定 Driver、Handle，运行时转发只能调用 Handle API。生成实现不直接调用 HAL，平台实现应通过 platform_mcu 后端注入。生成前先输出 manifest，列明设备 profile、Ops 映射、OSAL 资源、阻塞/ISR 限制、`style-profile.md` 适用范围与未验证项。

器件协议交给 [`impl_bsp`](../impl_bsp/SKILL.md)，资源/并发交给 [`impl_bsp`](../impl_bsp/SKILL.md)（Handler 机制子层）。实现证据见 [`bsp-layer-evidence.md`](references/bsp-layer-evidence.md)，器件适配和 Fake 样例见 [`capability-index.md`](references/capability-index.md)。
共享温湿度案例见 [`bsp-aht21-case.md`](../../bsp/references/bsp-aht21-case.md)。
GPIO 输出外设的绑定、回滚和 Fake 最小集见 [`gpio-output-peripheral-checklist.md`](../../bsp/references/gpio-output-peripheral-checklist.md)。
跨 skill 通用错误模式与调试教训见 [`common-error-patterns.md`](../../bsp/references/common-error-patterns.md)。

全局分层见 [`software-layer-contract.md`](../../workflow/workflow-review-gate/references/software-layer-contract.md)。
