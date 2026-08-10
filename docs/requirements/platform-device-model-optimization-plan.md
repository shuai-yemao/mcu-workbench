# Platform 设备模型优化计划（吸收 watch_device.h 实例）

> 版本：v1.0（2026-08-10）| 状态：**待用户确认**
> 触发：对实例文件 `watch_device.h`（EC-S100 手表设备模型，4 设备聚合）与插件 skills 对比，发现 1 个契约缺口 + 3 个可提炼模式。
> 依据：四元组模板 v1（object-four-tuple-template.md）、platform_bsp 输出契约（SKILL.md）、ADR-001（四子域/P 系列）。

## 1. 背景与动机

| 发现 | 性质 |
|---|---|
| 插件 platform_bsp 输出契约**只有 wrapper**，无"设备模型头"产出物——模型（长什么样）与转发（怎么落地）未分离 | **缺口**（建议 1） |
| 四元组模板写 `ctx/data = 指针`，实例用**内联值**；内联与 device"继承式内联扩展"哲学一致 | **模板需修正**（建议 3） |
| 实例 ops 首参具体类型 vs 模板 `pf_*` 首参 `void*`——两层 ops 未区分 | **约定需澄清**（建议 4） |
| 实例通用/厂商双 typedef（`motion_cfg_t`↔`imu_data_t`）、四件套命名规整 | **可吸收**（建议 2、5） |

## 2. 目标

1. platform_bsp 输出契约支持**模型先行**：`platform_<type>_model.h`（类型契约）→ `platform_<type>_wrapper.h`（转发实现）→ 注册。
2. 四元组模板布局规则修正为：**cfg/ops = const 指针（共享）、ctx/data = 内联值（独有）**——判断句"共享的用指针，独有的用内联"。
3. 明确**两层 ops 签名**：模型 ops（具体设备指针，Service 类型安全调用）vs 转发表 `pf_*`（`void*`，Impl 注册）。
4. 吸收可选约定：通用/厂商双名、四件套命名模式显式化。

## 3. 非目标（YAGNI）

- **不做聚合头**：watch_device.h 的"一文件 4 设备"聚合形态仅作课程样例，不进生成契约（单设备独立演进）。
- **不新增技能**：不改 catalog / 技能数量断言（纯文档内容增强）。
- **不引入运行期 ops 注册**：延续符号实现/链接期注入（尊重已验证现状）。

## 4. 分阶段执行

| 阶段 | 目标 | 主要动作 | 验证 |
|---|---|---|---|
| **0** | 定稿 | 本计划审查通过；新增 ADR（设备模型头 + 布局规则） | 用户确认 |
| **1** | 模板修正 | `object-four-tuple-template.md` v2：①布局规则表修正（共享指针/独有内联）②新增"两层 ops 签名"小节 ③新增"通用类型+型号别名"可选约定 ④四件套命名模式显式化 ⑤设备对象模板示例更新（ctx/data 内联） | validate:links + 相关测试 |
| **2** | model 头契约 | `platform_bsp/SKILL.md`：①新增"设备模型头"产出物（`platform_<type>_model.h`：四件套类型 + 设备 struct，芯片无关）②生成流程改"模型头 → wrapper → 注册"③输出契约表更新 ④四元组判定标准同步引用 | validate:links / plugin + 测试 |
| **3** | 样例与命名 | ①新增 `platform_bsp/references/device-model-example.md`（对齐后的设备模型头样例，吸收 watch_device.h 形态）②naming-convention / 模板补 guard 反例（`__XXX_H__` 双下划线禁用） | validate:links |
| **4** | 回归+提交 | 全量 `npm test` + `validate:links` + `validate:plugin`；git commit + push | 全绿 |

## 5. 影响面

| 对象 | 动作 |
|---|---|
| `skills/platform/platform_common/references/object-four-tuple-template.md` | 核心修改（v2） |
| `skills/platform/platform_bsp/SKILL.md` | 核心修改（model 头契约） |
| `skills/platform/platform_common/SKILL.md` | 判定标准/引用同步（视需要） |
| `docs/adr/0013-device-model-and-tuple-layout.md` | 新增 ADR |
| `skills/platform/platform_bsp/references/device-model-example.md` | 新增样例 |
| 测试 | embedded-architecture-skills.test.js 文档一致性断言需核对；catalog/技能数量断言**不动** |

## 6. 风险与缓解

| 风险 | 缓解 |
|---|---|
| embedded-architecture-skills.test.js 断言模板/技能特定文本 → 改后测试失败 | 阶段 1/2 改前跑基线，改后立即跑该套件 |
| validate:links 要求新增 md 被引用 | 新增 reference 必须在 SKILL.md 中显式链接（引用即收录） |
| 模板改动影响既有生成代码惯例 | 布局规则修正为"模板 v2"，兼容性说明（旧指针形态可继续，新生成用内联） |

## 7. 验收标准

1. platform_bsp SKILL 能指导生成 `platform_<type>_model.h`（四件套 + 设备 struct，零芯片依赖）；
2. 四元组模板明确"共享指针/独有内联"判断规则，示例与之一致；
3. 两层 ops 约定可区分（模型 ops 具体类型 / 转发表 pf_* void*）；
4. 新 reference 被链接、validate:links/plugin 通过、全量测试全绿；
5. 技能数量与 catalog 不变（46 skills）。
