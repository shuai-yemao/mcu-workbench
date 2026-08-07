---
name: service_system
description: Service 系统业务：Bootloader、低功耗、看门狗、固件安全和跨层系统能力（带业务策略）。
---

# Service 系统业务

## 边界

负责启动链、升级与回滚、低功耗策略、看门狗、完整性/签名和跨层故障策略（**业务策略**）。它通过 Platform 公共接口协作，不把安全或电源逻辑塞进 Driver/Impl。

Bootloader、OTA 回滚、系统恢复、任务看门狗和故障升级属于本层。Platform 只提供复位、低功耗、硬件看门狗和存储访问等底层能力接口；impl_os 只负责 Tickless、Idle/Trace Hook 和内核配置。

## 工作流

先定义状态机、复位原因、持久化数据和失效安全路径，再映射到启动文件、OS 任务和平台电源接口。对每条路径给出可观测的验收证据。本服务按范本交付 `_model.h`（数据模型）/ `_state.h`（状态机）/ `_fault_code.h`（故障码）。

AES、PSA Crypto 和硬件加速的源码边界见 [`crypto-source-baseline.md`](references/crypto-source-baseline.md)。
Bootloader、低功耗、看门狗、CRC、AES、RSA 与固件签名的详细流程见 [`capability-index.md`](references/capability-index.md)。

交接：启动与链接交给对应工具 skill，电源/器件控制交给 [`impl_bsp`](../../impl/impl_bsp/SKILL.md)，OS 资源交给 [`platform_os`](../../platform/platform_os/SKILL.md)。

共享层契约见 [`software-layer-contract.md`](../../workflow/workflow-review-gate/references/software-layer-contract.md)。
