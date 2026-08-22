# LVGL 知识图谱

## 来源与版本

| 来源 | 用途 | 分支与提交 | 版本证据 |
| --- | --- | --- | --- |
| [100askTeam/100ask_lvgl_docs](https://github.com/100askTeam/100ask_lvgl_docs) | 中文 Sphinx 文档、示例和 LVGL 源码快照 | `master` / `84d7f584dc4f167709f1d8bc8abb91ca941b1c1a` | `lv_version.h`：9.3.0-dev |
| [lvgl/lvgl](https://github.com/lvgl/lvgl) | 官方源码、配置和最新模块结构 | `master` / `c4424b27d63db752aa75f9fdffe30c6467b55ad1` | `include/lvgl/lv_version.h`：9.6.0-dev |
| GR5526 LVGL 工程 | 验收夹具，不作为上游 API 来源 | 用户提供的 `graphics_lvgl_831_gpu_demo_360p` | LVGL 8.3.x |

## 文档到源码的映射

```mermaid
flowchart LR
    D["100ask 中文文档"] --> I["Introduction / Porting"]
    D --> B["Base Widget"]
    D --> W["Widgets"]
    D --> M["Main Components"]
    D --> X["Integration / Debug / Libraries"]
    I --> C["core / lv_init"]
    B --> C
    W --> WG["src/widgets"]
    M --> DP["display / indev / draw / tick"]
    X --> OS["src/osal / drivers / libs"]
```

## 工程调用链

```mermaid
flowchart TD
    SERVICE["Service GUI 能力"] --> GUI["platform_gui.h"]
    GUI --> IMPL["impl_lvgl_gui.c"]
    IMPL --> API["LVGL Public API"]
    API --> CORE["Core: object / event / style / refresh"]
    CORE --> DISPLAY["Display + Draw"]
    CORE --> INPUT["Input + Group"]
    DISPLAY --> FLUSH["Flush Callback"]
    FLUSH --> PORT["Impl LVGL Port"]
    PORT --> BW["platform_bsp / BSP Wrapper"]
    BW --> BP["BSP Port"]
    BP --> HAL["BSP hal_driver"]
    HAL --> MCU["Core → Driver"]
    INPUT --> READ["Input Read Callback"]
    READ --> BW
    CORE --> TICK["Tick / Timer / Lock"]
    TICK --> OW["platform_os / OS Wrapper"]
    OW --> OP["OS Port → FreeRTOS/RT-Thread/裸机"]
```

## 节点和关系规则

- 文档主题节点只解释概念、API 和示例，不替代源码证据。
- `core` 管理对象、事件、样式、布局、刷新和全局生命周期。
- `display` 管理显示对象、分辨率、缓冲和 Flush；`draw` 管理软件或硬件绘制后端。
- `indev` 管理触摸、鼠标、键盘、编码器和手势输入。
- `osal`、`tick` 提供系统协作；Widgets、Themes、Fonts、Images、FS 和第三方库按配置启用。
- LVGL 的具体实现由 `impl_lvgl_gui.c` 从唯一 `platform_gui.h` 契约落地；显示/输入与 Tick/锁
  通过 Impl 内部使用 `platform_bsp`/`platform_os`，BSP Wrapper/Port 与 OS Wrapper/Port 只是内部适配角色，
  App 仍只能通过 Service 使用业务能力。

JSON 机器可读版本见 [`lvgl-knowledge-graph.json`](lvgl-knowledge-graph.json)。
