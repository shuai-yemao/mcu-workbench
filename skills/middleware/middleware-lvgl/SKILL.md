---
name: middleware-lvgl
description: 按项目锁定的 LVGL 版本完成 GUI 中间件集成、显示/输入接入、OS 协作和运行时性能验证。
---

# LVGL 中间件

## 职责边界

负责 LVGL 公共 API、对象树、控件、样式、布局、事件、动画、显示刷新和输入分发。
显示、触摸、按键、背光、DMA 与缓存通过 BSP Wrapper 提供；Tick、任务、锁和等待通过 OS Wrapper 提供。
LVGL 不直接调用 FreeRTOS、Core、Driver 或具体器件实现，APP 业务规则仍由 `app-architecture` 负责。

## 选择流程

1. 从工程配置、头文件或构建日志确认 LVGL 版本；只能选择一个版本矩阵条目。
2. 确认显示分辨率、颜色格式、刷新模式、缓冲数量，以及输入设备类型。
3. 依次完成 `lv_init`、Tick、Display、Flush Callback、Input Callback 和 OS 锁接入。
4. 再配置 Widgets/UI，最后测量帧耗时、内存、水位、刷新完成和输入延迟。
5. 版本迁移时先阅读 API 映射，禁止把 v8、v9 API 拼接在同一个工程中。

## 输入与产出

输入包括：项目版本、`lv_conf.h`、显示/输入硬件能力、OS 约束、缓冲区预算、构建日志和目标验收指标。

产出包括：LVGL 配置、初始化与调度方案、显示/输入接入清单、UI 代码边界、性能数据、版本证据和未解决问题。

## References

- [知识图谱](references/lvgl-knowledge-graph.md) / [JSON 图谱](references/lvgl-knowledge-graph.json)
- [版本兼容矩阵](references/version-compatibility.md)
- [移植契约](references/porting-contract.md)
- [UI 与运行时性能](references/ui-runtime-performance.md)
- [配置、构建与验证](references/config-build-validation.md)

## 交接与验收

- 设备绑定交给 [`bsp-adapter`](../../bsp/bsp-adapter/SKILL.md)，器件协议交给 [`bsp-hal-driver`](../../bsp/bsp-hal-driver/SKILL.md)。
- 任务、Tick、互斥和等待交给 [`os-abstraction`](../../rtos/os-abstraction/SKILL.md)。
- 业务页面和业务状态交给 [`app-architecture`](../../workflow/app-architecture/SKILL.md)。
- 构建、日志、性能和回归证据交给 [`tools-quality`](../../tools/tools-quality/SKILL.md) 或 [`tools-observability`](../../tools/tools-observability/SKILL.md)。

验收必须能追溯到：锁定的版本、有效的初始化顺序、Flush/Input 完成信号、配置项、测试结果和变更文件。

## GR5526 验收

以 LVGL 8.3.x 工程检查 `lvgl_*`、`lvgl_port.*`、`task_gui`、`task_indev`，确认显示和触摸调用经过 BSP Wrapper，Tick、任务和锁经过 OS Wrapper，并保留一次编译与实际刷新证据。
