# 团队规则

## 开发格式

- 保持变更小而便于评审。
- 优先沿用项目现有风格，而不是引入新抽象。
- 避免把硬件相关业务逻辑堆在 `main.c`；新增行为时优先使用模块级 `.c/.h` 文件。
- 保留 `USER CODE BEGIN/END` 等生成代码保护区。

## 提交格式

使用简洁的工程提交格式：

```text
type(scope): summary
```

常见类型：`feat`、`fix`、`test`、`docs`、`build`、`refactor`、`chore`。

## 编辑边界

- 修改生产代码前先确认允许文件。
- 将 startup files、linker scripts、clock configuration、ISR、DMA、BSP、flash layout 和已验证硬件代码视为高风险区域。
- 未经明确确认，不要修改高风险区域。

## 验证规则

- 分别记录构建、测试、烧录和硬件验证。
- 不要把构建成功当作硬件验证。
- 不要把 mock 当作真实外设验证。
- 缺少证据时标记为 `未验证` 或 `待确认`。

## AI 使用规则

- 开始工作前读取 `.ai/TEAM_RULES.md` 和 `.ai/PROJECT_STATUS.md`。
- 面向硬件或生产代码编辑前，先生成任务确认说明。
- 每个任务后更新 `.ai/TASK_LOG.md`。
- 让 `.ai/PROJECT_STATUS.md` 保持足够新，便于交接。
