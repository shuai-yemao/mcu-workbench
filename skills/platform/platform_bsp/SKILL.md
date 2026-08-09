---
name: platform_bsp
description: Platform 纯定义：板级器件能力接口（board/battery/backlight/display/touch/imu/led…）+ 函数表/注册/对象协议，零实现不绑芯片。
---

# Platform BSP（平台抽象 · 纯定义）

## 边界

Platform BSP 定义平台无关的板级器件能力接口与对象协议：抽象函数表（`pf_*` ops 指针 + `p_context` 上下文）、注册入口、稳定转发与对象协议。函数表保存 `p_context` 与首参为 `void *context` 的 `pf_*`，以便 Impl 直接注册；不得包含 HAL、RTOS、Core 或具体 Driver 实现对象。

默认只允许系统启动阶段注册；若需要运行期重注册，Platform 必须定义函数表替换与并发转发的原子性，且 Impl 失败不能破坏已有可用注册。GPIO 输出能力验证边界见 `gpio-output-peripheral-checklist.md`。

平台对象绑定、后端选择和 OSAL 资源注入由 Impl 层负责（阶段 3 落地：`impl_board` / `impl_bsp`）；器件协议与业务运行时状态同样归 Impl。

## 必须读取（生成前 MUST，缺失任一即不得开始输出）

- 对象四元组模板：`../platform_common/references/object-four-tuple-template.md`（base + cfg/ctx/data/ops 判定标准）
- BSP 架构专用契约：`../../bsp/references/bsp-architecture-contract.md`
- GPIO 输出外设检查表：`../../bsp/references/gpio-output-peripheral-checklist.md`
- 生成代码完整注释 Profile：`../../tools/tools-quality/references/generated-bsp-comment-profile.md`
- 生成代码审查门禁：`../../tools/tools-quality/references/review-gates.md`
- 软件层契约：`../../workflow/workflow-review-gate/references/software-layer-contract.md`

## 公共定义来源

错误码统一使用 [`platform_common`](../platform_common/SKILL.md) 的 `platform_error.h` 中 `platform_err_t` 枚举（`PLATFORM_ERR_*`），跨层判定用 `PLATFORM_IS_ERR`/`PLATFORM_IS_OK`；`pf_*` 函数指针统一返回 `platform_err_t`（与 `platform_lifecycle.h` 生命周期回调签名一致）。接口参数与字段类型统一使用 `platform_type.h` 出口类型；常用宏统一取自 `platform_def.h`。

## 四元组判定规则（MUST）

按对象四元组模板判定 wrapper 层代码是否套 base + cfg/ctx/data/ops：

1. **必须套四元组**：若定义了「承载平台身份的 struct」（首字段为 `platform_device_t` 或 `platform_service_t`）→ `base` 必须为首字段，随后补齐 `cfg` / `ctx` / `data` / `ops` 四槽；本层设备对象 `base` 取 `platform_device_t`。
2. **豁免（须显式声明）**：仅纯粹行为函数表（`platform_<type>_ops_t`，只含 `pf_*` + `p_context`，无身份/生命周期字段）可豁免；豁免必须在头文件注释显式声明「纯转发、不承载对象身份」。
3. **禁止**用「纯接口」边界豁免一个已定义了设备对象 struct 的类型。

## 输出契约

每个器件类型 `<type>` 产出两个文件：

- `03_Platform/platform_bsp/<type>/Inc/platform_<type>_wrapper.h`
- `03_Platform/platform_bsp/<type>/Src/platform_<type>_wrapper.c`

文件结构要求：

- 完整注释 Profile：`@file` / `@brief` / `@par dependencies` / `@author` / 版本，及 `Includes`、`Private Defines`、`Private Types`、`Private State`、`Private Functions`、`Public Functions` 六分区（头文件无私有实现时可省略私有分区）。
- 至少包含：逻辑状态枚举、物理极性枚举（GPIO 输出设备）、`platform_<type>_ops_t`（`pf_*` 首参 `void *p_context`）、注册入口 `platform_<type>_wrapper_register`（仅启动期注册、重复注册返回 `PLATFORM_ERR_ALREADY_INIT`）、初始化失败回滚与 deinit。
- 板级常量不硬编码在 wrapper 内，预留 `bsp_<type>_config.h` 位置说明。
- GPIO 绑定未定前保留 `UNRESOLVED_GPIO_BINDING` 标记。

wrapper 为无芯片依赖的转发实现（不含 HAL/RTOS/具体 Driver），技能目录同样允许承载（门禁禁止芯片/RTOS/厂商依赖；绑定实现在 Impl）。

## 生成自检门禁（输出前 MUST）

输出代码前逐项核对，任一不满足不得交付：

- [ ] 四元组：按上述判定规则核对（设备对象 struct 是否 base 首字段 + 四槽齐全；纯转发是否有显式豁免声明）
- [ ] 错误码：全部使用 `platform_err_t` / `PLATFORM_ERR_*`，不压平为 -1
- [ ] 类型/宏：字段类型来自 `platform_type.h`，宏来自 `platform_def.h`，不自造等价物
- [ ] 注释：完整注释 Profile（`@file`/`@brief`/`@par dependencies`/`@author`/版本 + 六分区）
- [ ] GPIO 输出设备：逻辑态/物理电平极性映射、Core GPIO 上下文所有权、失败初始化状态、Port 回滚边界、deinit 规则
- [ ] 代码质量：按 `review-gates.md` 自查风格/功能/安全三类问题
- [ ] 门禁命令：在固件工程根运行
      `npm run validate:layer -- --root <firmware-root> --core <core> --device-type <type> --device <device> --slice wrapper`
      结果须为 valid

## 交接

器件驱动实现交给 [`impl_bsp`](../../impl/impl_bsp/SKILL.md)，Port 绑定交给 [`impl_board`](../../impl/impl_board/SKILL.md)；MCU 能力接口交给 [`platform_mcu`](../platform_mcu/SKILL.md)，OS 能力接口交给 [`platform_os`](../platform_os/SKILL.md)。共享层契约见 [`software-layer-contract.md`](../../workflow/workflow-review-gate/references/software-layer-contract.md)。
