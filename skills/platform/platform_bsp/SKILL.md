---
name: platform_bsp
description: Platform 纯定义：板级器件能力接口（board/display/touch/imu/storage/temp_humi…）与设备模型协议，零实现不绑芯片；当前不生成 BSP Wrapper。
---

# Platform BSP（平台抽象 · 纯定义）

## 边界

Platform BSP 定义平台无关的板级器件能力接口与设备模型协议：设备模型保存对象身份、`cfg/ctx/data/ops` 和 typed Ops；具体绑定由 Impl/组合根完成。不得包含 HAL、RTOS、Core 或具体 Driver 实现对象，也不定义独立的 BSP Wrapper 注册/转发层。

### 当前工程的 BSP Driver 依赖判定

在当前证据工程中，`impl_bsp` Driver 可以包含 `platform_*.h` 公共能力契约，例如 `platform_gpio.h`、`platform_spi.h` 和 `platform_tick.h`；这些头文件不等于 HAL、RTOS 或具体后端实现。架构扫描不得使用全局 `platform_` 关键字拒绝该类公共契约，必须单独拒绝 STM32 HAL、FreeRTOS、CMSIS-OS、OSAL、Wrapper 和具体后端依赖。

此规则只放宽 Platform 公共契约头，不放宽 Platform 具体实现、Vendor 头或板级绑定。若工程采用不同目录，必须以实际公共头/实现路径和回归 fixture 证明边界，不能通过目录总排除消除误报。

默认只允许系统启动阶段完成对象装配和管理器注册；运行期对象替换、并发切换和资源回收由 Impl/组合根定义，不由 Platform BSP 增加公共 Wrapper 注册槽。GPIO 输出能力验证边界见 `gpio-output-peripheral-checklist.md`。

平台对象绑定、后端选择和 OSAL 资源注入由 Impl 层负责（阶段 3 落地：`impl_board` / `impl_bsp`）；器件协议与业务运行时状态同样归 Impl。新 BSP 中，`impl_<type>_handle_*()` 是 Handle 的 Platform-facing 函数声明，Port 将其绑定到本层的 `platform_<type>_ops_t`；这些函数不是第二个 Wrapper，也不要求 Platform 了解 Driver/Handle 类型。

## 必须读取（生成前 MUST，缺失任一即不得开始输出）

- 对象四元组模板：`../platform_common/references/object-four-tuple-template.md`（base + cfg/ctx/data/ops 判定标准）
- 设备模型样例：`references/device-model-example.md`；仓库中仍存在的历史 BSP Wrapper 架构文档不作为当前 Model 产出依据。
- GPIO 输出外设检查表：`../../bsp/references/gpio-output-peripheral-checklist.md`
- 生成代码格式、命名和注释统一遵循：`../../tools/tools-quality/references/style-profile.md`
- 生成代码审查门禁：`../../tools/tools-quality/references/review-gates.md`
- 软件层契约：`../../workflow/workflow-review-gate/references/software-layer-contract.md`

## 公共定义来源

错误码统一使用 [`platform_common`](../platform_common/SKILL.md) 的 `platform_error.h` 中 `platform_err_t` 枚举（`PLATFORM_ERR_*`），跨层判定用 `PLATFORM_IS_ERR`/`PLATFORM_IS_OK`；`pf_*` 函数指针统一返回 `platform_err_t`（与 `platform_lifecycle.h` 生命周期回调签名一致）。接口参数与字段类型统一使用 `platform_type.h` 出口类型；常用宏统一取自 `platform_def.h`。

## 四元组判定规则（MUST）

按对象四元组模板判定设备模型是否套 `base + cfg/ctx/data/ops`：

1. **必须套四元组**：若定义了「承载平台身份的 struct」（首字段为 `platform_device_t` 或 `platform_service_t`）→ `base` 必须为首字段，随后补齐 `cfg` / `ctx` / `data` / `ops` 四槽；本层设备对象 `base` 取 `platform_device_t`。
2. **纯 Ops 不是第二层 Wrapper**：模型 Ops 首参使用具体设备指针，服务调用保持类型安全；若某个接口确实只是纯能力函数表，必须在头文件注释显式声明「纯转发、不承载对象身份」，并由对应 Impl 直接绑定。
3. **禁止**用「纯接口」边界豁免一个已定义了设备对象 struct 的类型。

## 输出契约

当前工程的每个器件类型 `<type>` 产出两个模型文件（Model 契约 + Model 初始化实现）：

- `03_Platform/platform_bsp/<type>/Inc/platform_<type>_model.h` —— **设备模型头**
- `03_Platform/platform_bsp/<type>/Src/platform_<type>_model.c`

### 设备模型头（platform_<type>_model.h，ADR-013）

模型头定义"设备长什么样"，**不写"怎么落地"**（契约，接口永不改；Service 可直接 include）：

