# Vendor 内容契约

## 目的

Vendor 是目标工程的能力底座，不是插件仓库的源码镜像。插件只提供版本选择、来源登记、目录约束、接入路由和验证规则；目标工程负责把选定内容完整复制到 `05_Vendor/` 并由自身 Git 管理。

## 内容分类

| 目录 | 内容策略 | 关键要求 |
|---|---|---|
| `vendor_mcu` | 完整保留 | STM32/AT32/ESP32 官方 SDK、生成工程、Startup/System、HAL/LL/CMSIS、`.ioc`、`sdkconfig`、Workbench 和工程文件不得被插件规则裁剪 |
| `vendor_rtos` | 完整保留 | 选定 FreeRTOS/RT-Thread 的内核、移植层、配置和许可证完整保留 |
| `vendor_middleware` | 按需保留 | LVGL、FatFs、FlashDB、FAL、通信栈、letter_shell 统一物理目录；只提交本工程真正使用的源码和移植内容 |
| `vendor_algorithm` | 按需保留 | Ring Buffer、FFT、DSP 等只提交实际使用的算法实现、配置和许可证 |
| `vendor_metadata` | 必须保留 | 来源、版本/commit、许可证、生成器/工具链版本、补丁、依赖、裁剪记录和编译单元 |

## 唯一依赖边界

```text
Service
  → Platform Middleware API
  → Impl Middleware Adapter
  → 05_Vendor/vendor_middleware/<selected-library>

Service
  → Platform Algorithm API
  → Impl Middleware Adapter
  → 05_Vendor/vendor_algorithm/<selected-library>

Platform/Impl MCU 或 OS 后端
  → 05_Vendor/vendor_mcu/<family>
  → 05_Vendor/vendor_rtos/
```

Service、App 和 Platform 公共头文件不得直接 include Vendor 头文件。`Impl` 是唯一允许绑定 Vendor 原生 API、句柄、配置和工具链类型的层；Platform 只暴露 Vendor-neutral 类型和接口。

## 生命周期与验证

- MCU/RTOS 完整底座的版本、生成器和配置必须可重现；
- 中间件/算法裁剪必须可追溯到编译单元和实际能力；
- 初始化、反初始化、内存所有权、阻塞/ISR、线程安全和 DMA/Cache 约束由 Impl 适配契约承接；
- 目录存在不等于已经接入，必须分别记录静态检查、主机测试、交叉编译、烧录、目标运行和观测证据；
- 插件校验只证明 Skill、目录契约和路由一致，不证明目标工程 Vendor 源码可编译或目标板可运行。
