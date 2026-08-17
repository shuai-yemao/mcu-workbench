---
name: vendor_rtos
description: Vendor RTOS 能力底座：完整保留项目选定的 FreeRTOS、RT-Thread 等 RTOS 源码、移植层、配置和版本证据。
---

# Vendor RTOS 能力底座

## 边界

本技能登记目标工程 `05_Vendor/vendor_rtos/` 中选定 RTOS 的完整内容。包括 RTOS 内核源码、官方移植层、配置头、端口宏、内存实现、许可文件和版本元数据；目标工程 Git 统一提交该目录。不要把 RTOS 内核拆散到 `Impl`，也不要把实际 RTOS 源码复制进插件仓库。

FreeRTOS、RT-Thread 或其他 RTOS 的具体类型、原生 API、任务/队列/信号量和调度实现只属于 Vendor 底座。它们必须由 `impl_os` 适配为 `platform_os` 契约，Service、App 和 Platform 公共头不得直接 include RTOS 头文件。

## 工作流

1. 记录 RTOS 名称、版本/commit、移植目标、配置文件、工具链和内存策略。
2. 将选定 RTOS 的完整源码与移植层放入 `05_Vendor/vendor_rtos/`，在 `vendor_metadata/` 登记来源、许可证、生成器和依赖。
3. 由 `impl_os` 注入任务、锁、队列、时间和内存等后端能力；由 `platform_os` 对上提供稳定、RTOS-neutral API。
4. 分开验证内核编译、Impl OS 适配、主机 Fake、目标板调度和运行时观测，不把静态目录检查当成 RTOS 运行证据。

## 禁止

- Vendor RTOS 反向 include App、Service、Platform 或业务头；
- Service、App、Platform 公共头直接使用 `FreeRTOS.h`、`task.h`、RT-Thread 原生类型或原生 API；
- 在 `impl_os` 中复制、重写 RTOS 内核源码；
- 用 `vendor_rtos` Skill 推导具体芯片或板卡资源，芯片绑定交给 `vendor_mcu` 和 `impl_mcu`；
- 以多个物理 Vendor 目录替代目标工程统一的 `05_Vendor/` Git 管理。

共享层契约见 [`software-layer-contract.md`](../../workflow/workflow-review-gate/references/software-layer-contract.md)，目标工程 Vendor 内容见 [`vendor-content-contract.md`](../references/vendor-content-contract.md)。
