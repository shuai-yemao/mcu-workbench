# 嵌入式插件架构统一 SRSys

## 1. 系统规格概述

系统采用五层契约：

```text
App → Service → Platform ← Impl → Vendor
```

Platform 子域为 `platform_common`、`platform_os`、`platform_bsp`、`platform_mcu` 和 `platform_middleware`；Impl 子域沿用当前 `impl_board`、`impl_bsp`、`impl_os` 和 `impl_middleware`。

## 2. 功能需求

1. App 必须只引用 Service 公共接口。
2. Service 必须通过 Platform 公共契约获取系统、板级、MCU 和中间件能力。
3. Platform Common 必须作为基础类型、错误码、对象、生命周期和 Ops/Context 的统一来源。
4. Impl 必须实现或装配 Platform 契约，并通过 Vendor 接入具体底座。
5. OS/BSP Adapter 必须由 Wrapper 与 Port 组成；该角色不升级为新的顶层层级。
6. BSP Driver 和 Handle 必须保留在 Impl BSP 内部。

## 3. 非功能需求

- 依赖方向单向且可静态审计。
- 不泄漏 HAL、RTOS、Vendor 类型到 App、Service 或 Platform 公共头。
- 失败路径、资源所有权、阻塞属性、ISR 限制和回调上下文必须在具体实现中明确。
- 文档、知识图谱、Skill 和测试不得维护第二条规范调用链。

## 4. 接口需求

| 接口域 | 公共契约 | 具体实现 |
|---|---|---|
| 公共基础 | `platform_common` | Platform 公共实现/管理器 |
| OS | `platform_os`、`osal_*` | `impl_os`、`os_*_impl()` |
| BSP | `platform_bsp`、函数表/注册 | `impl_board`、`impl_bsp`、Driver、Handle |
| MCU | `platform_mcu` | 现有 Platform MCU 后端及 Vendor HAL/CMSIS/SDK |
| Middleware | `platform_middleware` | `impl_middleware` 及 Vendor 底座 |

## 5. 验收标准

| 等级 | 标准 |
|---|---|
| 静态 | 文档和知识图谱统一主链；不存在 App 直连 Wrapper 的规范表述 |
| 主机 | `npm test -- --runInBand` 通过 |
| 插件 | `npm run validate:plugin` 通过 |
| 架构 | 目标固件运行 `npm run validate:architecture -- --root <firmware-root>` 通过 |
| 构建 | 目标固件交叉编译通过；本轮无目标工程，暂未验证 |
| 运行/实物 | 烧录、RTT/串口和时序观测；本轮无目标板，暂未验证 |

## 6. 未验证项

目标 MCU、板卡、RTOS 版本、工具链、目标固件路径和硬件观测通道尚未指定，因此本轮不宣称目标构建或实机验证完成。
