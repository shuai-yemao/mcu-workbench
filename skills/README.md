# Skills 导航

## Active 层级

| 层级 | 主职责 |
|---|---|
| `workflow` | 请求路由、工程集成和 AI 协作流程 |
| `app` | 嵌入式 APP 的 main、Manager、Task、Logic、UI、Profile |
| `service` | Service 业务层：service_system + 10 个业务服务（带业务策略，D10） |
| `platform` | Platform 能力接口（mcu/os/bsp/middleware）+ 公共定义（common），不绑芯片/RTOS；零实现门禁仅指技能目录（common 含对象模型实现） |
| `impl` | Impl 落地：OS Port、板级组合根、器件驱动、Handler 机制 |
| `vendor` | Vendor 底座登记：源码只登记映射不复制（D7） |
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
App → Service → Platform 接口 ← Impl → Vendor
```

App 只依赖 Service（D8 门禁）；Service 只依赖 Platform 接口；Platform 技能目录零实现（`platform_common` 对象模型实现除外）；Impl 落地实现；Vendor 只登记映射不复制。

旧 skill 目录已从 `archive/` 移除；旧调用名经 catalog 的 `resolveSkillId()` 兼容解析到当前 active skill。
