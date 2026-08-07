# mcu-workbench CI/CD 部署计划

> 状态：待用户审查 | 日期：2026-08-07 | 分支基线：host_ai
> 目标仓库：https://github.com/shuai-yemao/mcu-workbench.git

---

## 1. 目标与边界

### 1.1 我们要解决什么

项目已经拥有完整的本地验证链（jest 185 测试 + 7 个校验脚本），但**验证结果只存在于开发者本地终端**。CI/CD 要做的第一件事，是把"绿"变成仓库里人人可见、机器强制的事实。

### 1.2 嵌入式插件 CI 的定位（关键认知）

本项目是嵌入式开发插件（Node.js），同时内含固件 C 模板与生成产物。它的 CI 与普通 Web 项目不同，必须对齐项目自身的**五级证据体系**：

| 证据等级 | 内容 | CI 能否覆盖 |
|---|---|---|
| V-01 静态 | 代码审查、结构检查 | ✅ CI 全自动 |
| V-02 语义 | 类型/契约一致性 | ✅ CI 全自动 |
| V-03 构建 | 编译、链接通过 | ✅ CI 全自动（含固件 C 语法检查） |
| V-04 目标运行 | 主机 mock / 仿真 | ⚠️ 部分（有 mock 则可跑，无板则跳过） |
| V-05/06 实物 | 真板烧录、硬件验证 | ❌ CI 不做（需硬件农场/HIL） |

**核心边界声明：CI 保证"能构建、测试绿、契约一致"，不保证"板子上能跑"。** 后者留给人工 + HIL。这条边界写清楚，才能防止 CI 被误当成硬件验证的替代品。

### 1.3 目标状态

- 每次 `push` / `PR` 自动触发流水线，10 分钟内出结果
- 三个 Job 覆盖：单元测试 / 插件契约校验 / 固件 C 语法检查
- 全绿 → 可合并、可发布；任一红 → 阻塞合并（branch protection 可选）

---

## 2. 现状盘点

### 2.1 已有资产（直接复用，零成本）

| 资产 | 命令 | 说明 |
|---|---|---|
| 单元测试 | `npm test` | jest，36 suites / 185 tests |
| 插件契约校验 | `npm run validate:plugin` | 108 skills / 7 agents / 13 层 |
| 文档链接校验 | `npm run validate:links` | 288 markdown 文件 |
| 版本一致性 | `npm run check:versions` | sync-plugin-versions --check |
| 能力迁移一致性 | `npm run migrate:capabilities` | materialize-skill-capabilities --check |
| 分层契约自检 | `npm run validate:layer` | validate-layer-contract --self-check |
| 架构校验 | `npm run validate:architecture` | validate-architecture.js |
| Codex 兼容产物 | `npm run build:codex-compat` | 生成 AGENTS.override.md |
| Claude 分层校验 | `npm run claude:validate` | claude-layering.js validate |
| Flash 算法档案 | `npm run validate:flash-algorithm` | 指定 profile JSON |

### 2.2 缺口（CI 要补的）

| 缺口 | 说明 |
|---|---|
| 无 `.github/workflows/` | 全部从零创建 |
| 无自动化触发器 | 验证靠手动跑 |
| 无固件 C 语法检查自动化 | 目前是手动 gcc -fsyntax-only（V-03） |
| 无 npm 依赖缓存 | CI 冷启动慢 |
| 无 PR 门禁 | 红的代码也能合入 |

### 2.3 前置风险：工作区未提交改动

`git status` 显示存在未提交的 skill 拆分迁移（`workflow-project-integration` → `workflow-review-gate` / `workflow-integration-plan`）。**阶段 0 必须先合入这批改动**，CI 建立在干净基线上，否则 CI 结果与本地状态不可比。

---

## 3. 流水线架构设计

### 3.1 技术选型：GitHub Actions

- 仓库已在 GitHub → 零额外成本、无自建服务器
- Ubuntu latest runner + Node 22（与本地 v22.22.2 一致）
- 嵌入式交叉编译暂不引入（插件本身不产出固件二进制；如后续有构建链再扩展 gcc-arm-none-eabi）

### 3.2 触发矩阵

| 事件 | 行为 |
|---|---|
| `push` 到 `host_ai` | 全量流水线 |
| `pull_request`（含 fork PR） | 全量流水线 |
| `workflow_dispatch` | 手动重跑（排障用） |
| `tag v*` | 触发发布 Job（阶段 3，CD） |

### 3.3 Job 设计（三个并行 Job）

```
push / PR
   │
   ├── [job] test ─────────── npm ci → npx jest --ci
   │
   ├── [job] validate ─────── npm ci → 契约/链接/版本/生成物一致性
   │
   └── [job] firmware-syntax ─ apt gcc → 固件 C 语法检查（-fsyntax-only）
```

**Job 1 `test`（最快、最核心）**
```yaml
- uses: actions/setup-node@v4
  with: { node-version: 22, cache: npm }
- run: npm ci
- run: npx jest --ci --reporters=default
```

**Job 2 `validate`（插件契约门禁，防"文档漂移"）**
```yaml
- run: npm run validate:plugin
- run: npm run validate:links
- run: npm run check:versions
- run: npm run migrate:capabilities
- run: npm run validate:layer
- run: npm run claude:validate
- run: npm run build:codex-compat && git diff --exit-code   # 生成物必须与提交一致
```

关键点：`build:codex-compat` 后必须 `git diff --exit-code`——**如果运行后工作区有差异，说明 AGENTS.override.md 没随源头同步，CI 直接红**。这正是防止"只改源头忘了重生成"的机制。

