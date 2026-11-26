# Embedded Production Test Tool Skill

这个技能用于生成一个通用 PySide6 Windows 桌面应用脚手架。

默认技术栈是 Python + PySide6。生成的脚手架是通用桌面应用模板，不默认包含串口、CAN、Modbus、VISA、DUT 协议、MES、产测流程、固件烧录或方案报告逻辑。

## 安装位置

Claude Code 项目本地：

```text
.claude/skills/embedded-production-test-tool
```

Claude Code 个人目录：

```text
%USERPROFILE%\.claude\skills\embedded-production-test-tool
```

Codex 个人目录：

```text
%USERPROFILE%\.codex\skills\embedded-production-test-tool
```

## 调用示例

Claude Code：

```text
/embedded-production-test-tool 在 .\my_tool 生成 PySide6 桌面脚手架，app-name 为 MyTool，显示名为 "My Tool"，版本 0.1.0
```

Codex：

```text
$embedded-production-test-tool 生成一个 PySide6 桌面应用脚手架到 ./my_tool，应用名 MyTool，显示名 "My Tool"
```

## 直接运行生成脚本

```powershell
python .claude\skills\embedded-production-test-tool\scripts\create_pyside6_scaffold.py `
  --output .\my_tool `
  --app-name MyTool `
  --display-name "My Tool" `
  --version 0.1.0
```

生成后的工程命令：

```powershell
cd .\my_tool
pip install -r requirements.txt
$env:PYTHONPYCACHEPREFIX = Join-Path (Resolve-Path .).Path ".pycache_root"
python src/app.py
```

生成出的工程推荐在启动 Python 前设置 `PYTHONPYCACHEPREFIX`，这样 `.pyc`
缓存会集中到 `.pycache_root/`，不会在 `src/` 下散落 `__pycache__/`。
模板代码里也设置了 `sys.pycache_prefix` 作为兜底，但环境变量方式最彻底。
`.pycache_root/` 是运行/构建缓存，可以安全删除。

打包 onedir：

```powershell
powershell -ExecutionPolicy Bypass -File packaging\build.ps1 -SkipInstaller
```

如果安装了 Inno Setup，可以生成安装包：

```powershell
powershell -ExecutionPolicy Bypass -File packaging\build.ps1 -Version 0.1.0
```

## 技能资源

- `scripts/create_pyside6_scaffold.py`：生成通用 PySide6 桌面脚手架。
- `assets/pyside6-desktop-scaffold/`：脚手架模板。

## 安全边界

- 生成脚手架不会安装依赖、联网、打包、运行 GUI 或触碰硬件。
- 这个技能不再输出开发方案、架构方案、产测方案、证据摘要或测试报告模板。
- 业务功能、串口协议、产测流程、硬件写入、MES、固件烧录等需要在生成脚手架后由用户明确提出，再作为普通工程开发任务处理。
- 没有真实构建日志前，不要声称安装包已在干净机器验证。
