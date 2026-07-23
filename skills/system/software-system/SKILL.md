---
name: software-system
description: 处理 Bootloader、低功耗、看门狗、固件安全和跨层系统能力。
---

# 软件系统能力

## 边界

负责启动链、升级与回滚、低功耗策略、看门狗、完整性/签名和跨层故障策略。它通过 OS/BSP 公共接口协作，不把安全或电源逻辑塞进 Driver/Middleware。

## 工作流

先定义状态机、复位原因、持久化数据和失效安全路径，再映射到启动文件、OS 任务和 BSP 电源接口。对每条路径给出可观测的验收证据。

AES、PSA Crypto 和硬件加速的源码边界见 [`crypto-source-baseline.md`](references/crypto-source-baseline.md)。

交接：启动与链接交给对应工具 skill，电源/器件控制交给 [`bsp-handler`](../../bsp/bsp-handler/SKILL.md)，OS 资源交给 [`os-abstraction`](../../rtos/os-abstraction/SKILL.md)。

共享层契约见 [`software-layer-contract.md`](../../workflow/workflow-project-integration/references/software-layer-contract.md)。
