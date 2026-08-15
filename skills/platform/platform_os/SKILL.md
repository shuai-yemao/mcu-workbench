---
name: platform_os
description: Platform OS：定义不泄漏 RTOS 原生类型的 OS 能力契约，并审查其与 impl_os Port 的真实映射。用户提到 OSAL、任务/队列/同步/Timer/heap、公共句柄、超时单位或 ISR 边界时使用本 Skill。
---

# Platform OS（平台抽象 · 公共契约）

## 边界

Platform 定义稳定的 `platform_os_*` 公共接口；规范上错误码应归一到 `platform_common` 的 `platform_err_t`/`PLATFORM_ERR_*`，但审查现有工程时必须以真实公共头的返回类型和别名为准。Impl 以 `impl_os_*()` 实现并绑定 FreeRTOS、RT-Thread 或裸机。`platform_os_internal_*.h` 只是 Platform/Impl 的内部边界，不构成第三层。Impl 可使用公开 `platform_os_*` 创建并注入 Handler 所需资源，但任务入口、任务循环、缓存和设备生命周期逻辑仍归 Handler。

### 当前工程的 Impl OS 后端边界

当前工程没有 `04_Impl/impl_os/freertos` 子目录。`04_Impl/impl_os/inc/impl_os_freertos.h` 是 FreeRTOS 后端宏和原生头文件入口，`04_Impl/impl_os/src/impl_os_*.c` 负责把 Platform OS 能力映射到 FreeRTOS API。因此，规则识别必须优先按 `impl_os_<backend>.h` 文件名和 `impl_os/src` 的实际映射职责判断，不能仅因文件位于 `inc` 就将其归类为公共 OS Wrapper。

这只描述 Impl OS 的具体后端边界；`03_Platform/platform_os/inc` 公共头仍不得暴露 FreeRTOS、RT-Thread、CMSIS-OS 或芯片类型。

## 公共定义来源

新接口应使用 [`platform_common`](../platform_common/SKILL.md) 的 `platform_err_t`/`PLATFORM_ERR_*`，不定义项目私有错误码。分析既有工程时，必须同时记录实际返回类型、宏别名和 Impl 的失败映射；不能用规范目标覆盖源码事实。数据类型统一使用 `platform_type.h` 出口类型；常用宏统一取自 `platform_def.h`。

## 必须读取（生成前）

- 生成代码格式、命名和注释：`../../tools/tools-quality/references/style-profile.md`
- 生成代码审查门禁：`../../tools/tools-quality/references/review-gates.md`
- 软件层契约：`../../workflow/workflow-review-gate/references/software-layer-contract.md`
- 当前工程的公共头、`platform_os_internal_*.h`、Platform OS 转发 `.c`、Impl `.c` 和 RTOS 配置

## 生成自检门禁

- [ ] 公共头不暴露 FreeRTOS、RT-Thread、CMSIS-OS 或芯片类型
- [ ] 句柄、所有权、超时单位、阻塞属性、ISR 可用性、可重入性和错误语义已写入接口契约
- [ ] 新接口使用 `platform_err_t`；既有接口核对真实返回类型与 `PLATFORM_ERR_*` 别名
- [ ] 只声明当前调用方需要且 Impl/测试确实支持的能力
- [ ] `platform_os_internal_*.h` 仍是两层内部边界，不被当成第三层
- [ ] 规范要求、目标工程观察和未验证项分开记录

## 接口族

任务、队列、信号量、互斥锁、软件定时器、延时、时基、内存和临界区分别定义句柄所有权、超时单位、ISR 可用性和错误语义。事件、Notify、取消等能力只有在当前 Impl 已实现并经过测试时才可加入公共接口；FreeRTOS 原生存在不等于 Platform OS 已公开。

## 生成契约

Platform OS 公共头按接口族声明 `platform_os_*` 原型；是否存在 `platform_os_*.c` 转发实现必须以目标工程为准。当前证据工程确有 `03_Platform/platform_os/src/platform_os_*.c`，其内部调用 `impl_os_*()`；`platform_os_internal_*.h` 仅作两层内部边界，不对外输出。

公共头不包含 RTOS 原生类型；具体 RTOS 绑定归 [`impl_os`](../../impl/impl_os/SKILL.md)。Platform OS 转发层只做参数检查、公共语义和稳定转发，不保存业务状态；这里的转发层不是已废弃的 BSP Wrapper。

## 工作流

1. 先列出调用方需要的最小接口，不复制原生 RTOS API。
2. 决定句柄生命周期、静态/动态内存和 ISR 边界。
3. 定义接口，再由 Impl 创建并注入已确认的 Platform OS 资源；明确创建者、Handle 所有者、失败回收、超时单位和 ISR 可用性，并用 Fake/Mock 验证上层。
4. 读取目标工程的公共头、internal 头、Platform OS 转发 `.c`、Impl `.c` 和 RTOS 配置，逐函数核对 `platform_os_* → impl_os_* → native API`。
5. 只有出现具体 RTOS 或裸机运行时配置时交接 [`impl_os`](../../impl/impl_os/SKILL.md)。

接口验收矩阵见 [`platform-os-contract.md`](references/platform-os-contract.md)；FreeRTOS 案例见 [`platform-os-freertos-case.md`](references/platform-os-freertos-case.md)。

## 禁止

不在 Platform OS 中放 BSP 设备协议，不让 APP、Service、BSP Driver 或 Middleware 绕过接口调用原生 RTOS。不要把静态源码映射、主机测试或日志推断写成目标构建或板上验证。
