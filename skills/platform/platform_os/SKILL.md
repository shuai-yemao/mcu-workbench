---
name: platform_os
description: Platform OS：定义不泄漏 RTOS 原生类型的 OS 能力契约，并根据目标工程证据识别直接后端或显式 Impl 桥接。用户提到 OSAL、任务/队列/同步/Timer/heap、公共句柄、超时单位、ISR 或 OS 分层时使用本 Skill。
---

# Platform OS（平台抽象 · 公共契约）

## 边界

Platform OS 定义稳定的 `platform_os_*` 能力契约、公共类型、错误语义、句柄
和生命周期规则。它不承载业务策略、任务入口、设备协议、缓存、重试或
Handler 生命周期。

具体 RTOS、裸机时基、原生类型、配置和资源绑定属于实现后端。目标工程必须
通过公共头、实现文件、配置和测试判断后端属于哪一种实现剖面；本 Skill 不
强制所有工程增加 `impl_os_*` 二次桥接。

## 实现剖面

| 剖面 | 需要的最小证据 | 允许的结论 |
|---|---|---|
| `direct-platform-backend` | Platform 公共头、对应 `.c`、RTOS 配置/构建入口 | `platform_os.c` 可直接绑定原生 RTOS；不要求 Impl 桥接 |
| `explicit-impl-bridge` | 公共头、internal 头、Platform/Impl `.c`、配置/测试 | 可确认 `platform_os_* → impl_os_* → native API` |
| `bare-metal-or-fake` | 裸机时基、Fake/Mock 或 Port 证据 | 只能确认已证明的替代后端能力 |
| `mixed` | 不同能力族存在不同实现证据 | 必须按能力族分别标记 |
| `missing` | 缺少公共头、实现、配置或构建入口 | 只能输出未解析标记，不得声称可编译 |

`platform_os_internal_*.h` 如果真实存在，只是 Platform/Impl 的内部边界；
它不是第三层公共 API。`impl_os_*` 如果真实存在，必须以头文件、实现和
测试证明其职责，不能仅因目录名称或历史命名推断其存在。

## 公共定义来源

新接口优先使用 [`platform_common`](../platform_common/SKILL.md) 的公共错误码、
类型和宏出口。实际工程的公共头、别名和返回类型优先于规范目标；分析时必须
同时记录“规范要求”和“源码观察”，不能用规范目标覆盖源码事实。

Platform OS 公共头不得 include 或暴露：

- FreeRTOS、RT-Thread、CMSIS-OS 或其他 RTOS 原生头文件和类型；
- CMSIS compiler、HAL、芯片寄存器或板级类型；
- C 标准库头文件、标准库类型或依赖标准库实现的宏。

Platform `.c` 是否直接 include RTOS 原生头文件，必须由目标工程真实分层和
构建入口确认；本 Skill 不把“绝不直接绑定”或“必须二次桥接”写成通用规则。

## 必须读取（生成或审查前）

- `../../tools/tools-quality/references/style-profile.md`
- `../../tools/tools-quality/references/review-gates.md`
- `../../workflow/workflow-review-gate/references/software-layer-contract.md`
- 目标工程的 Platform 公共头、对应 `.c`、internal 头（如有）、Impl 文件、
  RTOS 配置、构建入口和已有测试

## 公共契约门禁

- [ ] 公共头只暴露稳定能力、必要类型、错误码和生命周期信息
- [ ] 句柄、所有权、超时单位、阻塞属性、ISR 可用性、可重入性和错误语义明确
- [ ] 新接口使用已确认的 `platform_common` 类型；不新增私有公共类型
- [ ] 原生 RTOS、CMSIS、HAL、芯片和 C 标准库依赖没有泄漏到公共头
- [ ] 直接后端或显式桥接由真实文件、配置和测试证据决定
- [ ] 只声明调用方需要且后端/测试确实支持的能力
- [ ] `platform_os_internal_*.h` 仍是两层内部边界，不被当成第三层
- [ ] 规范要求、工程观察和未验证项分开记录

## 能力范围

任务、队列、二值/计数信号量、互斥锁、软件定时器、延时、时基、内存和临界
区分别定义句柄、单位、所有权、阻塞和 ISR 语义。Event Group、Task
Notification、Stream Buffer、Message Buffer 和取消语义不能从某个 RTOS 的
原生存在反推为 Platform OS 公共能力；必须由公共头、后端实现和测试共同证明。

## 工作流

1. 读取调用方需求，列出最小 Platform OS 能力，不复制原生 RTOS API。
2. 确定句柄生命周期、静态/动态内存、超时单位、阻塞属性和 ISR 边界。
3. 读取公共头、实现 `.c`、配置、构建入口和测试，选择实现剖面。
4. 按能力族核对 `platform_os_* → platform_os.c → native API` 或
   `platform_os_* → internal header → impl_os_* → native API`。
5. 将具体 RTOS 配置、原生 API、单位转换、错误映射和后端验证交给
   [`impl_os`](../../impl/impl_os/SKILL.md)。
6. 用 Fake/Mock 或主机检查验证公共契约；将交叉编译、目标运行和实物证据
   分开记录。

接口验收矩阵见 [`platform-os-contract.md`](references/platform-os-contract.md)；
FreeRTOS 案例见 [`platform-os-freertos-case.md`](references/platform-os-freertos-case.md)。

## 禁止

不在 Platform OS 中放 BSP 设备协议，不让 APP、Service、BSP Driver 或
Middleware 绕过公共契约调用原生 RTOS。不要因文件夹名称、函数命名、静态源码
映射、主机测试或日志推断目标构建、烧录或板上验证已经通过。
