# embedded_framework

嵌入式分层软件框架（STM32 / RISC-V 通用），基于 MCU-Workbench 五层契约组织工程。

## 目录结构

```text
00_Config     全局配置与裁剪开关
00_Docs       设计与课程文档
01_App        应用层（App 初始化、系统流程）
02_Service    业务服务层（电池、系统服务等）
03_Platform   平台公共层（类型、错误码、对象模型、设备/服务基类）
04_Impl       实现层（板级、BSP、MCU、中间件、OS 适配）
05_Vendor     第三方代码
06_Toolchain  工具链脚本
99_Utils      通用工具
cmake         交叉编译工具链（arm-none-eabi / riscv-none-elf）
```

## 依赖方向

```text
04_Impl/impl_board  ──>  03_Platform/platform_common  ──>  02_Service / 01_App
```

## 当前进度

- Platform 层对象模型：`platform_object_t` / `platform_device_t` / `platform_service_t`
- 生命周期统一管理：`platform_lifecycle_ops_t`（init/start/process/stop/deinit）
- Manager 管理层（第 7 课）：`platform_manager` 通用基类 + `platform_device_manager` / `platform_service_manager` 特化 + `platform_board_manager` 编排 `board → device → service → app` 主线
- 类型与错误码出口：`platform_type.h` / `platform_error.h`
- 平台日志与诊断可观测性（第 8 课）：
  - 统一日志抽象 `platform_log.h`（模块 tag + 6 级级别 + `PLATFORM_LOG_LEVEL` 编译裁剪），Impl 层桥接 EasyLogger + SEGGER RTT
  - 版本与构建信息 `platform_version.h/.c`（版本号、工程名、编译日期/时间、Git Hash 预留注入点）+ 启动 banner
  - 初始化主线骨架 `app_init.h/.c`：`plat_boot_init → plat_board_init → plat_service_init → plat_app_init` 四阶段组合根
  - 诊断预留：`platform_assert` 统一出口（可注入 hook，产品路径死循环）、`platform_reset_reason`（STM32F4 RCC_CSR 直读）、`platform_hardfault` 框架（SCB 现场直读 + dump + 停机）