**Job 3 `firmware-syntax`（嵌入式特色，V-03 自动化）**
```yaml
- run: sudo apt-get update && sudo apt-get install -y gcc
- run: find templates test-project integration-test -name '*.c' -o -name '*.h' \
       | xargs gcc -Wall -Wextra -fsyntax-only -I templates 2>&1
```

注意：只做**语法/编译级**检查，不做链接（固件链接需要芯片 linker script，属 V-04+）。这正是 1.2 边界声明的落地。

### 3.4 排障友好设计（核心诉求：不懂 CI/CD 也能排查）

**设计原则：排障靠"复现"，不靠"理解机制"。** CI 的每一步都与本地一条命令一一对应——CI 红了，本地跑同一条命令必然红，修复本地再 push 就变绿。用户不需要理解 runner / YAML / 上下文，只需要记住三步口诀：**看红 step → 本地跑同命令 → 修复后 push**。

| CI step（中文名） | 本地复现命令 | 失败含义 |
|---|---|---|
| 单元测试（jest） | `npm test` | 某个测试挂了，看测试名 |
| 插件契约校验 | `npm run validate:plugin` | skills/agents/分层不一致 |
| 文档链接校验 | `npm run validate:links` | markdown 链接断裂 |
| 版本一致性 | `npm run check:versions` | 版本号不同步 |
| 能力迁移检查 | `npm run migrate:capabilities` | 能力迁移未回填 |
| 分层契约自检 | `npm run validate:layer` | 分层越界 |
| Codex 产物一致性 | `npm run build:codex-compat` + `git diff` | 生成物未随源头同步 |
| 固件 C 语法检查 | 对应 gcc -fsyntax-only 命令 | C 代码语法错误 |

配套机制：
1. **每个 step 用中文 `name:`** —— 失败时 GitHub Actions 会把该 step 红色高亮，日志第一行就是"哪个 step、什么含义"
2. **所有 step 只调用 package.json scripts**，禁止在 YAML 里写一次性命令（除 apt 安装）——保证本地 100% 可复现
3. **npm ci 锁定依赖**——CI 环境与本地依赖一致，排除"我本地能跑"类问题
4. **进阶可选**：安装 `act` 可在本地完整仿真 workflow，不 push 也能复现 CI 行为

### 3.5 状态徽章

CI 全绿后，README 顶部加 badge：
```
[![CI](https://github.com/shuai-yemao/mcu-workbench/actions/workflows/ci.yml/badge.svg)](...)
```

---

## 4. 分阶段路线

| 阶段 | 内容 | 产出 | 耗时 |
|---|---|---|---|
| **0. 基线化** | 合入当前未提交拆分改动，确认本地全绿 | git 干净，185 tests 绿 | 1 次提交 |
| **1. MVP CI** | ci.yml：test + validate 两 Job，push/PR 触发 | 每次提交自动验证 | 0.5 天 |
| **2. 增强** | firmware-syntax Job、npm 缓存、README 徽章、jest 覆盖率（可选） | 三 Job 全绿 | 0.5 天 |
| **3. CD（可选）** | tag 触发：npm pack + GitHub Release 草稿；将来可扩展固件 .hex/.bin 产物存档 | 一键发布 | 1 天 |

建议：**先做 1+2 合一步**（一次提交落地 ci.yml + 三 Job），CD 视发布需求后置。

---

## 5. 新建/修改文件清单

| 文件 | 动作 | 说明 |
|---|---|---|
| `.github/workflows/ci.yml` | 新建 | 主流水线（test / validate / firmware-syntax） |
| `.github/workflows/release.yml` | 新建（阶段 3） | tag 触发发布 |
| `README.md` | 修改 | 加 CI badge（阶段 2） |
| `package.json` | 不改 | 已有脚本全部可复用 |
| `.gitignore` | 不改 | node_modules/ coverage/ 已覆盖 |

---

## 6. 决策点（D1–D5，待用户确认）

| 编号 | 决策 | 选项 | 建议 |
|---|---|---|---|
| D1 | 阶段 0 基线化时机 | 现在合入拆分改动 / 先出计划再合 | **现在**（CI 必须建在干净基线） |
| D2 | 触发范围 | 仅 push / push+PR | **push+PR**（单人项目成本几乎为零） |
| D3 | validate Job 范围 | 全部脚本 / 仅 validate:plugin+links | **全部**（脚本都很快） |
| D4 | 固件 C 语法检查 Job | 纳入 / 不纳入 | **纳入**（嵌入式特色，apt gcc 很便宜） |
| D5 | 阶段 3 CD | 现在设计 / 后置 | **后置**（先有稳定 CI 再谈发布） |

---

## 7. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 未提交拆分改动导致基线漂移 | CI 结果不可比 | 阶段 0 先合入 |
| npm ci 冷启动慢（3-5 分钟） | 流水线变慢 | setup-node 自带 cache: npm |
| 校验脚本顺序跑耗时 | Job 拉长 | 三个 Job 并行，互不阻塞 |
| GitHub Actions 免费额度耗尽 | 无法跑 | 单人项目 push+PR 足够；超出再优化触发 |
| CI 被误当成硬件验证 | 虚假安全感 | 边界声明写入 CI 注释与文档（1.2） |

---

## 8. 验收标准

1. `push` 到 `host_ai` 后自动触发，10 分钟内三 Job 全绿
2. 故意引入一个测试失败 → CI 红，阻止合并（branch protection 启用后）
3. `build:codex-compat` 生成物与提交不一致 → CI 红（防文档漂移）
4. 固件 C 代码引入语法错误 → firmware-syntax Job 红
5. README 显示 CI badge，绿色代表当前分支状态
