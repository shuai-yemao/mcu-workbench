---
name: bsp-adapter
description: 设计 BSP Wrapper、BSP Port、函数表、平台绑定和 Mock 替换边界。
---

# BSP Adapter

## 两段式边界

`Wrapper` 定义设备无关的 `drv_adapter_*` API、状态和错误码；`Port` 通过函数表把 Wrapper 绑定到目标板的 `hal_driver`。上层只调用 Wrapper，不能直接拿函数表或 Port 符号。

## 工作流

1. 从设备用例提取最小读写、初始化和电源接口。
2. 设计函数表，明确同步/异步、缓存、超时和 ISR 约束。
3. 编写 Wrapper 分发与注册，编写 Port 的板级绑定和 Mock。
4. 把器件协议实现交给 [`bsp-hal-driver`](../bsp-hal-driver/SKILL.md)，多实例和资源交给 [`bsp-handler`](../bsp-handler/SKILL.md)。

Wrapper/Port 的证据和 GR5526 验收项见 [`bsp-layer-evidence.md`](references/bsp-layer-evidence.md)。

## GR5526

检查 `drv_adapter_display.*`、`drv_adapter_port_disp.c`、norflash 和 touchpad 三组 Wrapper/Port；确认 Port 调用具体驱动而不是反向调用 APP。

共享契约见 [`software-layer-contract.md`](../../workflow/workflow-project-integration/references/software-layer-contract.md)。
