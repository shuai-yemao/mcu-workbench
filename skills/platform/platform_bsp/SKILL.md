---
name: platform_bsp
description: Platform 纯定义：板级器件能力接口（board/battery/backlight/display/touch/imu…）+ 函数表/注册/对象协议，零实现不绑芯片。
---

# Platform BSP（平台抽象 · 纯定义）

## 边界

Platform BSP 定义平台无关的板级器件能力接口与对象协议：抽象函数表（`pf_*` ops 指针 + `p_context` 上下文）、注册入口、稳定转发与对象协议。函数表保存 `p_context` 与首参为 `void *context` 的 `pf_*`，以便 Impl 直接注册；不得包含 HAL、RTOS、Core 或具体 Driver 实现对象。

默认只允许系统启动阶段注册；若需要运行期重注册，Platform 必须定义函数表替换与并发转发的原子性，且 Impl 失败不能破坏已有可用注册。GPIO 输出能力验证边界见 [`gpio-output-peripheral-checklist.md`](../../bsp/references/gpio-output-peripheral-checklist.md)。

平台对象绑定、后端选择和 OSAL 资源注入由 Impl 层负责（阶段 3 落地：`impl_board` / `impl_bsp`）；器件协议与业务运行时状态同样归 Impl。

共享层契约见 [`bsp-architecture-contract.md`](../../bsp/references/bsp-architecture-contract.md)。
