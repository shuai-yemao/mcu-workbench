---
name: platform-bsp
description: "Platform 纯定义：板级器件能力接口（board/display/touch/imu/storage/temp_humi…）与设备模型协议，零实现不绑芯片；当前不生成 BSP Wrapper。"
---

# platform-bsp

Cursor 调用名是 `platform-bsp`。工作流、目录和代码里的 canonical id 仍是 `platform_bsp`。

执行前读取并遵守同插件中的 canonical skill，包括它引用的 references：

[platform_bsp](../../skills/platform/platform_bsp/SKILL.md)

不要改写该 skill 的输入、输出、交接对象和禁止事项。本文件只提供 Cursor 可加载的连字符名称。
