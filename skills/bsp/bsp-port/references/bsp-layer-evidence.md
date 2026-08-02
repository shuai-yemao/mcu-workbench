# BSP 分层证据与验收

## 调用链

```text
BSP Handler
  → BSP Wrapper (drv_adapter_*)
  → BSP Port (drv_adapter_port_*)
  → 具体 hal_driver
  → Core MCU 外设接口
  → Vendor Driver
```

Wrapper 只定义稳定的设备能力和错误模型；Port 只注入板级函数表、GPIO/总线实例、DMA 和中断绑定。Port 不保存业务状态，也不反向调用 Handler 或 APP。

## GR5526 证据

使用 `drv_adapter_display.*`、`drv_adapter_port_disp.c`、NOR Flash 和 Touchpad 的真实调用链，分别确认：

- Wrapper 是否隐藏板级函数表；
- Port 是否只调用 `hal_driver` 和 Core 能力；
- Flush、输入、Flash 读写是否有超时和错误恢复；
- Mock 是否可以替换 Port 而不修改 APP/Middleware。

具体工程文件映射见 [`gr5526-lvgl-mapping.md`](../../../workflow/workflow-project-integration/references/gr5526-lvgl-mapping.md)。
