# T-004 执行记录

- task_id: `T-004`
- allocation_id: `T-004-20261123T`
- primary_agent: `toolchain-engineer`
- support_agents: `verification-engineer`
- primary_implementation_skill: `tools-build`
- supporting_skills: `tools-quality`
- cwd: `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`
- evidence_level: `host`
- status: `pass`

## 测试先行

- 当前行为：仓库没有 Codex/Cursor/Claude 三宿主 smoke-test 脚本或 Host Capability Matrix。
- 检查：桌面宿主清单只读探测。
- 预期：每个宿主独立记录 manifest、Skill、Agent、Rule、Hook、Profile 与生命周期能力。

## 观察结果

| 宿主 | 桌面应用观察 | 插件加载 smoke test | 生命周期/跨插件依赖 |
|---|---|---|---|
| Codex | ChatGPT/Codex 应用窗口可见 | 未执行；当前仓库无脚本 | unverified |
| Cursor | Cursor 应用及两个窗口可见 | 未执行；当前仓库无脚本 | unverified |
| Claude | 未观察到运行窗口 | 未执行 | unverified |

## 补充静态检查

- `node -e "require('./.codex-plugin/plugin.json'); require('./.cursor-plugin/plugin.json'); require('./.claude-plugin/plugin.json')"`：退出码 0。
- 三份 manifest 均声明单一 `mcu-workbench` 入口；未发现跨插件依赖范围、profile/bundle、注册句柄或卸载契约字段。
- 详细矩阵：`codex/plugin-split/artifacts/T-004/host-capability-matrix.md`。

## 用户确认后的本轮范围

- 宿主验证范围：本地 Codex + Cursor；Claude 延期，不阻塞 MVP。
- Codex：当前会话在本工作区实际执行 Workflow Skill，作为宿主表面/路由 smoke evidence。
- Cursor：Cursor Agents 观察到 `mcu-workbench-host_ai` 项目与已完成的 `Cursor plugin integration` 会话，作为本地宿主表面 evidence。
- MVP 生命周期：静态组合、显式生命周期、重启加载；热加载、动态卸载和事件撤销不作本轮通过条件。

## 延期项

- 当前结果不能证明跨插件 Skill 依赖、动态卸载或事件撤销；这些不属于本轮 MVP 通过条件。
- 上位机范围冻结为 `descriptor/fake/contract test` MVP，具体协议、进程、串口/USB/TCP 权限仍延期。
- 下一步：进入 T-005；动态宿主能力和 Claude 验证延期记录为后续任务。
