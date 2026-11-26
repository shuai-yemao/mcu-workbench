# FAL 分区表与设备注册指南

> FAL（Flash Abstraction Layer）提供统一的 Flash 分区视图。上层（FlashDB KVDB、FatFs、OTA）通过"分区名 + 分区内相对偏移"读写，物理地址由 FAL 换算。
>
> 官方仓库：https://github.com/armink/fal（MIT 许可，FAL_SW_VERSION = 1.0.0）
>
> 适用平台：STM32 / ESP32 等所有可接 NOR/SPI Flash 的 MCU。

## 1. 分层调用链

```text
应用层     FlashDB / FatFs / OTA
             │  fal_partition_find("fdb") → 分区内相对 addr
             ▼
FAL        fal_partition.c   fal_partition_find/read/write/erase
             │  相对地址换算: part->offset + addr
             ▼
FAL port   fal_flash_sfud_port.c   w25qxx_fal_init/read/write/erase
             │  ops 指向 SFUD（本层默认不加锁，靠下层 SFUD 内部锁）
             ▼
SFUD       sfud_read / sfud_write / sfud_erase
             ▼
SPI Port   GPIO 位带软件 SPI 或硬件 SPI（W25Q64 等）
```

每层只做一件事：FAL 提供分区概念并屏蔽具体 Flash；SFUD 处理 JEDEC 识别、页编程、扇区擦除；SPI Port 负责字节收发。

## 2. 分区表配置（fal_cfg.h）

`Middlewares/FAL/port/fal_cfg.h` 是分区表唯一事实来源：

```c
#define NOR_FLASH_DEV_NAME  "norflash0"

#define FAL_FLASH_DEV_TABLE \
{                           \
    &nor_flash0,            \
}

#define FAL_PART_HAS_TABLE_CFG
#define FAL_PART_TABLE                                                          \
{                                                                               \
    {FAL_PART_MAGIC_WORD,      "app", NOR_FLASH_DEV_NAME,                      0,           512UL*1024, 0}, \
    {FAL_PART_MAGIC_WORD, "download", NOR_FLASH_DEV_NAME,               512UL*1024,           512UL*1024, 0}, \
    {FAL_PART_MAGIC_WORD,      "log", NOR_FLASH_DEV_NAME,         1UL*1024UL*1024,     1UL*1024UL*1024, 0}, \
    {FAL_PART_MAGIC_WORD, "lvgl_res", NOR_FLASH_DEV_NAME,         2UL*1024UL*1024,     3UL*1024UL*1024, 0}, \
    {FAL_PART_MAGIC_WORD,    "fatfs", NOR_FLASH_DEV_NAME,         5UL*1024UL*1024,     1UL*1024UL*1024, 0}, \
    {FAL_PART_MAGIC_WORD,      "fdb", NOR_FLASH_DEV_NAME,         6UL*1024UL*1024,           512UL*1024, 0}, \
    {FAL_PART_MAGIC_WORD,    "rsvd", NOR_FLASH_DEV_NAME, 6UL*1024UL*1024 + 512UL*1024,   1536UL*1024, 0}, \
}
```

8MB W25Q64 示例分区规划（合计 0x800000，各分区 4KB 对齐）：

| 分区名 | 偏移 | 大小 | 用途 |
| ------ | ---- | ---- | ---- |
| `app` | 0x00000000 | 512KB | OTA 主区 |
| `download` | 0x00080000 | 512KB | OTA 下载槽 |
| `log` | 0x00100000 | 1MB | 日志循环区 |
| `lvgl_res` | 0x00200000 | 3MB | LVGL 资源下载 |
| `fatfs` | 0x00500000 | 1MB | FATFS |
| `fdb` | 0x00600000 | 512KB | FlashDB KV 存储 |
| `rsvd` | 0x00680000 | 1.5MB | 保留 |

### 分区表约束（规划者自查）

