# platform_common 代码质量审查报告

> 审查日期：2026-08-08
> 审查依据：mcu-workbench 插件 `tools-quality` skill（`review-gates.md` 检查顺序 + `quality-code-review` 检查维度 + `style-profile.md` 证据优先级 + `generated-bsp-comment-profile.md` 注释格式）
> 审查方式：人工逐文件核查（静态分析流，仅「可疑模式」判定，不替代目标运行与实物验收）

## 1. 审查范围与证据

- **被审对象**：`03_Platform/platform_common/` 全部 18 个文件（7 `.c` + 11 `.h` + `README.md`）
- **审查基线**：git 分支 `feature/platform-object-model`（审查开始时工作树 clean）
- **风格 profile**：
  - 来源 1（用户明确要求）：使用 mcu-workbench 插件已设置的完整注释格式（英文 doxygen）
  - 来源 2（工程配置）：`d:\zhuomian\embedded_framework\.clang-format`（LLVM 基 / 4 空格 / Allman 大括号 / 100 列 / PointerAlignment Right / AlignTrailingComments）
  - 来源 3（相邻源码）：platform_common 现有 18 个文件全量英文 doxygen，与本报告口径一致
- **静态分析**：cppcheck 未安装，经用户确认本次跳过
- **构建/运行验证**：工程为纯源码库（无 Makefile / CMakeLists / Keil 工程），无编译与目标运行入口，本轮不涉及

## 2. 问题清单（按严重级别）

### 阻塞（0 项）

无。

### 高（0 项）

无。

### 中（2 项）

| # | 定位 | 问题 | 影响 | 修复建议 |
|---|------|------|------|----------|
| M1 | `platform_manager.c:166` + `:229` | `PLATFORM_ERR_BUSY` 语义重载：`manager_drive_one` 用 BUSY 表示「前置状态不匹配」（L166）；`manager_drive_all` 将任何 BUSY（包括对象自身 lifecycle 回调真实返回的 BUSY）一律静默当 skip（L229） | 对象回调返回 BUSY（如资源正忙）会被误判为「跳过」而非「失败」，ok/skip/fail 统计失真，且首错被吞 | 为「前置状态不匹配」引入独立内部错误码（如 `PLATFORM_ERR_STATE`），`drive_all` 仅对该值执行 skip；对象回调的真实 BUSY 计入 fail |
| M2 | `platform_manager.c:322` | 重复注册（同指针或同名）返回 `PLATFORM_ERR_ALREADY_INIT` | 语义应为「已注册」，调用方难以区分「重复注册」与「已初始化」 | 新增 `PLATFORM_ERR_ALREADY_REGISTERED`，或保留现码并在注释中说明语义 |

### 低（9 项）

| # | 定位 | 问题 | 修复建议 |
|---|------|------|----------|
| L1 | `platform_manager.c:397` | `platform_manager_drive` 仅支持 INIT/START/STOP/DEINIT，不支持 PROCESS（PROCESS 只有批量入口），API 不对称 | 补 PROCESS 分支，或加注释说明 PROCESS 仅批量驱动 |
| L2 | `platform_manager.h:127` vs `platform_device_manager.h:99` 等 | 基类查询用 `find`，device/service 特化用 `get`，命名不一致 | 统一为 `find` 或 `get`（P2 可选） |
| L3 | `platform_device_manager.c` / `platform_service_manager.c` | 两文件 9 个函数逐函数克隆（薄包装，有意设计） | 维持现状；如需去重可考虑宏/模板生成包装函数 |
| L4 | `platform_device_manager.c:117` | `get_by_class` 直接强转 `(platform_device_t *)p_obj`，依赖「object 首字段」布局但无注释说明 | 补行内注释（已列入注释完善范围一并处理） |
| L5 | `platform_def.h:30-31` | `PLATFORM_OK/ERROR` 与 `platform_error.h` 的 `PLATFORM_ERR_OK` 双「OK」概念并存 | 遗留兼容宏（SKILL.md 已注明新代码禁用），仅存量保留 |
| L6 | `platform_type.h:48` | `bool_t` 定义为 `uint8`，与 `board_types.h` 的 `bool` 并存 | 评估统一命名与基础类型映射 |
| L7 | `platform_board_manager.c:60,71,77` | 硬编码字符串 `"board" / "device_mgr" / "service_mgr"` | 提取为宏定义 |
| L8 | `platform_def.h:53-54` | `platform_delay_ms/us` 仅声明无实现 | 应在 Impl 层落地实现（README 已注明），属跨层缺口 |
| L9 | `platform_object.c:90` / `platform_object.h:111` | `platform_object_set_state` 不校验状态机合法性，任意状态可写 | 有意设计（state 仅记录，跳转由 manager 规则表决定），建议补注释说明 |

### 风格偏差（独立分级）

- 注释：18 个文件文件头块、函数 doxygen、字段行内注释统一（英文 / doxygen / 对齐），与插件完整注释 Profile 一致，**无偏差**。
- 注释缺口（本次已修复，见 §3）：`platform_manager.c` / `platform_device_manager.c` / `platform_service_manager.c` / `platform_board_manager.c` 的公共函数缺少 `.c` 侧 doxygen（`.h` 侧全部完整）。
- 轻微格式：`platform_device.c:69` 存在含尾随空格的空行；`platform_object.h:74` 字段注释对齐列使该行超 100 列。均为可选项。
- 命名：guard 为 `__PLATFORM_XXX_H__`（双下划线）、生命周期回调裸名（无 `pf_` 前缀）——属命名审计 P1 可选对齐项，不强制（`platform_common/SKILL.md` 已声明）。

## 3. 注释完善（本次改动）

为 4 个 `.c` 文件补充 `.c` 侧函数 doxygen，与 `.h` 及 `platform_object.c` 样式完全一致：

- `platform_manager.c`：11 个公共函数（init / register / unregister / find / count / drive / init_all / start_all / process_all / stop_all / deinit_all）
- `platform_device_manager.c`：10 个公共函数（init / register / unregister / get / get_by_class / init_all / start_all / process_all / stop_all / deinit_all）+ `get_by_class` 强转处布局说明
- `platform_service_manager.c`：9 个公共函数（init / register / unregister / get / init_all / start_all / process_all / stop_all / deinit_all）
- `platform_board_manager.c`：7 个公共函数（init / start / process / stop / deinit / get_device_manager / get_service_manager）

`README.md` 文档漂移同步：

- L14 lifecycle 回调列表补 `sleep/wakeup`（共 7 回调）
- L77 / L101 / L106 `power_state` 描述与代码对齐（当前功耗状态由 `object.state` / lifecycle 状态机记录，`caps` 仅为静态运行能力）

## 4. 已执行 / 待补验证

- **已执行**：全 18 文件人工审查；注释完整性核查；`.clang-format` 风格核对；`git diff` 确认改动仅含注释/文档行。
- **待补**：cppcheck 静态分析（可选，未安装）；编译/目标运行/Unity 测试（无工程入口，不涉及）；M1/M2 等行为变更项（用户决定只报告不修改）。

## 5. 结论

无阻塞项。2 项中风险（M1 BUSY 语义重载、M2 重复注册语义）建议在后续版本修复。注释与文档漂移已在本次完善。
