# Skills 导航

## Active 层级

| 层级 | 主职责 |
|---|---|
| `workflow` | 请求路由、工程集成和 APP 架构 |
| `rtos` | OSAL、OS Wrapper、OS Port、FreeRTOS |
| `bsp` | BSP Wrapper、BSP Port、hal_driver、Handler |
| `platform` | MCU Core 与厂商 Driver |
| `middleware` | LVGL、通信、存储、算法 |
| `system` | Bootloader、低功耗、看门狗、安全 |
| `hardware` | PCB、仪器和硬件分析 |
| `tools` | 构建、烧录、链接、调试、观测、质量、发布 |

## 工具主入口

```text
tools-build          构建
tools-flash          烧录
tools-linker         链接与内存
tools-debug          调试与故障诊断
tools-observability  日志与运行时观测
tools-quality        质量与验证
tools-release        发布与 OTA
tools-learning-tutor 项目提问与 Obsidian 学习笔记
```

每个工具主入口只保留用途和选择流程；具体平台资料放在 `references/<旧入口>/GUIDE.md`，脚本放在同一命名空间下。

## 软件调用链

```text
APP
├─ OS Wrapper → OS Port → FreeRTOS/其他 OS
├─ BSP Wrapper → BSP Port → hal_driver
└─ Middleware API

hal_driver → Core → Driver
```

Core、Middleware、Driver 不创建 Adapter。

## 归档

`archive/software-legacy/` 和 `archive/tools-legacy/` 不属于 active manifest，只保留原始内容和兼容迁移依据。