1. **不越界**：`offset + len ≤ 设备容量`，初始化时 FAL 校验并拒绝越界分区。
2. **不重叠**：各分区首尾相接、互不交叉。**FAL 不查重叠，这是规划者的责任**——改一个分区必须联动邻接分区（例如扩 `fdb` 512K→1M 时，`rsvd` 的 offset 要前移到新末尾、len 相应收缩）。
3. **读写边界**：每次操作校验 `addr + size ≤ part->len`。

## 3. Flash 设备注册（fal_flash_sfud_port.c）

`nor_flash0` 实例提供 init/read/write/erase 四个 ops：

```c
struct fal_flash_dev nor_flash0 = {
    .name       = NOR_FLASH_DEV_NAME,
    .addr       = 0,
    .len        = 0,                        /* 运行时由 init 填充 */
    .blk_size   = 4096UL,                   /* 4KB 擦除粒度 */
    .ops        = {
        .init   = w25qxx_fal_init,
        .read   = w25qxx_fal_read,
        .write  = w25qxx_fal_write,
        .erase  = w25qxx_fal_erase,
    },
    .write_gran = 1,                        /* NOR flash */
};
```

关键点：

- `.len` 和 `.blk_size` 在 `w25qxx_fal_init` 里运行时从下层驱动填充（如 `chip.capacity` / `chip.erase_gran`），同一套代码兼容 W25Q32/W25Q64/W25Q128。
- `w25qxx_fal_erase` 先把偏移/长度对齐到整 4KB 再调擦除，规避尾部不足粒度少擦的问题。
- `FAL_PORT_USE_MUTEX` 默认 0：若下层 SFUD 已串行化（内部 lock/unlock），本层不加锁，避免多把锁抢同一根 SPI 总线。

## 4. 初始化（两步）

```c
fal_flash_init();        /* 1. 挂载 Flash 设备 */
fal_partition_init();    /* 2. 从静态表 FAL_PART_TABLE 构建分区数组 */
```

上层使用：

```c
const struct fal_partition *part = fal_partition_find("fdb");
fal_partition_read(part, 0, buf, len);      /* 分区内相对偏移 */
fal_partition_write(part, 0, data, len);
fal_partition_erase(part, 0, size);
```

## 5. 链接脚本：保留静态分区表

`FAL_PART_TABLE` 放在自定义 section `FalPartTable`（const）。若不开 `--gc-sections` 会一直保留；开启后必须显式 KEEP：

```ld
  /* FAL partition table — 静态分区表（const），显式 KEEP 防 --gc-sections 裁剪 */
  .fal_part_table :
  {
    KEEP(*(FalPartTable))
  }
```

否则 `fal_partition_find()` 永远返回 NULL。

## 6. 常见问题

| 现象 | 根因 | 解决 |
| ---- | ---- | ---- |
| `fal_partition_find("fdb")` 返回 NULL | 分区表被 `--gc-sections` 裁掉 | 链接脚本 `KEEP(*(FalPartTable))` |
| 初始化通过但写 A 分区破坏 B 分区数据 | 改分区只改 len、没联动邻接分区 offset，两分区重叠 | 规划者自查"首尾相接"；FAL 只查越界不查重叠 |
| 越界分区被初始化拒绝 | `offset + len > 设备容量` | 修正分区表偏移/长度 |
| 换更大容量芯片读不到数据 | port 层容量写死 | `.len` 运行时从下层驱动填充，重规划 `fal_cfg.h` 分区表即可 |
| 上层读写慢 | 软 SPI 位带逐 bit 翻转 | 性能敏感换硬件 SPI 或 DMA |

## 7. 验收

- `fal_init()` 成功且分区识别数量与表一致。
- `fal_partition_find()` 能定位到每个分区。
- 对某分区写数据，越界/重叠检查能拦截错误规划。
- 打开 `--gc-sections` 后分区表仍被 KEEP，`fal_partition_find()` 不返回 NULL。

## 参考资料

- FAL 官方仓库：https://github.com/armink/fal
- 依赖的下层驱动 SFUD：https://github.com/armink/SFUD
- 上层 KV 存储 FlashDB：https://github.com/armink/FlashDB
