---
name: quality-format-check
description: 嵌入式 C 代码格式检查 — 使用 clang-format 校验缩进、行宽、大括号、空格等是否符合 embedded-ai-coding-standard。
version: "1.0.0"
---

# 格式检查

> 基于 `.clang-format` 对嵌入式 C 代码进行自动化格式检查。
> 检查项与 `embedded-ai-coding-standard` 保持一致：4 空格缩进、行宽 ≤80、函数 `{` 换行、if/for `{` 同行、指针 `*` 靠变量名等。

## 前置条件

- 已安装 `clang-format`（LLVM 工具链）
- 项目根目录存在 `.clang-format` 配置文件
- 目标文件为 `.c` / `.h`

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
| 4 空格缩进 | `IndentWidth: 4`, `UseTab: Never` | 硬性约束 #1 |
| 行宽 ≤80 | `ColumnLimit: 80` | 硬性约束 #2 |
| 函数 `{` 换行 | `AfterFunction: true` | 排版细节 #3 |
| if/for `{` 同行 | `AfterControlStatement: false` | 排版细节 #4 |
| 枚举/结构体 `{` 换行 | `AfterEnum: true`, `AfterStruct: true` | 排版细节 #5 |
| 二元运算符空格 | `SpaceBeforeAssignmentOperators: true` | 排版细节 #6 |
| 括号内无空格 | `SpacesInParentheses: false` | 排版细节 #9 |
| 指针 `*` 靠变量名 | `PointerAlignment: Right` | 排版细节 #10 |
| 函数间空一行 | `MaxEmptyLinesToKeep: 1`, `SeparateDefinitionBlocks` | 排版细节 #12 |

## 边界

- 不检查 Doxygen 注释完整性（由 `embedded-ai-code-review` 检查）
- 不检查命名规范（由 `embedded-ai-code-review` 检查）
- 不检查逻辑正确性（由编译器与 `embedded-ai-code-review` 检查）
- 不自动修复注释的左对齐/右对齐填充（AI 生成时需按规范手动控制）

## 输出示例

```bash
$ clang-format --dry-run --Werror drivers/button/button.c
drivers/button/button.c:28:6: error: code should be clang-formatted [-Wclang-format-violations]
```

修复后再次运行，无输出即通过。
