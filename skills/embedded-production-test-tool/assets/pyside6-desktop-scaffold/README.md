# PySide6 桌面应用脚手架

这是一个面向 Windows 桌面工具的最小 PySide6 模板。主线只保留通用能力：应用入口、YAML 配置、日志、主窗口、版本号和打包脚本。

## 快速运行

```powershell
pip install -r requirements.txt
$env:PYTHONPYCACHEPREFIX = Join-Path (Resolve-Path .).Path ".pycache_root"
python src/app.py
```

`.pyc` 缓存会集中到 `.pycache_root/`，避免污染 `src/`。

默认配置文件固定为：

```text
config/app.yaml
```

主模板未依赖 `pyserial`，没有硬件也可以直接启动。

## 目录结构

```text
src/
  app.py                 # 应用入口
  __version__.py         # 应用名和版本号的单一来源
  config/loader.py       # YAML 配置加载和默认值
  reports/writer.py      # 滚动日志
  ui/main_window.py      # 通用主窗口
config/app.yaml          # 应用配置
packaging/               # PyInstaller / Inno Setup 打包文件
```

## 复制成新项目

1. 修改 `src/__version__.py` 中的 `APP_NAME`、`APP_DISPLAY_NAME`、`__version__`。
2. 修改 `config/app.yaml` 中的窗口标题、尺寸、日志路径。
3. 在 `src/ui/main_window.py` 中替换中心区域 UI。
4. 按需添加业务模块，例如 `src/services/`、`src/models/`、`src/widgets/`。
5. 如果要发布安装包，先替换 `packaging/installer.iss` 中的 `AppId` 和发布者信息。

## 增加页面或功能

建议保持这个分层：

```text
ui/       只放 Qt 界面和交互
config/   配置加载和配置对象
reports/  日志和导出
services/ 业务服务、外部接口或设备访问
```

阻塞 I/O 不要放在 Qt 主线程里。需要长时间运行的任务时，用 `QThread`、`QRunnable` 或异步服务把工作移出 UI 线程。

## 打包

安装 PyInstaller 后可以直接构建 onedir：

```powershell
powershell -ExecutionPolicy Bypass -File packaging\build.ps1 -SkipInstaller
```

如果本机安装了 Inno Setup，可以生成安装包：

```powershell
powershell -ExecutionPolicy Bypass -File packaging\build.ps1 -Version 0.1.0
```

打包输出位于 `dist/`。正式发布前请替换稳定的 Inno `AppId`，并按团队要求配置代码签名。
