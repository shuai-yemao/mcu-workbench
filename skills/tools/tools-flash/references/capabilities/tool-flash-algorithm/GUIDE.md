---
name: tool-flash-algorithm
description: 制作、审查和验证 Keil Flash 下载算法（.FLM）时使用；覆盖 FlashOS 接口、地址映射、分区保护、AC5 产物和实板验收。
version: "1.0.0"
---

# Keil Flash 下载算法制作

## 适用边界

此能力处理“调试器把算法装入 SRAM 后，对外部 Flash 擦写”的 `.FLM` 工程；它不替代应用固件烧录。应用已产出的 `.hex/.axf` 烧录仍按 `tool-flash-keil` 执行。

先读取四类证据，再动手：芯片数据手册、原理图/板级引脚、已验证算法工程、应用资源的 linker/scatter 地址。不能把“AC5 编译通过”描述成硬件已经验证。

## 制作顺序

1. 从已验证 `.FLM` 工程保留 `FlashOS.h`、`FlashDev`、`FlashPrg` 和 `Target.lin` 的接口/链接布局；用 AC5 产生 ELF 后复制为 `.FLM`。
2. 先定义 Keil 虚拟窗口和物理 Flash 窗口，并在 `EraseSector`、`ProgramPage`、`BlankCheck`、`Verify` 的入口统一校验范围和转换地址。
3. FlashDevice 只声明允许的分区；若不是整颗设备的专用算法，不实现 `EraseChip`。W25Qxx 的 4 KiB 擦除与 256 B 物理页写入必须在算法内部处理跨页。
4. 将 GPIO/SPI、延时、W25 指令和轮询保持为独立代码，不链接应用的 HAL、RTOS、日志或业务 Driver。
5. 构建后记录 `.FLM` 路径、AC5 日志、设备几何、导出接口和 SHA-256；再注册到 Keil 的 `ARM/Flash` 目录。

## 固定 Profile：STM32F411 + W25Q64 UI 分区

`profiles/w25q64-ui-3m-stm32f411-pb12-15.json` 定义以下已确认契约：

| 项 | 值 |
| --- | --- |
| GPIO 软件 SPI | PB12 CS、PB13 SCK、PB14 MISO、PB15 MOSI，Mode 0 |
| Keil 可见窗口 | `0x90000000–0x902FFFFF`，3 MiB |
| W25Q64 物理窗口 | `0x300000–0x5FFFFF`，3 MiB |
| 禁止操作 | APP `0x000000–0x0FFFFF`、FlashDB `0x100000–0x1FFFFF`、FatFs `0x200000–0x2FFFFF`、Reserved `0x600000–0x7FFFFF` |

运行：

```powershell
node scripts/validate-flash-algorithm-profile.js `
  --profile skills/tools/tools-flash/references/capabilities/tool-flash-algorithm/profiles/w25q64-ui-3m-stm32f411-pb12-15.json
```

该检查只验证 Profile 的静态安全关系，不替代 AC5 或实板测试。

## 验收闭环

1. AC5 必须零错误、零警告；FlashDevice 的 `DevAdr`、`szDev`、4 KiB sector 几何与 Profile 一致。
2. 离线覆盖首尾地址、跨 256 B 页、跨 4 KiB 扇区，以及四个非 UI 区域的拒绝操作。
3. 实板先备份明确的测试区；经 Keil 擦除、写入、Verify，再由应用的同一硬件总线读回；断电重连后重复读回并恢复备份。
4. 如果资源用于 LVGL，再由实际资源加载路径读取并显示；仅下载成功或驱动字节比对不能替代该证据。
