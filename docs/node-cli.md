# 脚本与 Programmatic API

> Node CLI 已移除(2026-08-08)——交互统一走 Skill + lib Programmatic API。
> 本文档说明保留的确定性脚本入口与 lib 能力。

## 分层扫描/同步/校验(claude-layer-api)

包装 `lib/claude-layer.js` 的 `runClaudeLayer`,供 `workflow-claude-layering` skill 与人工使用:

```powershell
node scripts/claude-layer-api.js <action> --root <dir> [--write] [--strict] [--rules-confirmed] [--config <path>]
npm run claude:design    # 新工程创建前只读设计规则
npm run claude:bootstrap  # 规则确认后的创建起始写入入口
npm run claude:init    # 建立首次配置与受管产物计划
npm run claude:scan    # 只读扫描分层证据
npm run claude:sync    # 依据配置重新扫描并生成更新计划
npm run claude:validate  # 检查快照/受管文件/架构契约
```

- 新工程顺序固定为 `design` → 用户确认 → `bootstrap --rules-confirmed --write` → 生成工程骨架 → `sync --write`
- `bootstrap` 未带 `--rules-confirmed` 时返回 `RULES_NOT_CONFIRMED` 且不写入;`init`/`sync` 默认只显示计划,追加 `--write` 才写入
- `--strict` 把 unverified 提升为错误
- README 管理默认包含项目根及五层架构目录下两级子目录；`00_文档`、`build` 排除；README 仅更新受管区块
- README 受管区块采用解释型模板，包含目录定位、Mermaid 架构关系、职责边界、子目录明细、直接文件逐项说明（类型、作用、关键符号、include、证据来源）、阅读顺序、修改约束和验证方式；自动部分不猜测业务或硬件事实
- 输出结构化 JSON(含 `exitCode`);非零退出码表示失败

## 校验脚本(CI 对齐)

```powershell
npm test                          # Jest 全量(48 套件)
npm run validate:plugin           # 插件结构(45 skills/7 agents/8 layers)
npm run validate:links            # Markdown 链接(307 文件)
npm run validate:layer            # 分层契约自检
npm run validate:flash-algorithm  # 闪存算法 profile
```

## 历史说明

原 Node CLI(项目骨架生成、Core/BSP 模板、构建/烧录命令计划)已删除;其能力载体 `lib/`(builder/flasher/generator/platform 等)保留为共享引擎,可经 Skill/API 接入。删除理由与影响见 `docs/plugin-architecture-io.md`(三条链路对比)。
