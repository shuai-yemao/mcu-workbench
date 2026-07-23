# LVGL 版本兼容矩阵

## 选择规则

先从 `lv_version.h`、包管理文件或构建日志确定版本，再选择一行。版本未确认时只能分析，不能生成 API 代码。

| 工程/来源 | 版本 | API 代际 | 主要用途 |
| --- | --- | --- | --- |
| GR5526 LVGL GPU Demo | 8.3.x | v8 | 维护现有 Keil 工程 |
| 100ask 文档快照 | 9.3.0-dev | v9 | 中文学习、组件和移植参考 |
| 官方 `master` | 9.6.0-dev | v9 | 最新源码、配置和模块结构 |

## 典型 API 迁移

以下是常见方向，不是跨版本混用许可；生成代码前应以目标版本头文件和 API map 复核。

| v8 典型名称 | v9 典型名称 | 影响 |
| --- | --- | --- |
| `lv_disp_drv_t` | `lv_display_t` | 显示对象和驱动注册模型 |
| `lv_disp_flush_ready` | `lv_display_flush_ready` | Flush 完成通知 |
| `lv_scr_act` | `lv_screen_active` | 活动屏幕获取 |
| `lv_btn_create` | `lv_button_create` | Button 控件创建 |
| `lv_disp_draw_buf_t` | `lv_draw_buf_t` / Display Buffer API | 绘制缓冲类型和设置方式 |

## 版本防错

- 不在同一工程中混用 `lv_disp_*` 和 `lv_display_*` 接口。
- 不因为函数名相似就假设结构体布局、回调签名或 Flush 时序相同。
- 迁移报告必须列出旧 API、新 API、调用文件、编译结果和未确认项。
- GR5526 验收以 LVGL 8.3.x 为准；100ask 和上游文档不能直接覆盖旧工程。
