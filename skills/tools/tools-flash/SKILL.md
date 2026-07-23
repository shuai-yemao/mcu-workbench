---
name: tools-flash
description: 负责 MCU 固件烧录、批量烧录、探针连接和烧录后校验；当用户提到 J-Link、OpenOCD、ESP-IDF、Keil 或量产烧录时使用。
---

# 烧录工具

## 职责

统一处理固件格式、目标探针、接口、供电、擦除/下载/校验和失败重试。先确认芯片、产物、探针和连接方式，再读取对应 reference。

## 变体

- ESP-IDF：[`tool-flash-esp-idf`](references/tool-flash-esp-idf/GUIDE.md)
- 批量烧录：[`tool-flash-gang`](references/tool-flash-gang/GUIDE.md)
- J-Link：[`tool-flash-jlink`](references/tool-flash-jlink/GUIDE.md)
- Keil：[`tool-flash-keil`](references/tool-flash-keil/GUIDE.md)
- OpenOCD：[`tool-flash-openocd`](references/tool-flash-openocd/GUIDE.md)
- PlatformIO：[`tool-flash-platformio`](references/tool-flash-platformio/GUIDE.md)

## 输出

给出探针/端口配置、完整烧录命令、校验方式和失败后的最小复现信息。构建问题交接 [`tools-build`](../tools-build/SKILL.md)，在线调试交接 [`tools-debug`](../tools-debug/SKILL.md)。
