# APP 层证据与验收

## 证据来源

| 证据 | 用途 |
| --- | --- |
| `commands/mcu-new.js` | 判断插件生成器实际提供的 APP 骨架和 CMake 输入 |
| `docs/plugin-boundaries.md` | 判断 APP 的允许依赖和禁止越层调用 |
| `skills/workflow/app-architecture/SKILL.md` | 判断 Manager、Task、Logic、UI、Profile 的职责 |
| `archive/software-legacy/workflow/project-integration/SKILL.md` | 作为历史 GR5526 集成规则，必须结合当前边界复核 |
| 用户提供的 GR5526 LVGL 工程 | 验证真实启动链和 UI 任务，不作为通用 API 来源 |

## 结构判定

### 生成器基线

由 `mcu-new` 创建的新项目至少应有：

```text
App/main.c
BSP/
System/
Core/
cmake/
CMakeLists.txt
```

这只是启动骨架。只有在项目实际存在并有调用证据时，才登记 `manager/`、`task/`、`logic/`、`ui/` 和 `profile/`。

### APP 组件职责

| 组件 | 允许职责 | 禁止内容 |
| --- | --- | --- |
| `main` | 初始化编排、启动 OS、进入主循环 | 具体器件协议、业务状态机 |
| `manager` | 应用状态、资源所有权、跨任务协调 | 直接使用 HAL、RTOS 原生类型 |
| `task` | 任务入口、队列消费、周期调度 | 绕过 Manager 直接修改全局业务状态 |
| `logic` | 业务规则、命令和状态转换 | 访问寄存器、设备 Port、厂商 Driver |
| `ui` | 页面、事件、显示状态绑定 | 在回调中实现设备控制流程 |
| `profile` | BLE、微信小程序或产品连接配置 | 把协议细节扩散到 Manager/UI |

## 验收清单

- [ ] 已从实际 `main` 还原初始化顺序和启动链。
- [ ] 每个 Manager/Task 都有状态、消息、资源所有权和错误处理说明。
- [ ] UI 事件先转为 Logic 命令，设备事件先转为 Manager 状态。
- [ ] APP 没有直接包含 Core、Driver、BSP Port、`hal_driver` 或 FreeRTOS 原生头文件。
- [ ] 需要设备能力时走 BSP Wrapper，需要系统能力时走 OS Wrapper。
- [ ] 业务代码与 LVGL、MQTT 等 Middleware 的公共 API 交接点已记录。
- [ ] 产物包含 APP 层图、启动链、依赖审计和未决风险，不覆盖其他 Agent 的运行记录。
