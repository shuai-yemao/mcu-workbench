# Skills 导航

## 软件架构入口

```text
APP
├─ app-architecture
├─ middleware-lvgl / middleware-communication / middleware-storage / middleware-algorithms
├─ os-abstraction → rtos-freertos
└─ bsp-handler → bsp-adapter → bsp-hal-driver → core-mcu → driver-vendor
```

`workflow-router` 负责分诊，`workflow-project-integration` 负责跨层审计与集成路线，`software-system` 负责 Bootloader、低功耗、看门狗和安全等跨层能力。

### Adapter 边界

- OS：`osal_*` Wrapper → `os_impl_*` Port → 具体 RTOS/裸机。
- BSP：`drv_adapter_*` Wrapper → `drv_adapter_port_*` Port → `hal_driver`。
- Core、Middleware、Driver：使用原生配置/API，不创建 Adapter。

### GR5526 LVGL 验收

以 `graphics_lvgl_831_gpu_demo_360p.uvprojx` 检查 `main`、Manager、Task、LVGL、OSAL、Display/Flash/Touch Wrapper/Port/hal_driver 和 SDK Core/Driver 调用链。证据映射见 [workflow-project-integration references](workflow/workflow-project-integration/references/gr5526-lvgl-mapping.md)。

## 兼容与迁移

旧 skill 目录暂不删除。catalog 保存旧目录用于校验，`resolveSkillId()` 将已合并入口路由到 canonical skill；完整矩阵见 [docs/skills-migration.md](../docs/skills-migration.md)。
