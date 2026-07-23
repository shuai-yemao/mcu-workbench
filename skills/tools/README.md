# 工具 Skills

工具方向现在按用途保留 8 个 active 主入口：

- `tools-build`：构建
- `tools-flash`：烧录
- `tools-linker`：链接与内存
- `tools-debug`：调试与故障诊断
- `tools-observability`：日志与运行时观测
- `tools-quality`：质量与验证
- `tools-release`：发布与 OTA
- `tools-learning-tutor`：项目提问、理解检查与 Obsidian 学习笔记

原 29 个入口及其完整资料保留在 `archive/tools-legacy/`，主入口通过 `references/<旧入口>/GUIDE.md` 和对应脚本命名空间复用。

推荐工具链交接顺序：`tools-build` → `tools-flash` / `tools-debug` → `tools-observability` → `tools-quality` → `tools-release`。

项目学习和笔记整理可从任意阶段交接到 `tools-learning-tutor`；它只负责提问、记录和复核，不替代软件架构 Skill。
