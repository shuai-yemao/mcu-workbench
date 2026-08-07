---
name: vendor_flashdb
description: Vendor 底座登记：FlashDB 嵌入式 KV/TS 数据库源码与知识，基于 FAL 分区提供掉电安全的键值与时序存储；当用户提到 FlashDB、KVDB、TSDB、fdb_kv_set、fdb_kv_get、blob 读写、掉电持久化、键值存储、时序存储、Flash 数据库时使用。
---

# FlashDB 嵌入式数据库

## 边界

FlashDB 跑在 FAL 分区之上，提供 KVDB（键值数据库）与 TSDB（时序数据库）两种存储语义，负责掉电安全、CRC 校验与 GC 回收。它不直接操作 Flash 芯片——读写擦全部经 FAL 分区转发。

存储介质规划、分区划分与相对偏移属于 FAL；KV/TS 之上的文件系统属于 [`vendor_fatfs`](../vendor_fatfs/SKILL.md)；器件协议属于 [`bsp-hal-driver`](../../bsp/bsp-hal-driver/SKILL.md)。

## 工作流

先确认分区（FAL 中必须有 ≥2 个扇区的 KV 分区），再配置 `fdb_cfg.h`（启用 KVDB/TSDB 与 FAL 模式），然后按"静态声明 KVDB 实例 → 先注入锁 → 再 init"的顺序初始化；真实 Flash 读写必须在任务上下文、调度器启动后执行。

- 数据库对象静态分配（`struct fdb_kvdb` 约 1.2KB），不放任务栈。
- 多任务并发先注入数据库锁（`fdb_kvdb_control`），init 内部也走 lock/unlock，顺序不能反。
- 短字符串用 `fdb_kv_set/get`（内部 128B 缓冲区），二进制/长数据用 `fdb_kv_set_blob/get_blob`。
- 掉电持久化验证时把 `FLASHDB_ERASE_PART_ON_BOOT` 改为 0，断电重启读回。

详细流程与 API 见 [`kvdb-usage.md`](references/kvdb-usage.md)。

## 交接

分区来源交给 [`vendor_fal`](../vendor_fal/SKILL.md)；与 FatFs 等并存时需协调同一根 SPI 总线的并发（FlashDB 数据库锁 + 下层 SPI 总线锁两层缺一不可），文件系统细节交给 [`vendor_fatfs`](../vendor_fatfs/SKILL.md)。
