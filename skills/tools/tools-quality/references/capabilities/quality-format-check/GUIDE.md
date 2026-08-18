---
name: quality-format-check
description: 嵌入式 C 代码格式检查 — 使用 clang-format 校验插件所有生成代码的缩进、列对齐、大括号、空格等是否符合 style-profile 编码规范。
version: "1.0.0"
---

# 格式检查

> 基于 `.clang-format` 对插件所有生成的 `.c/.h` 文件进行自动化格式检查。
> 默认排版基线来自审查过的 FreeRTOS/内核源码：TAB 缩进与列对齐、Allman 大括号、条件编译层级、连续声明组对齐；命名、函数和注释规则仍由 `style-profile` 全局约束。

插件生成代码和插件要求修改的代码必须通过本格式检查，并同时通过 `style-profile` 的命名、函数和注释硬门禁；
任何一项失败都不得进入最终交付。既有无关代码可以保留基线，但不能为插件要求修改的范围提供豁免。

clang-format 对结构体内部的预处理指令可能不会完全保留源文件缩进，`#if/#endif` 的层级缩进需要人工复核。

## 前置条件

- 已安装 `clang-format`（LLVM 工具链）
- 项目根目录存在 `.clang-format` 配置文件
- 目标文件为 `.c` / `.h`
- `05_Vendor` 下的项目自维护源码必须在 `.mcu-workbench/quality-scope.json`
  中显式登记；未登记的第三方 Vendor 源码默认保持原样。

### Vendor 质量范围

质量 Hook 默认排除整个 `05_Vendor`，以避免误改 FreeRTOS、LVGL、HAL 或其他
第三方源码。项目自维护的 Vendor 算法库可以通过以下配置显式纳入同一套格式和
注释管线：

```json
{
  "schemaVersion": 1,
  "managedVendorRoots": [
    "05_Vendor/circle_buffer"
  ]
}
```

路径必须是项目根目录下的相对路径，并且以 `05_Vendor/` 开头。该配置只控制
质量 Hook 的 `.c/.h` 处理范围，不改变构建系统、依赖关系或 Vendor 版本登记。

## 命令

### 检查单个文件（不修改）

```bash
clang-format --dry-run --Werror <file.c>
```

### 检查整个目录

```bash
clang-format --dry-run --Werror $(find drivers test -name "*.c" -o -name "*.h")
```

### 自动修复单个文件

```bash
clang-format -i <file.c>
```

### 自动修复整个目录

```bash
find drivers test \( -name "*.c" -o -name "*.h" \) -exec clang-format -i {} +
```

## 输出解读

| 输出 | 含义 |
|------|------|
| 无输出 | 格式合规 |
| 提示 `code should be...` | 格式不合规，会列出应修改位置 |
| `--Werror` 下返回非 0 | CI/门禁可据此判定失败 |

## 检查项与编码规范映射

| 检查项 | clang-format 配置键 | 编码规范对应 |
|--------|---------------------|-------------|
| TAB 缩进和列对齐 | `IndentWidth: 4`, `TabWidth: 4`, `UseTab: Always` | 硬性约束 #1 |
| 代码和注释不超过 80 列 | `ColumnLimit: 80`，并单独检查注释行宽 | 硬性约束 #2 |
| 函数 `{` 换行独行 | `BreakBeforeBraces: Allman` | 排版细节 #3 |
| if/for `{` 换行独行 | `BreakBeforeBraces: Allman` | 排版细节 #4 |
| 枚举/结构体 `{` 换行独行 | `AfterEnum: true`, `AfterStruct: true` | 排版细节 #5 |
| 二元运算符空格 | `SpaceBeforeAssignmentOperators: true` | 排版细节 #6 |
| 括号内无空格 | `SpacesInParentheses: false` | 排版细节 #9 |
| 指针 `*` 靠变量名 | `PointerAlignment: Right` | 排版细节 #10 |
| 函数间空一行 | `MaxEmptyLinesToKeep: 1`, `SeparateDefinitionBlocks` | 排版细节 #12 |

统一插件 profile 的关键配置：

| 检查项 | profile 配置键 |
|--------|----------------|
| TAB 缩进和列对齐 | `UseTab: Always`, `TabWidth: 4` |
| Allman 大括号 | `BreakBeforeBraces: Allman` |
| 条件编译按层级缩进 | `IndentPPDirectives: BeforeHash` |
| 代码和注释不超过 80 列 | `ColumnLimit: 80`，并单独检查注释行宽 |
| 连续声明组列对齐 | `AlignConsecutiveDeclarations.Enabled: true` |

## 边界

- Doxygen 注释完整性由 `tools-quality` 代码质量门禁检查
- 命名规范由 `tools-quality` 项目级审查检查
- 不检查逻辑正确性（由编译器与 `workflow-final-review` 代码审查检查）
- 不自动修复注释的左对齐/右对齐填充（生成器或人工修改后均需按规范控制）
- `clang-format` 通过后仍必须逐行检查源码显示宽度；代码行、Doxygen、块注释、分隔线和行尾注释超过 80 列均判定失败

## 输出示例

```bash
$ clang-format --dry-run --Werror drivers/button/button.c
drivers/button/button.c:28:6: error: code should be clang-formatted [-Wclang-format-violations]
```

修复后再次运行，无输出即通过。
