---
name: platform_os
description: Platform 纯定义：OS 能力接口（OSAL、任务、队列、同步、定时、内存抽象），零实现不绑 RTOS。
---

# Platform OS（平台抽象 · 纯定义）

## 边界

Platform 定义稳定的 `osal_*` 公共接口；错误码统一使用 [`platform_common`](../platform_common/SKILL.md) 的 `platform_error.h` 中 `platform_err_t` 枚举（`PLATFORM_ERR_*`）。Impl 以 `os_*_impl()` 实现并绑定 FreeRTOS、RT-Thread 或裸机。`osal_internal_*.h` 只是 Wrapper 与 Port 的内部边界，不构成第三层。Impl 可使用公开 `osal_*` 创建并注入 Handler 所需资源，但任务入口、任务循环、缓存和设备生命周期逻辑仍归 Handler。

## 公共定义来源

错误码统一使用 [`platform_common`](../platform_common/SKILL.md) 的 `platform_error.h` 中 `platform_err_t` 枚举（`PLATFORM_ERR_*`）；`osal_*` 接口返回值一律为 `platform_err_t`，语义见枚举定义，**不定义、不返回项目私有错误码数字**。数据类型统一使用 `platform_type.h` 出口类型；常用宏统一取自 `platform_def.h`。对象四元组模板见 [`object-four-tuple-template.md`](../platform_common/references/object-four-tuple-template.md)。

## 必须读取（生成前 MUST，缺失任一即不得开始输出）

- 对象四元组模板：`../platform_common/references/object-four-tuple-template.md`（base + cfg/ctx/data/ops 判定标准）
- 生成代码格式、命名和注释统一遵循：`../../tools/tools-quality/references/style-profile.md`
- 生成代码审查门禁：`../../tools/tools-quality/references/review-gates.md`
- 软件层契约：`../../workflow/workflow-review-gate/references/software-layer-contract.md`

## 四元组判定规则（MUST）

1. **必须套四元组**：若定义了「承载平台身份的 struct」（首字段 `platform_device_t`/`platform_service_t`，或含对象身份/生命周期字段）→ `base` 首字段 + 补齐 `cfg`/`ctx`/`data`/`ops` 四槽。
2. **豁免（须显式声明）**：仅纯粹行为函数表（`osal_*_ops_t`，只含 `pf_*` + 上下文，无身份/生命周期字段）可豁免；豁免必须在头注释显式声明「纯转发、不承载对象身份」。
3. **禁止**用「纯接口」边界豁免一个已定义了对象 struct 的类型。

## 生成自检门禁（输出前 MUST）

输出代码前逐项核对，任一不满足不得交付：

- [ ] 四元组：按判定规则核对
- [ ] 错误码：`osal_*` 一律返回 `platform_err_t`，不返回项目私有数字
- [ ] 类型/宏：`platform_type.h` 出口类型、`platform_def.h` 宏，不自造
- [ ] 依赖：OSAL 公共接口不暴露 RTOS 原生类型
- [ ] 注释：按 `style-profile.md` 检查文件头、公开 API 和必要约束
- [ ] 代码质量：按 `review-gates.md` 自查

## 接口族

任务、队列、信号量、互斥锁、软件定时器、延时、时基、内存和临界区分别定义句柄所有权、超时单位、ISR 可用性和错误语义（统一 `platform_err_t`，见 `platform_common`）。事件、Notify、取消等能力只有在当前 Impl 已实现并经过测试时才可加入公共接口。

## 生成契约

OSAL 接口族收敛为单一公共头 `03_Platform/platform_os/Inc/osal.h`，按接口族（任务/队列/信号量/互斥锁/软件定时器/延时/时基/内存/临界区）分段声明 `osal_*` 原型；零 `.c`（OSAL 是纯接口，`os_*_impl()` 实现由 [`impl_os`](../../impl/impl_os/SKILL.md) 绑定具体 RTOS 或裸机）。`osal_internal_*.h` 仅作 Wrapper/Port 内部边界，不对外输出。

公共头不包含 RTOS 原生类型；句柄所有权、超时单位、ISR 可用性与错误语义（`platform_err_t`）在接口文档固定（见 [`osal-contract.md`](references/osal-contract.md)）。技能目录允许的无芯片依赖公共实现不适用于 OSAL——OSAL 实现必然绑定 RTOS，归 Impl。

## 工作流

1. 先列出调用方需要的最小接口，不复制原生 RTOS API。
2. 决定句柄生命周期、静态/动态内存和 ISR 边界。
3. 定义接口，再由 Impl 创建并注入已确认的 OSAL 资源；明确创建者、Handle 所有者、失败回收、超时单位和 ISR 可用性，并用 Fake/Mock 验证上层。
4. 只有出现具体 RTOS 或裸机运行时配置时交接 [`impl_os`](../../impl/impl_os/SKILL.md)。

接口验收矩阵见 [`osal-contract.md`](references/osal-contract.md)。

## 禁止

不在 OSAL 中放 BSP 设备协议，不让 APP 或 Service 绕过接口调用原生 RTOS。

共享层契约见 [`software-layer-contract.md`](../../workflow/workflow-review-gate/references/software-layer-contract.md)。
固定源码映射案例见 [`osal-freertos-case.md`](references/osal-freertos-case.md)。
