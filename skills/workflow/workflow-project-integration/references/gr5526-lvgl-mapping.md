# GR5526 LVGL 验收映射

以 `graphics_lvgl_831_gpu_demo_360p.uvprojx` 为样例，验收以下证据：

| 目标 skill | 工程证据 | 验收问题 |
|---|---|---|
| `app-architecture` | `Src/app/main.c`、`manager/`、`task/`、`ux_logic/` | 启动、Manager、Task、UI 是否只调用 Wrapper/API |
| `os-abstraction` | `components/graphics/lvgl_port/os_adapter/shared/src/osal_*.c` | Wrapper 是否不暴露 FreeRTOS 类型 |
| `rtos-freertos` | `os_adapter/FreeRTOS/src/os_impl_*.c` | Port 是否只绑定原生 `xTask*` 等实现 |
| `bsp-adapter` | `drv_adapter_display.*`、`drv_adapter_port_*.c` | Wrapper/Port/函数表边界是否清晰 |
| `bsp-hal-driver` | `driver/graphics_dc_*`、QSPI、Touch 驱动 | 器件初始化、读写、睡眠唤醒是否在 hal_driver |
| `bsp-handler` | `app_power_manager.c`、任务缓存和事件 | 生命周期与资源所有权是否可追踪 |
| `core-mcu`/`driver-vendor` | `gr_arch`、`gr_soc`、SDK 库 | 是否没有伪造 Adapter |
| Middleware | `lvgl_*`、`lvgl_port.*` | LVGL 使用 OS/BSP 公共 API，不绑定 RTOS 原生类型 |

启动链应能还原为：`main → app_periph_init → board_init/register → osal_task_create → vStartTasks → lv_user_task_create`。
