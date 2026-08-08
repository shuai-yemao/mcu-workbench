# 脚本与 Programmatic API

> Node CLI 已移除(2026-08-08)——交互统一走 Skill + lib Programmatic API,与嵌入式 AI Harness 同模式(ADR H13)。
> 本文档说明保留的确定性脚本入口与 lib 能力。

## 分层扫描/同步/校验(claude-layer-api)

包装 `lib/claude-layer.js` 的 `runClaudeLayer`,供 `workflow-claude-layering` skill 与人工使用:

```powershell
node scripts/claude-layer-api.js <action> --root <dir> [--write] [--strict] [--config <path>]
npm run claude:init    # 建立首次配置与受管产物计划
npm run claude:scan    # 只读扫描分层证据
npm run claude:sync    # 依据配置重新扫描并生成更新计划
npm run claude:validate  # 检查快照/受管文件/架构契约
```

- `init`/`sync` 默认只显示计划,追加 `--write` 才写入;`--strict` 把 unverified 提升为错误
- 输出结构化 JSON(含 `exitCode`);非零退出码表示失败

## 校验脚本(CI 对齐)

```powershell
npm test                          # Jest 全量(48 套件)
npm run validate:plugin           # 插件结构(45 skills/7 agents/8 layers)
npm run validate:links            # Markdown 链接(307 文件)
npm run validate:layer            # 分层契约自检
npm run validate:flash-algorithm  # 闪存算法 profile
npm run validate:harness-contracts  # harness 契约类型(tsc --noEmit)
```

## 嵌入式 AI Harness(Programmatic API)

独立插件 `harness/`,无 CLI;agent 直调 lib:

```js
const { createHarness } = require('./harness/lib');
const h = createHarness({ baseDir: '.mcu-workbench' });
h.createPipeline(spec); await h.run(); h.report({ runId });
// campaign({ pipeline, policy, maxRounds }) / compare / trend / decisions
```

完整说明见 `docs/embedded-ai-harness-plan.md` / `docs/embedded-ai-harness-contributing.md`。

## 历史说明

原 Node CLI(项目骨架生成、Core/BSP 模板、构建/烧录命令计划)已删除;其能力载体 `lib/`(builder/flasher/generator/platform 等)保留为共享引擎,可经 Skill/API 接入。删除理由与影响见 `docs/plugin-architecture-io.md`(三条链路对比)。
