---
name: service_storage
description: Service 业务服务：参数存取、KV、分区管理、掉电安全（带业务策略，非驱动封装）。
---

# Service 存储业务

## 边界

Service 是 **App 常见业务抽象**（D10）：把产品业务中可沉淀、可复用的能力组织成服务，**带业务策略**，不是驱动的简单封装，也不是中间件封装。本服务只依赖 Platform 接口（platform_mcu/flash+fs 规范），不 include Vendor / Impl / HAL 任何符号。

## 业务策略

参数默认值/读写缓存、KV 命名与版本、分区磨损均衡、掉电一致性（写后校验）。

## 交付物（范本对齐 02_Service/）

| 文件 | 内容 |
|---|---|
| `service_storage.c/.h` | 服务实现与公开 API |
| `service_storage_model.h` | 数据模型：param_key_t / param_value_t / storage_region_t |
| `service_storage_state.h` | 状态机：就绪 / 写入 / 校验 / 恢复 |
| `service_storage_fault_code.h` | 故障码：STOR_ERR_CRC_MISMATCH / STOR_ERR_WEAR_EXCEED / STOR_ERR_OVERFLOW |

## 工作流

1. 定义数据模型与状态机（_model/_state/_fault_code），先于实现；
2. 通过 Platform 接口采集/下发底层能力，施加业务策略（阈值、超时、降级、重试）；
3. 输出可观测的验收证据（状态迁移、策略触发、故障码上报）。

## 禁止

- 不得 include Vendor / Impl / HAL 头文件或直接碰寄存器；
- 不得把器件协议、时序、寄存器语义下沉到本服务（那是 impl 层职责）；
- 不得包含具体产品 UI/业务流程（那是 app 层职责）。

交接：底层能力经 [`platform_os`](../../platform/platform_os/SKILL.md) / [`platform_mcu`](../../platform/platform_mcu/SKILL.md) / [`platform_bsp`](../../platform/platform_bsp/SKILL.md) 接口获取；实现落地在 impl 层。
