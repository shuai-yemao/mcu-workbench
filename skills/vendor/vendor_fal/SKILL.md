---
name: vendor_fal
description: Vendor 底座登记：FAL（Flash Abstraction Layer）源码与知识——分区表、Flash 设备 ops 注册、相对偏移寻址；当用户提到 FAL、flash 分区、分区表、fal_cfg.h、fal_partition_find、FlashDB/FatFs 底层分区、Flash 抽象层时使用。
---

# FAL Flash 抽象层

目标工程物理落位：`05_Vendor/vendor_middleware/fal/`。只保留项目实际使用的 FAL 源码、移植配置和许可证；由目标工程 Git 管理，不在插件仓库复制 Vendor 实现。

## 边界

向上为 FlashDB、FatFs、OTA 等提供"分区名 + 分区内相对偏移"的存储视图；向下把具体 Flash 芯片（经 SFUD 等驱动）封装成 `ops` 函数指针，屏蔽芯片型号与物理地址。Service、App 和 Platform 公共头不得直接 include FAL 头，接入链路固定为 `platform_middleware` → `impl_middleware` → `05_Vendor/vendor_middleware/fal/`。

分区表的物理位置、容量与归属是"单一事实来源"：上层只认分区名与相对偏移，不持有绝对物理地址。FAL 只负责"名字 → 偏移/长度"映射与相对地址换算，不实现 KV 语义、文件格式或器件协议。

## 工作流

先规划分区表（确定设备容量、分区边界、4KB 对齐与不重叠约束），再注册 Flash 设备 ops，最后执行 `fal_init()` 两步初始化并让上层通过 `fal_partition_find()` 获取分区句柄。

- 分区规划：静态表 `FAL_PART_TABLE`，只查"不越界"，重叠由规划者自查（改一个分区必须联动邻接分区）。
- 设备注册：`fal_flash_sfud_port.c` 提供 init/read/write/erase 四个 ops，容量与擦除粒度运行时从下层驱动填充，兼容同系列不同容量芯片。
- 相对寻址：上层传分区内 `addr`，FAL 内部换算 `part->offset + addr` 为物理地址。
- 链接脚本需 `KEEP(*(FalPartTable))`，防止 `--gc-sections` 裁掉静态分区表。

详细流程见 [`fal-partition-porting.md`](references/fal-partition-porting.md)。

## 交接

分区之上的 KV/TS 存储交给 [`vendor_flashdb`](../vendor_flashdb/SKILL.md)，文件系统交给 [`vendor_fatfs`](../vendor_fatfs/SKILL.md)；具体 Flash 芯片的 JEDEC 识别与读写擦时序属于 [`vendor_fatfs`](../vendor_fatfs/SKILL.md) 的 SFUD 能力或 [`bsp-hal-driver`](../../impl/impl_bsp/SKILL.md)，FAL 不直接实现器件协议。
