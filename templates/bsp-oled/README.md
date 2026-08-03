# 历史 OLED 模板

本目录保留为早期两文件 OLED Driver 样例，不再是 `mcu-workbench driver`
的生成入口。它没有表达当前的 Driver / 类别 Handle / Port / Wrapper 边界，
也没有 OSAL 资源注入或完整注释 profile。

请使用：

```powershell
mcu-workbench driver --device-type display --device SSD1306 --core i2c --platform stm32f4
```

该命令生成九文件的 SSD1306 分层切片，并在 manifest 中列出待确认的
目标 OSAL API。
