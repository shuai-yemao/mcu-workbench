---
name: platform_common
description: Platform 纯定义：公共定义（platform_def/error/type/object/registry），统一错误码/类型/对象协议/注册表规范，零实现不绑芯片/RTOS。
---

# Platform Common（平台抽象 · 公共定义）

## 边界

只承载全平台共享的**纯定义**：全局宏/编译开关、统一错误码、基础类型、对象协议、注册表。不实现任何逻辑，不依赖具体芯片、HAL 或 RTOS。

## 统一规范

- **platform_def.h**：平台无关基础宏、编译期开关、版本与命名空间前缀约定；
- **platform_error.h**：全局错误码基线（`PLATFORM_OK` / `PLATFORM_ERR_PARAM` / `PLATFORM_ERR_TIMEOUT` / `PLATFORM_ERR_BUSY` / `PLATFORM_ERR_NOT_SUPPORTED` / `PLATFORM_ERR_IO` / `PLATFORM_ERR_NO_MEM` / `PLATFORM_ERR_STATE` / `PLATFORM_ERR_CRC`），Service/Impl 只在其后扩展，禁止重复编号；
- **platform_type.h**：基础类型与公共数据结构；
- **platform_object.h**：统一对象协议（ops 指针 + impl 私有数据 + handle）；
- **platform_registry.h**：统一注册表（name → `platform_object_t`）。

## 生成契约

`03_Platform/platform_common/` 只含头文件（零 `.c`）。各模块头文件统一 include `platform_common/platform_*.h`，不得复制定义。

## 禁止

禁止在此放芯片专有能力、Vendor 类型、RTOS 句柄、业务状态或任何实现代码。

## 交接

芯片外设能力接口交给 [`platform_mcu`](./platform_mcu/SKILL.md)；OS 能力接口交给 [`platform_os`](./platform_os/SKILL.md)；板级器件接口交给 [`platform_bsp`](./platform_bsp/SKILL.md)；中间件能力接口交给 [`platform_middleware`](./platform_middleware/SKILL.md)。

共享层契约见 [`software-layer-contract.md`](../../workflow/workflow-review-gate/references/software-layer-contract.md)。
