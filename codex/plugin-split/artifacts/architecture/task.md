# MCU Workbench Architecture 插件拆分任务

> 本 Task 对应用户批准的 Spec v0.8 和 Plan `v0.1-architecture-plugin-owned-sources`。任务按依赖串行执行；每项先建立能证明现状缺失的测试/检查，再实现、复核并记录证据。

## 1. 元数据

| 字段 | 内容 |
|---|---|
| request_id | `REQ-PLUGIN-SPLIT-20261123` |
| 任务清单版本 | `v0.1-architecture-plugin-owned-sources` |
| 状态 | `完成（I/O 中途故障注入仍未验证）` |
| 项目路径与提交 | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai @ host_ai/6cd4fadc93ddaff5b03efbf7b32fa6a72b97883b` |
| 输入 spec.md | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\spec.md` |
| 输入 plan.md | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\plan.md` |
| Spec 力度 | `full` |
| 风险叠加门禁 | `versioned` |
| 生成时间 | `2026-11-24T16:14:04+08:00` |
| 阶段级 Agent/Skill 基线 | `plan.md` 第 8A 节 |
| 下游执行 Skill | `workflow-task-execution` |

可信等级：`confirmed`、`user-confirmed`、`inferred`、`unverified`。开始每个任务前重新检查 git status；`tools-quality`、`tools-verification`、academics、verification 插件及其他非本 Task 目录中的预存未提交改动均为保留对象。

## 2. 总体任务图

```text
T-001 → T-002 → T-003 → T-004 → T-005 → T-006 → T-007 → T-008
```

- 总体目标：建立独立 `mcu-workbench-architecture` 插件，以插件目录持有唯一 canonical source，并保留受保护的根聚合兼容投影。
- 非目标：迁移 workflow/verification/devops/observability/hardware/unknown 内容；修改迁移 Skills 语义或固件源码；执行目标板构建、烧录或实物测试。
- 关键串行链：T-001 → T-002 → T-003 → T-004 → T-005 → T-006 → T-007 → T-008。
- 可并行任务组：none。source、shared-reference closure、projection marker、catalog 和根入口相互依赖，须串行防止覆盖。
- 唯一主实现 Skill 按 Task 指定；辅助 Skill/Agent 只能给审查或验证意见，不并行改同一代码。

## 3. 任务索引

| 顺序 | task_id | 任务名称 | 前置任务 | 主 Agent | 主实现 Skill | 辅助 Skill | 验证等级 | 初始状态 |
|---:|---|---|---|---|---|---|---|---|
| 1 | T-001 | 固化工作区基线并添加缺失行为测试 | none | embedded-lead | tools-verification | tools-quality | static/host | pass |
| 2 | T-002 | 创建独立插件契约与包级 validator | T-001 | embedded-lead | tools-build | tools-verification | static/host | pass |
| 3 | T-003 | 将 31 项 canonical 与 8 项外部 Skill 纳入插件源 | T-002 | embedded-lead | tools-git | tools-quality | static/host | pass |
| 4 | T-004 | 生成 shared reference closure 并修复包内链接 | T-003 | embedded-lead | tools-build | tools-verification | static/host | pass |
| 5 | T-005 | 实现安全的旧根目录投影、adoption 与 rollback | T-004 | embedded-lead | tools-build | tools-verification | host | pass |
| 6 | T-006 | 注册 catalog/aliases 并保留聚合入口 | T-005 | embedded-lead | tools-git | workflow-review-gate | host | pass |
| 7 | T-007 | 完成插件回归、负例和 Codex/Cursor 观察 | T-006 | embedded-lead | tools-verification | tools-quality | static/host | pass |
| 8 | T-008 | 对照 Spec 执行统一最终 Verify | T-001..T-007 | embedded-lead | tools-verification | tools-quality | static/host | pass（保留 I/O 故障注入未验证项） |

## 4. 任务详情

### T-001：固化工作区基线并添加缺失行为测试

| 字段 | 内容 |
|---|---|
| order / parallel_group | 1 / none |
| source_plan_ids | P-01 |
| source_spec_ids | ARC-E01..E06, ARC-T01..T10 |
| owner_agent / support_agents | `embedded-lead` / `system-architect`, `verification-engineer` |
| owner_skill / supporting_skills | `tools-verification` / `tools-quality` |
| allocation_evidence | Plan E-01..E-06；当前不存在 architecture 插件目录且可用 package fixtures 已有仓库模式 |
| confidence / status | confirmed / pass |

#### 执行记录

- allocation_id：`T-001-20261124-ARCH-BASELINE`；primary_agent `embedded-lead`；support_agents `system-architect, verification-engineer`；owner_skill `tools-verification`；supporting_skills `tools-quality`。
- 测试先行：新增三份架构插件缺失断言；`node node_modules/jest-cli/bin/jest.js --runInBand --forceExit tests/architecture-plugin.test.js tests/architecture-skills.test.js tests/architecture-projection.test.js`，绝对 cwd 为仓库根，exit 1（预期）；3 suites、4 failed/1 passed，失败均为 package/manifest、39-ID catalog 与 sync script 缺失，测试可正常加载。
- 基线：分支 `host_ai`、HEAD `6cd4fadc93ddaff5b03efbf7b32fa6a72b97883b`；39 Skills、249 files 的 source/hash 清单见 `codex/plugin-split/artifacts/architecture/T-001/source-baseline.json`。
- 预存源差异：tools-quality 与 tools-verification 根文件与 verification 插件源 hash 不一致。未改动；共享快照任务以根工作树当前版本为输入并记录两侧 hash。
- 产物 hash：`source-baseline.json` SHA-256 `4BDBA3147EF81F3578653E76789E26C1B9DD3E338B8AB082D4D750293DDBDE02`；`result.md` SHA-256 `38C2F819A9072663D42ADC405BDB6FAD6A8133D221DF3D3B0BB34CCA577127BD`。
- 重试：首次等待窗口未收齐摘要，使用同范围完整命令复跑 1 次；最终结果如上。
- 验收：基线记录和预期失败测试通过；无业务/根目录源文件改动。T-001 状态 `pass`。

#### 目标与范围

- 包含：保存当前 branch/HEAD/status、39 项 Skill 路径与哈希、相关 root marker、8 个 external provenance 状态；新增断言插件包/manifest/39 IDs/shared links/兼容投影缺失时会失败。
- 不包含：修改旧 Skill 源、修复既有 verification 状态或改变 ownership。
- 文件范围：`tests/architecture-plugin.test.js`、`tests/architecture-skills.test.js`、`tests/architecture-projection.test.js`（如仓库测试分布要求可调整为等价文件）；`codex/plugin-split/artifacts/architecture/T-001/`。
- 所属层：插件包/主机验证。

#### 前置条件、步骤与输出

1. 重跑 `git rev-parse HEAD`、`git status --short --branch`；将输出写入 T-001 记录，不暂存/清理任何已有修改。
2. 记录 31 canonical + 8 external 的文件树和 SHA-256；记录 root vs owning-plugin 版本差异，尤其保存 `tools-quality` 和 `tools-verification` 两边 hash。
3. 写测试断言 architecture descriptor、Codex/Cursor manifests、39 Skill roots、link closure、catalog ownership 与 projection sync 行为。
4. 先运行新增测试，记录预期缺失失败；确保失败原因是目标能力不存在，而不是测试语法/依赖问题。

#### 约束、验证、失败处理

- 接口/依赖：不得登记测试 fixture 为真实 Skill；不改共享 catalog。
- 资源/并发/ISR/DMA：不适用。
- 生成边界：证据只写 `codex/plugin-split/artifacts/architecture/T-001/`；不生成/改写根 `AGENTS.override.md`。
- 验证命令：cwd 仓库根，`node node_modules/jest-cli/bin/jest.js --runInBand tests/architecture-plugin.test.js tests/architecture-skills.test.js tests/architecture-projection.test.js`；预期因 package/skills/syncer 缺失而按断言失败，测试代码自身可加载。
- 证据等级/产物：static/host；基线清单、hash、预期失败日志。
- 失败/回滚：测试加载错误时只修测试；任务只新增本任务测试与证据，可移除本任务新增文件回滚。
- SOLID：SRP/OCP/ISP 适用，测试逐项验证包职责/扩展/manifest roots；LSP/DIP 在后续 package contract task 验证。

### T-002：创建独立插件契约与包级 validator

| 字段 | 内容 |
|---|---|
| order / parallel_group | 2 / none |
| source_plan_ids | P-01 |
| source_spec_ids | ARC-F01, ARC-G01..G02, ARC-T01 |
| owner_agent / support_agents | `embedded-lead` / `toolchain-engineer` |
| owner_skill / supporting_skills | `tools-build` / `tools-verification` |
| allocation_evidence | `plugins/mcu-workbench-devops/` 与 verification 的 descriptor/package/manifests/validator |
| confidence / status | confirmed / pass |

#### 执行记录

- allocation_id：`T-002-20261124-ARCH-PACKAGE`；primary_agent `embedded-lead`；support_agents `toolchain-engineer`；owner_skill `tools-build`；supporting_skills `tools-verification`。
- 测试先行：`tests/architecture-manifest.test.js` 在实现前以 exit 1 失败；包 descriptor 和独立 manifest validator 缺失，测试文件正常加载。
- 实现：新增 architecture package、descriptor、aggregate plugin metadata、Codex/Cursor manifests、`index.js`、manifest validator 和 package validator；未迁移 Skills、未改 catalog/root Skill 文件。
- 验证：`node node_modules/jest-cli/bin/jest.js --runInBand --forceExit tests/architecture-plugin.test.js tests/architecture-manifest.test.js`，仓库根 cwd，exit 0，2 suites/4 tests 通过；`node plugins/mcu-workbench-architecture/scripts/validate-manifests.js` exit 0。包总 validator 仍会按预期提示缺少 39 个登记 Skills，待 T-003/T-006 完成后转为全包通过。
- 产物记录：`codex/plugin-split/artifacts/architecture/T-002/result.md`。
- 产物 SHA-256：`F66B2C9CBB38E008F4CA81C1F83679AA1B992D3CCE09CFFCBA18925CB85C42D3`。
- SOLID：SRP/OCP/LSP/ISP/DIP 约束在 descriptor、host manifest 和共享 contracts 校验中落地；该任务没有实现 Skill 路由或运行时业务。
- 回滚：删除本任务新增的 architecture 包骨架及 manifest test；保留 T-001 的测试和产物。T-002 状态 `pass`。

#### 目标与范围

- 包含：先为 descriptor、版本、Codex/Cursor manifest 和 package validator 添加当前失败断言；创建 `plugins/mcu-workbench-architecture/{descriptor.json,package.json,plugin.json,index.js,.codex-plugin/plugin.json,.cursor-plugin/plugin.json,scripts/validate.js,scripts/validate-manifests.js}`。
- 不包含：迁移 Skill 文件、编辑根 catalog 或同步旧目录。
- 文件范围：仅上述新插件文件和 T-002 直接测试。
- 所属层：插件包/宿主适配。

#### 前置条件、步骤与输出

1. 检查 T-001 pass 及文件范围；新增 metadata 缺失行为测试并先运行观察失败。
2. 以共享 contracts 校验 descriptor；插件 ID 固定 `mcu-workbench-architecture`、版本 `1.0.0`；manifest `skills` root 为 `./skills/`；不声明未证实 capability 或 runtime lifecycle 特性。
3. validator 检查 ID/version/schema、两个 manifests、Skill root、39 项登记数量/路径和重复 ID；包仅使用 Node 内置模块及仓库共享 contracts。
4. 运行本任务测试，记录命令、绝对 cwd、退出码和报告。

#### 约束、验证、失败处理

- 资源/并发/ISR/DMA：无 runtime service，不适用。
- 验证：`node node_modules/jest-cli/bin/jest.js --runInBand tests/architecture-plugin.test.js` 和 `node plugins/mcu-workbench-architecture/scripts/validate.js`；当前无 Skills 时 validator 可输出清晰的未完成结果，T-002 不得伪称 39 项已齐。
- 产物：`codex/plugin-split/artifacts/architecture/T-002/`。
- 回滚：删除仅本任务创建的插件骨架/测试；不得碰其它 plugin。
- SOLID：SRP 单一 architecture 包；OCP 通过 Skill registry 添加；LSP 两 manifests 符合同一 contracts；ISP roots 最小；DIP validator 只依赖 contracts/catalog 公共接口。每项附测试证据。

### T-003：将 31 项 canonical 与 8 项外部 Skill 纳入插件源

| 字段 | 内容 |
|---|---|
| order / parallel_group | 3 / none |
| source_plan_ids | P-02,P-03 |
| source_spec_ids | ARC-F02..F03, ARC-G01,G03..G04, ARC-T02..T03 |
| owner_agent / support_agents | `embedded-lead` / `system-architect`, `knowledge-engineer` |
| owner_skill / supporting_skills | `tools-git` / `tools-quality` |
| allocation_evidence | Plan 映射表和当前 catalog/inventory 文件存在性证据 |
| confidence / status | confirmed / pass |

#### 执行记录

- allocation_id：`T-003-20261124-ARCH-SOURCES`；primary_agent `embedded-lead`；support_agents `system-architect, knowledge-engineer`；owner_skill `tools-git`；supporting_skills `tools-quality`。
- 测试先行：`tests/architecture-skills.test.js` 先以 exit 1 证明 39 个源目录均缺失；写入包路径存在断言后再迁移。
- 实现：由 T-001 baseline 精确复制 31 canonical + 8 external Skill 完整目录树至插件 `skills/<id>/`。迁移前校验 source hash，staging 完成后逐文件校验 destination hash，再原子 rename。旧 `skills/` 源文件保持不变。
- source map：`plugins/mcu-workbench-architecture/skill-map.json` 明确 39 IDs、source/plugin paths 和原 root projection paths；SHA-256 `A125EBB5CE673A66D8009D8D3EB710BEBB1F5DA7AFA60E4EA2EA5E80A5FF6501`。
- 验证：`node node_modules/jest-cli/bin/jest.js --runInBand --forceExit tests/architecture-skills.test.js -t "source map|stores all selected Skill sources"`，绝对 cwd 仓库根，exit 0；2 selected tests pass，2 skipped（catalog 登记由 T-006 负责）。39 个 Skill / 249 files 与 T-001 manifest 一致。
- 产物：`codex/plugin-split/artifacts/architecture/T-003/import-manifest.json` SHA-256 `3A004AB88CB7910A085F5C8B8EFB4D42E165680912C7C7CCA78D3856DA7D1133`；`result.md` SHA-256 `BD7A4CAFF69B1312148A20A5CF6DC7D3A99650664581F96A05217E4985947959`。
- 更新后的 `T-003/result.md`（含 source map 结果）SHA-256：`1039A984A088AD8F659709CE43A3797B9C8E6D75A13AD3DAF5304A386B7AF6AE`。
- 未验证：插件内相对链接尚未迁移；交 T-004。
- 回滚：仅删除本次新建的 plugin `skills/` 目录；旧 source/其他预存改动未动。T-003 状态 `pass`。

#### 目标与范围

- 包含：将 31 canonical 和 8 external 的完整目录树复制到 `plugins/mcu-workbench-architecture/skills/<id>/`；编写只读 source map，标明旧 root projection 和 provenance 状态；更新包 validator 所需的 ID 清单。
- 不包含：删除或覆盖旧 `skills/` 路径；改变 Skill 正文语义；迁移其它 owner/unknown。
- 文件范围：仅新 architecture plugin skills、source map、validator 清单和直接测试。
- 所属层：插件 Skill 内容/迁移审计。

#### 前置条件、步骤与输出

1. 对 39 个源逐项复核 T-001 path/hash；若任一 hash 或状态变化，先查明并回填证据。
2. 为“插件内 Skill 路径存在”测试先运行并记录失败。
3. 完整复制每个源目录，包括 references/scripts/assets；旧 root 文件留在原处等待受保护 adoption。
4. 检查 `embedded-coding-standard` 等外部项 metadata；保持 matrix/inventory 原 provenance，不补猜版本/许可证。
5. 逐项对比源/目标文件数和 SHA-256；包 validator 计数应为 39，不能将 `_shared` 资源算作 Skill。

#### 约束、验证、失败处理

- 根文件只读：此 Task 不写 `skills/`。复制源包含已有未提交内容时照基线复制，不改源。
- 验证：`node node_modules/jest-cli/bin/jest.js --runInBand tests/architecture-skills.test.js`；运行 architecture validator；对 39 个目录做 hash/文件数比较。
- 产物：`codex/plugin-split/artifacts/architecture/T-003/` source manifest 和 compare log。
- 回滚：仅删除本 Task 新增的 architecture Skill 目录；根旧源保留。
- SOLID：SRP/OCP/ISP 验证内容归属和清单扩展；LSP 验证所有 Skills 满足 `SKILL.md` 最小契约；DIP 验证内容不反向依赖聚合实现。

### T-004：生成 shared reference closure 并修复包内链接

| 字段 | 内容 |
|---|---|
| order / parallel_group | 4 / none |
| source_plan_ids | P-04 |
| source_spec_ids | ARC-E06, ARC-F02, ARC-G03..G04, ARC-T04 |
| owner_agent / support_agents | `embedded-lead` / `system-architect`, `verification-engineer` |
| owner_skill / supporting_skills | `tools-build` / `tools-verification` |
| allocation_evidence | 217 Markdown、37 个包外链接、13 个直接目标、88 文件递归闭包的只读扫描 |
| confidence / status | confirmed / pass |

#### 目标与范围

- 包含：在 `plugins/mcu-workbench-architecture/references/shared/` 生成所需的 88 文件递归链接闭包；写 `shared-sources.json` 记录 source path、owner、hash、snapshot 生成时间；将插件内 Skill 链接改写到平铺 Skill roots 或该只读快照。
- 不包含：将共享快照注册为 Skills；修改 owner 插件/root source；替换/重写其内容；自动跟随未来变化更新快照。
- 文件范围：插件 shared references、转换/sync 工具及 `tests/architecture-links.test.js`。
- 所属层：只读引用资源/链接适配。

#### 前置条件、步骤与输出

1. 重新生成当前引用闭包清单并对照 T-001；不一致时先确认新增/移除目标。
2. 先增加 package link check 测试并确认当前迁移源存在对应错误/目标缺失。
3. 从 T-001 记录的当前根工作树字节生成快照；owner plugin 与 root projection 不同的条目写入两边 hash，并以根工作树快照作为本版本绑定输入，不修改任一边。
4. 对 plugin sources 中所有 Markdown 链接执行双向可逆映射：内部 Skill 指向 plugin `skills/<id>`；包外目标指向 `references/shared/`；后续 root projection 还原到原聚合目标路径。
5. 递归验证 shared snapshot 的本地链接 closure、未解析目标、source manifest hash 与禁止复制 owner root。

#### 约束、验证、失败处理

- 生成边界：shared 只读 snapshots 在 plugin 外不得编辑；变动必须由 owner 源重新生成并显式审阅。
- 验证：`node node_modules/jest-cli/bin/jest.js --runInBand tests/architecture-links.test.js`；`node scripts/validate-skill-links.js --root plugins/mcu-workbench-architecture --boundary-root plugins/mcu-workbench-architecture` 或 validator 等效入口。
- 产物：`codex/plugin-split/artifacts/architecture/T-004/` closure manifest、link report、hash report。
- 失败处理：缺失源或闭包循环无害但未收敛时阻塞；不得删链接/静默标外部。
- SOLID：SRP 仅提供引用依赖；OCP 可新增登记资源；LSP shared link snapshot 与本地目标契约一致；ISP 只带最小 closure；DIP 快照源来自登记的 owner path。

### T-005：实现安全的旧根目录投影、adoption 与 rollback

| 字段 | 内容 |
|---|---|
| order / parallel_group | 5 / none |
| source_plan_ids | P-05 |
| source_spec_ids | ARC-F04, ARC-G01,G04..G05, ARC-T04..T05, ARC-T09 |
| owner_agent / support_agents | `embedded-lead` / `toolchain-engineer`, `verification-engineer` |
| owner_skill / supporting_skills | `tools-build` / `tools-verification` |
| allocation_evidence | DevOps/verification projection patterns；旧路径由 39 项映射明确定位 |
| confidence / status | confirmed / pass |

#### 执行记录

- 实现 `scripts/sync-skills.js`，由插件 `skill-map.json` 生成 39 个根路径投影，共 249 个文件；Markdown 相对链接反向映射到旧聚合路径或插件间共享文件。
- 首次 adoption 前逐文件比较：只接受与生成投影相同的内容，或与 T-001 已记录源 hash 完全相同的原始根文件；逐 Skill 校验文件集合，不一致即整轮拒绝。成功后创建 `skills/.architecture-projections.json`，记录路径和 hash。
- 同步会校验 marker ID/schema/hash/路径、拒绝未登记文件和漂移；采用 staging 与备份，已存在的旧内容只在预检通过后替换。成功重复执行返回 `unchanged`。
- 验证：projection suite 通过；覆盖 39 Skill 注册、249 文件 marker、漂移拒绝且保留改动字节、未知 marker 拒绝。命令：`node node_modules/jest-cli/bin/jest.js --runInBand --forceExit tests/architecture-projection.test.js`，仓库根 cwd，exit 0。产物/实现证据见 `artifacts/architecture/T-005/result.md`。
- 限制：没有独立 fixture 覆盖写入中途 I/O 故障注入；staging/backup 的恢复路径经代码检查，未声称完成该故障注入测试。T-005 状态 `pass`（已实现同步与漂移安全验收）。

#### 目标与范围

- 包含：`plugins/mcu-workbench-architecture/scripts/sync-skills.js`、`skills/.architecture-projections.json` marker、投影 fixtures/tests 和仅 architecture 的 root projections。
- 不包含：重写/删除其它插件 marker、同步其它插件路径、无授权覆盖已有源文件。
- 文件范围：同步器、指定 root projection paths、marker、`tests/architecture-projection.test.js`。
- 所属层：生成/兼容适配。

#### 前置条件、步骤与输出

1. 新增负例：路径逃逸、未知 marker、hash 漂移、未标记且不匹配目录、写入中途失败、重复运行。
2. 首次 adopt 仅在 39 个目标目录与生成后投影逐文件完全匹配时创建 marker；任一文件不匹配时拒绝整体 adoption，不逐项覆盖。
3. 校验所有 source/target 均位于允许 root；先 staging 全部结果，备份既有目标，再替换；写 marker 后复核 hashes。
4. 重复同步返回 unchanged；失败时恢复本 Task 变动的全部旧投影并保留不匹配目录。
5. 测试正常 adopt/sync、改动后拒绝、marker 篡改拒绝和 rollback fixture。

#### 约束、验证、失败处理

- 接口/资源：只操作 plugin source、明确的 39 个 root projections、marker 和其自建临时 staging/backup。
- 并发/ISR/DMA：不适用；同步单进程。
- 验证：`node node_modules/jest-cli/bin/jest.js --runInBand tests/architecture-projection.test.js`；fixture 全部在 temp 目录；先确认现有生产路径内容 hash 与生成预期相同后才 adoption。
- 产物：`codex/plugin-split/artifacts/architecture/T-005/` sync report/hash。
- 回滚：按 marker 校验后恢复 T-005 之前目录与 marker 状态；若旧文件已被用户改动，拒绝回滚并保留原件。
- SOLID：SRP syncer 只管理 architecture projection；OCP mapping 可扩展；LSP marker/adoption 遵守同步器 API；ISP options 最小；DIP syncer消费 source map，不读 catalog 私有状态。

### T-006：注册 catalog/aliases 并保留聚合入口

| 字段 | 内容 |
|---|---|
| order / parallel_group | 6 / none |
| source_plan_ids | P-06 |
| source_spec_ids | ARC-F04, ARC-G02,G05..G06, ARC-T06 |
| owner_agent / support_agents | `embedded-lead` / `system-architect` |
| owner_skill / supporting_skills | `tools-git` / `workflow-review-gate` |
| allocation_evidence | `skills/catalog.js` 的 `PLUGIN_SKILL_IDS`、`pluginSkills()` 和现有 aliases 定义 |
| confidence / status | confirmed / pass |

#### 执行记录

- 在 `skills/catalog.js` 注册 31 项 canonical 与 8 项 external 到 `mcu-workbench-architecture`；保持既有 canonical path/IDs/aliases 和 resolver 行为，`pluginSkills()` 派生插件内路径。
- 验证：`pluginSkills('mcu-workbench-architecture')` 返回 39 项且 ID 唯一；根 `scripts/validate-plugin.js` 通过，统计 105 Skills、7 Agents、9 架构层。结果记录于 `artifacts/architecture/T-006/result.md`。T-006 状态 `pass`。

#### 目标与范围

- 包含：architecture 的 39 个 ID 在唯一 catalog/registry 中唯一登记；`pluginSkills('mcu-workbench-architecture')` 返回正确平铺 pluginPath；根 package 增加架构包 validator/sync 的薄转发；必要 agent routes/aliases 保持兼容。
- 不包含：调整其它插件路由、删除旧 IDs/aliases、重分类 workflow Skills。
- 文件范围：`skills/catalog-metadata.js`、`skills/catalog.js` 或其事实源、直接 resolver tests、根 `package.json` scripts。
- 所属层：共享 registry/兼容。

#### 前置条件、步骤与输出

1. 为 ownership/alias/路径断言先运行失败测试。
2. 映射 31 canonical + 8 external IDs 到 architecture；不得从 `unknown` 自动推导归属。
3. 保留原 legacy IDs/aliases 解析结果并确保没有两个 plugin owner。
4. 根 scripts 仅作为 package 入口薄转发，不复制 validator 实现。
5. 运行本任务测试与根 plugin validator。

#### 约束、验证、失败处理

- 生成边界：只改 catalog 的维护源与根 package 脚本，不手动改派生文件。
- 验证：`node node_modules/jest-cli/bin/jest.js --runInBand tests/architecture-catalog.test.js tests/skills.test.js`；`node scripts/validate-plugin.js`。
- 产物：`codex/plugin-split/artifacts/architecture/T-006/` alias/ownership report。
- 回滚：仅恢复本 Task 的 catalog/route/package/script 差异；投影和其它插件保持原状。
- SOLID：SRP registration owns only architecture IDs; OCP add Skill by one mapping; LSP pluginSkills honors catalog contract; ISP adapter exposes only required IDs; DIP aggregate relies on plugin/catalog contract.

### T-007：完成插件回归、负例和 Codex/Cursor 观察

| 字段 | 内容 |
|---|---|
| order / parallel_group | 7 / none |
| source_plan_ids | P-07 |
| source_spec_ids | ARC-T01..T10, ARC-A01..A07 |
| owner_agent / support_agents | `embedded-lead` / `verification-engineer`, `toolchain-engineer` |
| owner_skill / supporting_skills | `tools-verification` / `tools-quality` |
| allocation_evidence | Spec 明确各级验收；Plan V-01..V-08；Codex/Cursor 范围独立 |
| confidence / status | user-confirmed / pass |

#### 执行记录

- 六个架构套件通过：`node node_modules/jest-cli/bin/jest.js --runInBand --forceExit tests/architecture-plugin.test.js tests/architecture-manifest.test.js tests/architecture-skills.test.js tests/architecture-projection.test.js tests/architecture-links.test.js tests/architecture-marketplace.test.js`，仓库根 cwd，6 suites/17 tests，exit 0。
- `node plugins/mcu-workbench-architecture/scripts/validate-manifests.js`、`node plugins/mcu-workbench-architecture/scripts/validate.js`、`node scripts/validate-skill-links.js --root plugins/mcu-workbench-architecture --boundary-root plugins/mcu-workbench-architecture`、`node scripts/validate-plugin.js` 均通过；最后一个链接检查报告 296 Markdown 文件。
- 上述命令绝对 cwd 均为 `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`。`git diff --check` exit 0；Git 输出的 CRLF 转换文字是工作区行尾提示。
- Node 可执行但当前 PowerShell 会话未识别 `npm` 命令；根 package scripts 已解析通过，等价直接 Node validator 已通过。详细记录见 `artifacts/architecture/T-007/result.md`。
- 缺陷定位：初版只有插件内 host manifest，没有仓库 marketplace 注册或本地安装，所以两个宿主均不会自动发现新插件。已增加 `.agents/plugins/marketplace.json` 与 `.cursor-plugin/marketplace.json`，列出四个独立插件；marketplace discovery 与安装行为分开验证。
- Codex：`codex plugin add mcu-workbench-architecture@mcu-workbench-local` exit 0，安装到 `C:\Users\shuaitan2\.codex\plugins\cache\mcu-workbench-local\mcu-workbench-architecture\1.0.0`；随后 `codex plugin list` 显示 `installed, enabled`，来源为本仓库 architecture 插件目录。CLI 提示远端目录请求受网络限制，但本地 marketplace 解析和安装成功。
- Cursor：复制插件至官方 user-local 路径 `C:\Users\shuaitan2\.cursor\plugins\local\mcu-workbench-architecture`，并核实 `.cursor-plugin/plugin.json` 与 39 个 Skill 目录存在。实际宿主日志 `C:\Users\shuaitan2\AppData\Roaming\Cursor\logs\20261122T130740\window8\exthost\anysphere.cursor-agent-host\Cursor Plugins.log` 和 `window12` 多次记录 `loadUserLocalPlugin mcu-workbench-architecture loaded`。T-007 Codex/Cursor 发现验收现为通过。
- 报告 SHA-256：T-004 `0D175F3AC3C430E97104C72A0A43E8B7C68158C75ED05995815D3F91F1585A79`；T-005 `990E6AD351A25C8647651C67767FDC714D57A43146DDADC4D01CCA3E29126826`；T-006 `A00D3444CA21AF17BE475D21C9A67734BE76C55EBF7C196D660397373C91C9B3`；T-007 `74F4E76A577CB8304B6564DCDF269169CA01D593B7E339A7761AF54D40C95014`；Final Verify `61FD90A04D9C9A0693716D644165936E7F2B51D8D5EDD9EE3B5811DB4698E5E6`。

#### 目标与范围

- 包含：补齐 architecture plugin integration tests；执行 package validator、link checks、投影 fixtures、catalog compatibility 和本任务相关根回归；分别观察 Codex/Cursor 真实发现。
- 不包含：Claude/OpenCode；清理用户预存工作；硬件运行；修改任务外 Skill 内容解决无关问题。
- 文件范围：直接相关测试、宿主发现记录及 `codex/plugin-split/artifacts/architecture/T-007/`。

#### 前置条件、步骤与输出

1. 重查 git status 与新增/修改文件范围。
2. 对照负例断言，确认坏 manifest、缺 Skill、重复 ID、外部无来源声明、link break、marker drift 均失败且不破坏数据。
3. 运行 package 专项 suites、包 validator、link validator、根 plugin/catalog 直接回归；记录绝对 cwd、工具版本、exit code、artifact path/hash 和重试。
4. 分别在 Codex、Cursor 实际宿主观察插件/Skills 发现；不可用则记录 unverified，禁止从 manifest 推断。
5. 对预存基线问题记录 baseline/current/new counts；不得把旧失败记成本阶段新增或隐去。

#### 约束、验证、失败处理

- 静态、host、Codex、Cursor 证据分开；无 firmware build/target/physical evidence。
- 验证入口：本 Task 相关 architecture test suites、包 validator、`node scripts/validate-skill-links.js --root plugins/mcu-workbench-architecture --boundary-root plugins/mcu-workbench-architecture`、根 `node scripts/validate-plugin.js`、`git diff --check`；以实际 package scripts 为准记录。
- 回滚：本任务只增加/改动本阶段测试和日志；发现实现缺陷回对应任务修复复测，需求偏差回 Review Gate。
- SOLID：汇总并验证五项原则 evidence；任一不可验证或失败，Task blocked。

### T-008：对照 Spec 执行统一最终 Verify

| 字段 | 内容 |
|---|---|
| order / parallel_group | 8 / none |
| source_plan_ids | P-08 |
| source_spec_ids | ARC-A01..ARC-A08 |
| owner_agent / support_agents | `embedded-lead` / `verification-engineer` |
| owner_skill / supporting_skills | `tools-verification` / `tools-quality` |
| allocation_evidence | Workflow contract 要求所有 Task 完成后统一 Verify；Plan V-09 |
| confidence / status | confirmed / pass |

#### 执行记录

- ARC-A01..A08 均通过：Codex 已安装且启用，Cursor 本地插件日志已确认加载；唯一未验证项为同步器中途 I/O 故障注入 fixture（不改变 marketplace/Skill 发现结论）。
- T-005 未执行写入中途故障注入 fixture；回滚/恢复分支已做静态审阅但不能升级为故障注入通过。无固件/硬件验收范围。
- 最终映射与边界审查见 `artifacts/architecture/final-verify.md`。最终 Verify 状态：静态、主机与 Codex/Cursor 实际加载均通过；I/O 故障注入仍标 `unverified`。

#### 目标与范围

- 包含：只读映射每一项 ARC-A01..A08 到 Task 产物；检查 generated marker/hash、unique ownership、link closure、回滚证据和用户预存 diff 边界。
- 不包含：在 Verify 中改代码/Spec/Plan/Task；不把宿主未验证项改写为通过。
- 文件范围：`codex/plugin-split/artifacts/architecture/final-verify.md`；最终结果确有改变时按规则更新 task execution record。

#### 前置条件、步骤与输出

1. 确认 T-001..T-007 均有 pass 证据。
2. 逐项审查 ARC-A01..A08，报告 pass/fail/blocked/unverified。
3. 执行 `git diff --check`，记录 baseline/current/new issue counts；审查最终差异仅含批准范围及保留的预存用户修改。
4. SHA-256 汇总最终 Verify 和关键报告；发现 Spec 偏差回 Review Gate，禁止直接修补后放行。

#### 约束、验证、失败处理

- 证据等级：static/host；Codex 和 Cursor 按各自真实观察等级标记；目标硬件均不适用/未运行。
- 产物：`codex/plugin-split/artifacts/architecture/final-verify.md` 和报告哈希。
- 回滚：只读，无代码回滚；偏差回上游任务或 Spec。
- SOLID：最终核对五原则的任务证据齐全；缺项即 Verify 阻塞。

## 5. 任务级验收汇总

| task_id | 验收项 | 证据等级 | 命令/条件 | 预期结果 | 产物 | 初始状态 |
|---|---|---|---|---|---|---|
| T-001 | 已有状态/hash 基线及可加载的预期失败测试 | static/host | 指定三个新增 Jest suites | 仅因插件能力缺失失败 | `artifacts/architecture/T-001/` | not-run |
| T-002 | package/schema/manifests | static/host | architecture tests + package validators | descriptor 和宿主 roots 一致 | T-002 report | not-run |
| T-003 | 39 个源目录和 provenance | static/host | skill tests + hash compare | 31+8 完整；旧根未改写 | T-003 manifest | not-run |
| T-004 | shared closure/links | static/host | link tests + package link validation | 闭包完整、hash 可追溯、无未声明断链 | T-004 link report | not-run |
| T-005 | root adoption/idempotency/rollback | host | projection Jest fixtures | 漂移/逃逸拒绝，失败回滚，稳定复跑 | T-005 sync report | not-run |
| T-006 | catalog/aliases/root thin entry | host | catalog tests + root validator | 每 ID 单一 owner，旧调用稳定 | T-006 catalog report | not-run |
| T-007 | package regressions/host discovery | static/host | package tests + Codex UI + Cursor UI | 静态/主机通过；宿主逐项记录 | T-007 report | not-run |
| T-008 | Spec ARC-A01..A08 | static/host | 对照 artifacts + `git diff --check` | 所有验收有证据；限制明确 | `final-verify.md` | not-run |

## 6. 阻塞与未验证项

| ID | 类型 | 内容 | 影响任务 | 证据/补证动作 | 状态 |
|---|---|---|---|---|---|
| B-01 | 已验证 | Codex/Cursor 当前宿主的真实发现行为 | T-007,T-008 | Codex CLI 与桌面插件页已查找到；Cursor extension-host 日志确认加载 | closed |
| B-02 | 未验证 | 8 项 external provenance 字段依 inventory 可能未知 | T-003,T-008 | 保留原值；不伪造来源/版本/许可证/依赖 | carried limitation |
| B-03 | 已知风险 | 根已有 39 个未标记旧路径，首次 adoption 必须完全 hash 一致 | T-005 | 先 fixture 验证；生产 adoption mismatch 即 blocked | open |
| B-04 | 预存改动 | verification/tools-quality 相关 root 与 plugin source 不同 | T-001,T-004,T-008 | 两边记录 hash；仅作为只读 snapshot 输入，不回写 owner source | open |

## 7. 下游交接

- Spec 与 Plan 均已批准：`codex/plugin-split/spec.md` v0.8、`codex/plugin-split/plan.md` v0.1。
- 执行模式：`auto_until_final_check`；按 T-001 → T-008 串行，每项测试先行、单项审查、验证后自动推进。
- 每项当前主实现 Skill 以本 Task `owner_skill` 为准；辅助 Skill/Agent 不直接编辑同一任务范围。
- 变更范围严格受 ARC-F01..F06、Plan 第 7 节约束；预存未提交修改只读保留。
- T-008 完成后统一交 `workflow-final-review` 做最终代码/diff Review 和格式/注释门禁。
- 新事实导致 scope、owner、接口或验收变化时回 `workflow-review-gate`；普通实现失败在当前 Task 自动修复复测。