- 四件套命名强制：`<type>_cfg_t` / `<type>_ctx_t` / `<type>_data_t` / `<type>_ops_t`（见四元组模板 v2）。
- 布局规则：`cfg` / `ops` = const 指针（共享），`ctx` / `data` = **内联值**（独有）——"共享的用指针，独有的用内联"。
- 设备对象 struct：`<type>_device_t`，`base` 首字段 + 四槽（偏移 0）。
- 模型 Ops 首参**具体设备指针**（`<type>_device_t *p_dev`），裸名（`read`/`sleep`）——Service 层类型安全调用。
- 可选：厂商型号别名（`mpu6050_cfg_t = <type>_cfg_t`），换芯片只改别名。
- guard 用 `PLATFORM_<TYPE>_MODEL_H`（禁 `__XXX_H__` 双下划线）。
- `platform_<type>_init()` 声明（填身份证 + 绑四槽）；工程当前实现落 `model.c`，硬件绑定和协议实现仍交给 Impl，不在 Model 中下沉。

完整样例与生成自检要点见 [`device-model-example.md`](references/device-model-example.md)。

### 生成流程（两步）

```text
① Model 头（类型契约）→ ② Model 源（对象初始化）→ ③ Driver/Handle 由 Impl 组合根装配并绑定 typed Ops
```

文件结构要求（Model）：

- 统一注释规则：按 `style-profile.md` 生成文件头、公开 API Doxygen、必要的资源/并发/硬件约束说明和源文件分区。
- 至少包含：设备模型四件套、typed `platform_<type>_ops_t`（首参为具体设备指针）、模型初始化入口、初始化失败后的对象状态语义。
- 板级常量不硬编码在 Model 内；GPIO、总线、IRQ、供电和器件协议由 `board` profile 与 Impl/组合根提供。
- GPIO 绑定未定前保留 `UNRESOLVED_GPIO_BINDING` 标记；不能通过新增 Wrapper 文件掩盖绑定缺口。

Model 源只负责公共对象身份和模型契约所需的初始化，不承担设备协议、Handler、重试、缓存、任务或资源绑定。

## Platform/Impl 扩展基线

扩展一个新的 BSP 能力时，先判断能力是否属于 Platform 公共契约，再决定是否增加
`platform_<type>_model.h/.c`。以下内容必须留在 Impl：具体型号命令、寄存器序列、页/块策略、
设备协议状态机、队列、线程、重试、回调和 DMA 缓冲区所有权。

```text
Platform Model
  = 身份 + 通用配置 + 状态快照 + typed Ops

Impl Port
  = Resource + Driver + Handle + OS/并发资源 + 注册
```

以外部 Flash 为例，容量、块大小和 `read/write/erase` 能力可以进入 Platform 契约；页编程、
擦除轮询、4 KB 缓冲、OTA/日志分区和掉电刷写策略只能作为 Driver、Handle 或 Service 的设备/业务特例。
Model 不得因为某个设备使用 SPI 就保存具体 Flash、CS、DMA 或 HAL 句柄。

Platform Ops 需要明确输入输出所有权、阻塞属性、超时单位、ISR 可用性、线程安全、回调上下文
和失败后的对象状态。异步接口还必须说明缓冲区借用期限以及完成、错误、中止事件的语义。

本 Skill 的 BSP Model 当前沿用 `platform_<type>_model.c` 命名；这不覆盖 `platform_mcu` 的独立命名规则。MCU 能力 Model 源文件必须与对应公共头同名，具体规则以 [`platform_mcu`](../platform_mcu/SKILL.md) 为准。

## 生成自检门禁（输出前 MUST）

输出代码前逐项核对，任一不满足不得交付：

- [ ] 四元组：按上述判定规则核对（设备对象 struct 是否 base 首字段 + 四槽齐全）
- [ ] 错误码：全部使用 `platform_err_t` / `PLATFORM_ERR_*`，不压平为 -1
- [ ] 类型/宏：字段类型来自 `platform_type.h`，宏来自 `platform_def.h`，不自造等价物
- [ ] 注释：按 `style-profile.md` 检查文件头、公开 API、必要约束和源文件分区
- [ ] GPIO 输出设备：逻辑态/物理电平极性映射、Core GPIO 上下文所有权、失败初始化状态、Impl/组合根回滚边界、deinit 规则
- [ ] 代码质量：按 `review-gates.md` 自查风格/功能/安全三类问题
- [ ] 门禁：不得调用或恢复旧的 `--slice wrapper` 规则；验证器必须同时检查 Model 产物、Handle 的同类 Driver 约束、Port 的 typed Ops 绑定和历史 Wrapper 禁止默认生成

## 交接

器件驱动实现交给 [`impl_bsp`](../../impl/impl_bsp/SKILL.md)，Port 绑定交给 [`impl_board`](../../impl/impl_board/SKILL.md)；MCU 能力接口交给 [`platform_mcu`](../platform_mcu/SKILL.md)，OS 能力接口交给 [`platform_os`](../platform_os/SKILL.md)。共享层契约见 [`software-layer-contract.md`](../../workflow/workflow-review-gate/references/software-layer-contract.md)。
