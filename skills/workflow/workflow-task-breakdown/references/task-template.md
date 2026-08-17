# 实施任务清单（task.md）

> 本文件由 `workflow-task-breakdown` 根据已审查通过的 `spec.md` 和 `plan.md` 生成。
> `spec.md` 定义需求与约束，`plan.md` 定义选定并审查通过的实施路线，本文件只定义可执行任务，不新增范围。

## 1. 元数据

| 字段 | 内容 |
|---|---|
| request_id | `<REQ-...>` |
| 任务清单版本 | `<v0.1>` |
| 状态 | `draft` / `可交付` / `阻塞` / `执行中` / `完成` |
| 项目路径与提交 | `<absolute path @ branch/commit>` |
| 输入 spec.md | `<absolute path>` |
| 输入 plan.md | `<absolute path>` |
| 生成时间 | `<YYYY-MM-DDTHH:mm:ss+08:00>` |
| 阶段级 Agent/Skill 基线 | `<plan.md 第 8A 节或对应证据>` |
| 下游执行 Skill | `workflow-task-execution` |

可信等级：`confirmed`、`user-confirmed`、`inferred`、`unverified`。影响任务顺序、范围或验收的 `inferred`/`unverified` 项必须标记阻塞。

## 2. 总体任务图

```text
<T-001> → <T-002> → <T-003>
              ├→ <T-004>
              └→ <T-005>
```

- 总体目标：`<plain-language goal>`
- 非目标：`<out-of-scope>`
- 关键串行链：`<T-001 → T-002 → ...>`
- 可并行任务组：`<group definitions or none>`
- 不可并行原因：`<shared files/resources or none>`

## 3. 任务索引

| 顺序 | task_id | 任务名称 | 前置任务 | 并行组 | 主 Agent | 主实现 Skill | 辅助 Skill | 验证等级 | 状态 |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | T-001 | `<one-line result>` | `none` | `none` | `<canonical agent>` | `<canonical skill>` | `<skills or none>` | `<level>` | `ready/blocked` |

## 4. 任务详情

### T-001：`<one-line result>`

| 字段 | 内容 |
|---|---|
| order | `<topological order>` |
| parallel_group | `<group or none>` |
| source_plan_ids | `<plan IDs>` |
| source_spec_ids | `<spec/checklist IDs>` |
| owner_agent | `<canonical primary agent>` |
| support_agents | `<canonical agents or none>` |
| owner_skill | `<canonical primary implementation Skill>` |
| supporting_skills | `<canonical supporting Skills or none>` |
| allocation_evidence | `<plan/spec/project evidence and reason>` |
| confidence | `<level>` |
| status | `ready/blocked/not-run/pass/fail` |

#### 目标

`<single observable outcome>`

#### 范围

- 包含：`<files, symbols, behavior>`
- 不包含：`<explicit exclusions>`
- 文件范围：`<relative paths>`
- 所属层：`<App/Service/Platform/Impl/Vendor or internal role>`

#### 前置条件与依赖

- 前置任务：`<task IDs>`
- 外部前提：`<confirmed configuration/resource>`
- 依赖证据：`<source paths or commands>`

#### 执行步骤

1. `<ordered action>`
2. `<ordered action>`
3. `<ordered action>`

#### 输出物

- 文件：`<paths>`
- 符号/接口：`<symbols>`
- 中间产物：`<artifacts>`

#### 约束边界

- 接口和依赖：`<allowed/forbidden>`
- 资源与生命周期：`<ownership/init/release>`
- 并发、ISR、DMA：`<constraints>`
- 内存和生成边界：`<constraints>`

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `static/host/build/target/physical` |
| 命令或条件 | `<absolute cwd + command or hardware condition>` |
| 预期结果 | `<observable pass condition>` |
| 产物位置 | `<absolute artifact path>` |
| 当前状态 | `not-run/pass/fail/blocked` |

#### 失败处理与回滚

- 失败现象：`<symptom>`
- 定位顺序：`<diagnosis sequence>`
- 重试/降级：`<bounded behavior>`
- 回滚：`<reversible action>`
- 回传条件：`<when to stop and return upstream>`

## 5. 任务级验收汇总

| task_id | 验收项 | 证据等级 | 命令/条件 | 预期结果 | 产物 | 状态 |
|---|---|---|---|---|---|---|
| T-001 | `<criterion>` | `<level>` | `<command/condition>` | `<pass condition>` | `<artifact>` | `not-run/pass/fail/blocked` |

静态、主机、构建、目标运行和实物证据必须分开记录，较低等级证据不能替代较高等级结论。

## 6. 阻塞与未验证项

| ID | 类型 | 内容 | 影响任务 | 证据/补证动作 | 状态 |
|---|---|---|---|---|---|
| B-01 | `阻塞/未验证` | `<item>` | `<task IDs>` | `<evidence or next action>` | `open/closed` |

## 7. 下游交接

- 需求/约束输入：`<absolute path>/spec.md`
- 实施路线输入：`<absolute path>/plan.md`
- 任务清单：`<absolute path>/task.md`
- 阶段级 Agent/Skill 基线：`<plan.md 第 8A 节>`
- 任务级分配：`<每项任务的 owner_agent/support_agents/owner_skill/supporting_skills>`
- 执行规则：`<依赖顺序、并行组和禁止跳过的前置任务>`
- 代码完成后：交接 `workflow-final-review`
- 新事实回传：`<workflow-integration-plan or workflow-review-gate>`
