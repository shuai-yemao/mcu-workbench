# MCU-Workbench 插件架构设计与输入输出流程

> 版本：v2.1（收尾修订版） · 状态：已落地（提交 eb3f3c3 → 32de118）
> 本文档描述 **升级后** 插件的完整架构与 I/O 流程，作为权威总览；细则见
> `docs/architecture-overall-plan.md`（方案 v4.0）、`docs/plugin-execution-flow.md`（执行流）、`docs/adr/0001-0012`（决策记录）。

---

## 1. 架构总览：两套分层 + 双宿主入口

升级后的核心变化是 **两套分层体系并存**（ADR-0002）：

| 分层体系 | 作用对象 | 层 | 目的 |
|---|---|---|---|
| **软件架构分层** | 生成的嵌入式工程 | App → Service → Platform → Impl → Vendor | 定义生成代码的依赖铁律 |
| **插件分层** | skills/ 目录 | workflow / tools / hardware（横切） | 定义技能的组织与执行方式 |

**当前规模**：45 catalog / 43 canonical 技能，7 个 Agent，8 个技能层，174 条迁移映射（MIGRATION_MAP），全部旧调用名经映射自动兼容。

```
┌────────────────────────── 宿主层 ──────────────────────────┐
│  Claude Code (index.js)     OpenCode (opencode.mjs)        │
│  10 commands + skills 注册    动态注册 mcu_agent_*/          │
│  + CLI                       mcu_workbench_* 工具           │
└──────────────────────────┬──────────────────────────────────┘
                           │ 绑定（单一事实源）
┌──────────────────────────▼──────────────────────────────────┐
│  catalog-metadata.js → catalog.js（唯一目录）→ loader.js    │
│  → registry.js（查询视图）→ 各宿主按需加载                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼─────────── 技能层 ───────────────┐
│  workflow(5)  │  app(1)  │  service(11)  │  platform(5)    │
│  impl(4)      │  vendor(8)│  tools(9)    │  hardware(2)    │
└──────────────────────────┬──────────────────────────────────┘
                           │ 派生
┌──────────────────────────▼─────────── Agent 层 ─────────────┐
│  7 Agent（embedded-lead 协调 + 6 领域），技能集由领域自动派生│
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼─────────── 资源层 ───────────────┐
│  templates/  docs/  .mcu-workbench/（project.json + runs/） │
│  scripts/（22 脚本，含 7 校验）  .github/workflows/ci.yml    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 软件架构分层（五层契约，作用于生成工程）

依赖铁律：**上层只允许依赖相邻下层，禁止跨层与反向调用**。

| 层 | 目录 | 技能 | 定位与铁律 |
|---|---|---|---|
| **App** | skills/app/ | `app-architecture` | 产品业务流程（main/Manager/Task/Logic/UI/Profile）。**只调 Service，不碰 HAL/Impl/Vendor**（D8 门禁，validator 强制） |
| **Service** | skills/service/ | 11 个 `service_*`（system/battery/backlight/calendar/diagnosis/log/ota/power/sensor/storage/watchdog） | App 常见业务抽象，带 `_model/_state/_fault_code` 三件套（D10） |
| **Platform** | skills/platform/ | `platform_common` / `platform_mcu` / `platform_os` / `platform_bsp` / `platform_middleware` | 能力接口与公共定义：统一接口/错误码/类型/对象/ops 函数指针/ctx。错误码基线在 `platform_common/platform_error.h`（D4）。**零 .c 门禁仅约束技能目录**；`platform_common` 含对象模型实现（允许 `.c`） |
| **Impl** | skills/impl/ | `impl_os` / `impl_board` / `impl_bsp` / `impl_bsp_handler` | Platform→Vendor 适配落地。handler 是**机制层**（多实例/生命周期/缓存/重试，D5），策略归 Service |
| **Vendor** | skills/vendor/ | `vendor_stm32` + 7 中间件（lvgl/stack/fatfs/fal/flashdb/letter_shell/dsp） | 厂家/第三方底座（STM32 HAL、CMSIS、FreeRTOS、LVGL…）。**只登记不复制**（D7，vendor_mapping.md 管理，patch/ 存补丁） |

**三层联动范式**：App 发业务请求 → Service 编排能力 → Platform 定义接口 → Impl 落地适配 → Vendor 提供底座。

**已生效的门禁**（`scripts/validators/skill-catalog.js`）：
- Platform 层目录禁止 `.c/.cpp` 文件；
- App 层文档剥离反引号/链接/禁止类描述后，禁出现 `HAL_*` / `xTask*` / `impl_*` / `vendor_*` 符号。

---

## 3. 插件分层（workflow / tools / hardware，横切）

| 层 | 数量 | 技能 | 职责 |
|---|---|---|---|
| workflow | 5 | `workflow-requirements-router`、`workflow-review-gate`、`workflow-integration-plan`、`workflow-final-review`、`workflow-claude-layering` | **门禁与流程编排**（见第 6 节主链路） |
| tools | 9 | build / flash / linker / debug / observability / quality / git / release / learning-tutor | 工具链生命周期（构建→烧录→调试→观测→质量→发布） |
| hardware | 2 | `hardware-pcb-analysis`、`hardware-visa-debug` | 板级集成（原理图/PCB 分析、仪器调试） |

> 拆分说明：原 `workflow-project-integration` 已按 **门禁边界** 拆为 `workflow-review-gate`（审查门禁）与 `workflow-integration-plan`（集成规划分发）（提交 348bdeb，ADR 对应设计见 `docs/design-split-project-integration.md`）。

---

## 4. 单一事实源与绑定机制

```
catalog-metadata.js（定义：CANONICAL/SERVICE/VENDOR/TOOL 四组定义 + 别名）
        ↓
