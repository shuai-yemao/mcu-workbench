# MCU-Workbench Skills 导航

## 命名规则

每个 skill 的目录名和 frontmatter `name` 必须相同，采用：

```text
<层级>-<领域>[-<具体对象>]
```

- 仅允许小写 ASCII 字母、数字和连字符，使用 2–4 个词。
- 第一段是稳定的路由前缀，不使用泛化的 `module`、`guide`、`helper` 或单词入口。
- 第二段描述专业领域；第三、四段只在消除歧义时使用。
- 一个 skill 只拥有一个主职责；跨层问题应由 `workflow-router` 分诊并交接，而不是扩张某一个 skill。

## 架构分类

| 层级 | 路径 | 数量 | 主职责 |
|---|---:|---:|---|
| 工作流 | `skills/workflow/` | 4 | 分诊、架构、移植、开发记录 |
| 平台 | `skills/platform/` | 10 | Cortex-M、MCU、STM32 HAL/SPL、存储布局 |
| 接口与外设 | `skills/interface/` | 17 | 总线、MCU 外设、通信协议 |
| BSP | `skills/bsp/` | 4 | 设备适配、Driver、服务、平台绑定 |
| RTOS | `skills/rtos/` | 1 | FreeRTOS |
| 中间件 | `skills/middleware/` | 5 | 文件系统、DSP、GUI、串行 Flash |
| 系统能力 | `skills/system/` | 3 | Bootloader、低功耗、看门狗 |
| 工程操作 | `skills/operations/` | 29 | 构建、烧录、调试、观测、质量、发布 |
| 安全 | `skills/security/` | 4 | 加密、校验、固件签名 |
| 硬件 | `skills/hardware/` | 2 | PCB 与仪器通信 |

## 按任务选择主 skill

| 任务 | 主 skill | 交接边界 |
|---|---|---|
| 不知道从哪里开始 | `workflow-router` | 只选择最小 skill 集合，不重复实现细节 |
| CubeMX、HAL、MCU 内置外设 | `platform-stm32-hal` | 外部器件协议交给 BSP |
| I2C/SPI/UART 问题 | `bus-i2c`、`bus-spi`、`bus-uart` | 设备协议交给 BSP Driver |
| 外部传感器、屏幕、Flash 的开源驱动适配 | `bsp-device-adaptation` | 协议状态机交给 `bsp-device-driver` |
| 单个器件的 API、状态、失败回滚 | `bsp-device-driver` | 多实例/线程交给 service |
| 多个器件、队列、线程、事件 | `bsp-device-service` | HAL/RTOS 绑定交给 adapter |
| 注入接口绑定到目标板 | `bsp-platform-adapter` | 不写设备业务协议 |
| Keil/IAR/CMake/ESP-IDF 构建 | 对应 `tool-build-*` | 烧录、调试单独选择 skill |
| 目标板烧录与在线调试 | `tool-flash-*`、`debug-*` | 日志/追踪使用 observability |
| Unity Mock、RTT/elog 测试输出 | `quality-unity-testing` | 不替代生产入口 |

## 命名统计与迁移

执行以下命令得到当前数量、架构层分布和名称前缀分布：

```powershell
npm run validate:plugin
node scripts/report-skills.js
```

完整的 79 项旧名到新名映射见 [../docs/skills-migration.md](../docs/skills-migration.md)。Claude Code 不支持 skill 别名，因此所有 `/mcu-workbench:<旧名>` 调用都应迁移到新名称；仓库内部的 Node catalog 查询仍能解析旧名以帮助过渡。

## 新增或修改 skill 的检查清单

1. 先确定其所属架构层；不能确定时先增强 `workflow-router`，不要新增泛化 skill。
2. 在 `skills/catalog.js` 登记 `id`、旧名（若迁移）、层级、描述和路径。
3. 新目录与 `name` 使用相同的规范化名称，写明适用场景、禁止事项和交接 skill。
4. 支撑内容放在 skill 自己的 `references/`、`scripts/` 或 `assets/`，并用相对路径引用。
5. 运行 `npm run validate:plugin` 与测试；不允许个人绝对路径、失效链接或 catalog/文件系统偏差。