catalog.js（唯一目录：45 catalog / 43 canonical + legacy 别名；MIGRATION_MAP 174 条）
        ↓
loader.js（按磁盘加载 SKILL.md）→ registry.js（查询视图：分类/平台过滤）
        ↓
index.js（Claude Code：skills.registry/loaded/getContent/list）│
opencode.mjs（OpenCode：动态注册 mcu_workbench_<id> 工具）    │
lib/agent-domains.js（DOMAINS → domainSkills() → agent 技能集）
```

**关键设计**：
- **Agent 技能集自动派生**：`agents/*.md` 只声明稳定身份（name/domain/scope），不含技能清单；技能集由 `lib/agent-domains.js` 的 `DOMAINS`（layers + extraSkills + keywords）从 catalog 动态派生（`domainSkills()`）。新增技能 → catalog 更新 → agent 自动获得，零改动。
- **版本缓存**：`opencode.mjs` 的 `loadAgents()` 按 `PLUGIN_VERSION` 缓存，插件升级即失效重载。
- **迁移兼容**：`resolveSkillId()` 经 MIGRATION_MAP（174 条）+ TOOL_ALIASES + CANONICAL_ALIASES 归一，旧名（mcu-platform、middleware-lvgl、core-mcu 等）自动解析到新 id。

**路由打分**（`rankAgentsForRequest`，OpenCode 与 Router 共用）：请求分词 → 领域关键词精确命中 +3、包含命中 +1 → 降序选 agent；`embedded-lead` 恒为协调者，`system-architect` 兜底参与。

---

## 5. 双宿主入口与四种使用方式

| 宿主 | 入口 | 能力暴露 |
|---|---|---|
| Claude Code | `package.json` exports require → `index.js` | skills 注册 + init |
| OpenCode | import → `opencode.mjs` | 动态注册 `mcu_agent_*`（7 个）+ `mcu_workbench_*`（技能工具）+ 路由/团队工具 |
| Codex | `codex/AGENTS.md`（由 `build-codex-compat.js` 生成 `AGENTS.override.md`） | `@mcu-workbench` 指令 |
| 脚本/API | `scripts/claude-layer-api.js` + `lib/` Programmatic API | 分层扫描/校验等确定性入口(原 Node CLI 已移除,2026-08-08) |

> **设计原则**：交互统一走 Skill(门禁驱动)与 lib API;Node CLI 已移除(ADR H13 同模式)——消除双入口与 stdout 解析不稳定,门禁不被绕过。

---

## 6. 输入输出流程：四门禁 Skills 主链路

**输入**：用户自然语言需求（含项目路径、MCU/板卡、工具链等）。
**输出**：可交付代码 + 结构化文档 + 证据档案。

```
 用户请求
   │
   ▼
① workflow-requirements-router（Router，首个入口）
   ├─ 编排 Agent 分析（embedded-lead 协调，最多 2 个领域 agent 并行）
   ├─ 补证：缺失信息【必须交互提问】一次一问，回答回填标记 user-confirmed
   ├─ 证据探测：项目根目录只列候选，不把文件名当已确认约束
   └─ 产出：RCP（需求约束包，11 约束域 + 四态可信等级 + 路由单）
        ⚠ 硬规则：RCP 完成前不得生成实现代码
   ▼
② workflow-review-gate（代码前审查门禁，RCP 唯一接收方）
   ├─ 反猜测审查（假 API / CubeMX 假配置 / 假构建命令 / 主机测试冒充目标验证）
   ├─ 必选产出四张清单：工程现状 / 文件施工 / 代码生成约束 / 验收测试
   │    （保留在审查包内，作为实现层施工边界与 final-review 验收依据）
   ├─ 重组三份产品文档 → docs/requirements/<req_id>-BRD.md / -PRD.md / -SRSys.md（给用户审查）
   └─ 门禁判定：存在 inferred/unverified 事实 或 未关闭阻塞项 → 【阻塞】回退补证
   ▼ （放行）
③ workflow-integration-plan（集成规划与分发）
   ├─ 分层审计（现状 → 目标五层）
   ├─ 迁移路线 + 文件级改造顺序
   └─ 分发：只分发 1 个实现层 Skill；执行 agent 执行中按需自行查阅其他领域知识
        （不预分配参考清单、不设数量上限）
   ▼
④ 实现层 Skill（platform_* / impl_* / service_* / vendor_* / app-architecture / tools-*）
   └─ 按分层契约施工，产出代码
   ▼
⑤ workflow-final-review（输出前最后一层门禁）
   ├─ 对最终代码/补丁/git diff 独立审查
   ├─ 按 tools-quality 的 profile 输出结构化审查报告（分级发现 + 结论）
   └─ 默认不生成实现、不自动修复
   ▼
 交付：代码 + RCP + 审查包 + BRD/PRD/SRSys + final-review 报告
        Agent handoff（七段契约：Summary/Evidence/Changed files/Tests/Artifacts/Blockers/Next）
        → scripts/agent-artifacts.js 归档 .mcu-workbench/runs/*.json
        → knowledge-engineer 沉淀 docs/devlog/、docs/notes/
```

**门禁汇总**：

| 门禁 | 位置 | 规则 |
|---|---|---|
| G0 需求门禁 | Router | RCP 完成前不得生成代码；补证必须交互提问 |
| G1 审查门禁 | review-gate | inferred/unverified 或未关阻塞 → 不得进入代码阶段 |
| G2 分发门禁 | integration-plan | 只分发 1 个实现层 Skill，不预分配参考 |
| G3 输出门禁 | final-review | 交付前独立审查，结构化报告 + 分级结论 |

---

## 7. 三条 I/O 链路对比

| 链路 | 入口 | 特点 | 典型用途 |
|---|---|---|---|
| **Skills 主链路** | 需求 → Router | 四门禁全走，证据驱动 | 需要交付物与文档的完整需求 |
| **Agent 路由链** | `mcu_workbench_agent_route` | 关键词打分（精确+3/包含+1）直接选 agent | 快速咨询某领域问题 |
| **脚本/API 链** | `scripts/claude-layer-api.js` / `lib/` | 确定性执行(原 Node CLI 已移除) | 分层扫描/校验、CI 校验、harness 编排 |

---

## 8. 质量保障体系

- **五级证据**（验收测试清单）：静态 → 主机（mock/fake）→ 构建（gcc -fsyntax-only）→ 目标运行 → 实物；CI 覆盖前三级（V-01~V-03），V-04 部分，V-05/06 实物不做（边界写入文档）。
- **CI/CD**（`.github/workflows/ci.yml`，提交 91cd2da + 1ff7331）：三 Job 并行——test（jest 串行 34 suites/186 tests）/ validate（validate:plugin 43/7/8 + validate:links + check:versions + validate:layer + build:codex-compat && git diff --exit-code）/ firmware-syntax（gcc -fsyntax-only 查模板）。**排障原则：CI 每个 step 与本地命令一一映射，CI 红 → 本地同命令必红**。
- **校验脚本**：`npm run validate:plugin`、`validate:links`、`validate:layer`、`check:versions`、`build:codex-compat`。

---

## 9. 升级历程（六阶段，全部已提交推送）

| 阶段 | 提交 | 内容 |
|---|---|---|
| 0 定稿 | — | v4.0 方案批准 + ADR-0001~0012 |
| 1 Vendor 归位 | `eb3f3c3` | mcu-platform→vendor_stm32，7 中间件→vendor_*，vendor_mapping.md（只登记不复制） |
| 2 Platform 契约化 | `0fe08b7` | core-mcu/os-adapter/bsp-wrapper→platform_*，零 .c 门禁 |
| 3 Impl 落地 | `234fd1d` | os-runtime/bsp-port/bsp-hal-driver/bsp-handler→impl_*（handler 独立技能） |
| 4 Service 组合 | `8583600` | software-system→service_system + 新增 10 个 service_* |
| 5 App 收敛 | `501e544` | app-architecture 只调 Service + App 依赖门禁（D8） |
| 6 命名重构 | `482bcac`→`32de118` | 生成代码对齐五层命名（platform_*/impl_*、guard XXX_H、编号目录树）；架构契约只增不删增补新目录；claude-layer 收敛 + category→layer；空壳清理；naming-convention v1.2 |

---

## 10. 快速参考

- 技能目录事实源：`skills/catalog.js` + `skills/catalog-metadata.js`
- Agent 名册与派生：`lib/agent-domains.js`（AGENT_ROSTER / DOMAINS / domainSkills / rankAgentsForRequest）
- OpenCode 工具暴露：`opencode.mjs`；Claude Code：`index.js`
- 门禁校验：`scripts/validators/skill-catalog.js`（Platform 零 .c、App 依赖）
- 流程细则：`docs/plugin-execution-flow.md`；方案：`docs/architecture-overall-plan.md`；决策：`docs/adr/0001-0012`
