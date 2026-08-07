# FlashDB KVDB 使用与移植指南

> FlashDB 是基于 Flash 的轻量级数据库，通过 FAL 访问 Flash。官方仓库：https://github.com/armink/FlashDB（MIT 许可，FDB_SW_VERSION = 2.2.0）。
>
> 本工程实测链路：FlashDB → FAL → SFUD → SPI → W25Q64。掉电后 KV 数据仍可读回。

## 1. KVDB 与 TSDB 选择

| 数据库 | 全称 | 用途 | 数据形态 |
| ----- | ---- | ---- | ------- |
| KVDB | Key-Value Database | 存"一个键对应一个值" | `"username" -> "firechip"` |
| TSDB | Time Series Database | 按时间顺序存传感器数据 | 带时间戳的日志流 |

KVDB 与 TSDB **不能共用同一个 FAL 分区**，需另行划分区。

## 2. 配置（fdb_cfg.h）

`Middlewares/FlashDB/port/fdb_cfg.h` 是板级裁剪点（靠 include 路径被 `flashdb.h` 的 `#include <fdb_cfg.h>` 命中）：

```c
#define FDB_USING_KVDB           /* 启用 KVDB（键值数据库） */
#define FDB_USING_TSDB           /* 启用 TSDB（可只编译不初始化） */
#define FDB_USING_FAL_MODE       /* 存储走 FAL：FAL → SFUD → SPI → W25Q64 */
#define FDB_WRITE_GRAN  1        /* W25Q64 为 NOR flash，写粒度取 1 */
/* #define FDB_BIG_ENDIAN */     /* STM32 小端，无需定义 */
/* #define FDB_DEBUG_ENABLE */   /* 勿开：每个日志点嵌入 __FILE__ 完整路径会膨胀 .rodata */
```

## 3. 初始化顺序（关键）

```c
static struct fdb_kvdb s_kvdb;                 /* 静态分配，约 1.2KB，勿放任务栈 */

static void flashdb_lock(fdb_db_t db)          /* 数据库层加锁回调 */
{
    (void)db;
    (void)osal_mutex_take(s_flashdb_mutex, OSAL_MAX_DELAY);
}
static void flashdb_unlock(fdb_db_t db)
{
    (void)db;
    (void)osal_mutex_give(s_flashdb_mutex);
}

void flashdb_test_entry(void)
{
    fdb_err_t err;
    struct fdb_blob blob;
    uint8_t wbuf[64], rbuf[64];

    /* 1. 先注入锁，再 init（init 内部也要走加锁/解锁） */
    fdb_kvdb_control(&s_kvdb, FDB_KVDB_CTRL_SET_LOCK,   (void *)flashdb_lock);
    fdb_kvdb_control(&s_kvdb, FDB_KVDB_CTRL_SET_UNLOCK, (void *)flashdb_unlock);

    /* 2. 初始化 KVDB：name=数据库名，path=FAL 分区名 */
    err = fdb_kvdb_init(&s_kvdb, "fdb_kvdb", "fdb", NULL, NULL);

    /* 3. KV 读写 */
    fdb_kv_set(&s_kvdb, "username", "firechip");
    const char *value = fdb_kv_get(&s_kvdb, "username");

    /* 4. blob 二进制读写 */
    fdb_kv_set_blob(&s_kvdb, "calib", fdb_blob_make(&blob, wbuf, sizeof(wbuf)));
    size_t rlen = fdb_kv_get_blob(&s_kvdb, "calib", fdb_blob_make(&blob, rbuf, sizeof(rbuf)));
}
```

### 初始化要点

- `fdb_kvdb_init(db, name, path, default_kv, user_data)`：`path` 必须是 FAL 分区表中存在的分区。
- 分区要求：至少能放 **2 个扇区**（扇区状态机要求——USING 写满后 GC 需要一个空闲扇区做迁移目标）。
- 返回值 `FDB_NO_ERR`（0）成功；其他值多为分区不存在或分区过小。
- 销毁：`fdb_kvdb_deinit(&s_kvdb)`；常驻、掉电不销毁的场景可不调用。

## 4. KV 读写 API

### 字符串

```c
fdb_err_t fdb_kv_set(fdb_kvdb_t db, const char *key, const char *value);
char *fdb_kv_get(fdb_kvdb_t db, const char *key);      /* 只读，勿改写 */
fdb_err_t fdb_kv_del(fdb_kvdb_t db, const char *key);
void fdb_kv_print(fdb_kvdb_t db);                       /* 调试打印全部 KV */
```

- 键名最长 64 字节（`FDB_KV_NAME_MAX`）。
- 写同一个键就是覆盖更新，旧值变垃圾，由 GC 自动回收。
- `fdb_kv_get` 内部用 **128 字节**静态缓冲区（`FDB_STR_KV_VALUE_MAX_SIZE`），字符串值超过约 120B 就读不全，改用 blob 接口。

### blob（二进制 / 长数据）

```c
fdb_blob_t fdb_blob_make(fdb_blob_t blob, const void *value_buf, size_t buf_len); /* 只记录指针+长度，不拷贝 */
fdb_err_t fdb_kv_set_blob(fdb_kvdb_t db, const char *key, fdb_blob_t blob);
size_t   fdb_kv_get_blob(fdb_kvdb_t db, const char *key, fdb_blob_t blob);          /* 返回实际读到的字节数 */
```

用法："先按最大长度构造，再拿返回值判断"，如 `rlen == sizeof(wbuf) && memcmp(wbuf, rbuf, sizeof(wbuf)) == 0`。

| 场景 | 用哪个 |
| ---- | ----- |
| 短字符串（<128B） | `fdb_kv_set` / `fdb_kv_get` |
| 二进制 / 长字符串 | `fdb_kv_set_blob` / `fdb_kv_get_blob` |

## 5. 线程安全：两层锁

| 锁 | 在哪一层 | 保护什么 |
| -- | ------- | -------- |
| 数据库锁（`s_flashdb_mutex`） | FlashDB 层 | 多个任务对同一 DB 的并发操作（set_kv 复合操作逻辑原子） |
| SPI 总线锁（`s_port_mutex`） | SFUD/Port 层 | 多个中间件对同一物理 SPI 的命令时序（单次事务物理原子） |

- 数据库锁通过 `fdb_kvdb_control(SET_LOCK/SET_UNLOCK)` 注入。
- SPI 总线锁由 SFUD 在每次读写擦前自动 take、之后 give，桥接到工程共享互斥锁。
- 两者职责不同、缺一不可：数据库锁防逻辑状态交错，SPI 锁防物理字节流交错。删掉任一锁都会导致偶发数据损坏。
- 只有一个任务碰 FlashDB 时不注入锁也能跑，但建议始终注入。

## 6. 掉电安全原理（追加写 + 扇区状态机）

- KV 节点带 CRC（name+value 校验和）与写入状态表（0xFF→…→0x00，掉电可判读到哪一步）。
- 更新 key 是**追加写**：旧节点标记废弃，新节点写新位置。掉电时无论掉在哪字节，重启重扫靠"状态表判读到哪一步 + CRC 判数据完整性"，半截节点直接作废，不会破坏旧值。
- GC：写不下时选最脏扇区，把有效 KV 逐个迁到空闲扇区再擦除。分区大 = 空闲扇区多 = GC 缓冲足 = 高频更新几乎不触发回收。

## 7. 掉电持久化验证

1. 把测试线程顶部宏改为 0：`#define FLASHDB_ERASE_PART_ON_BOOT 0`（默认 1，每次上电先擦空分区保证确定性）。
2. 烧录运行一次写入 KV/blob，看到 `FlashDB Test PASS`。
3. **断电重新上电**（不重新烧录），RTT 应看到 KV 直接读回成功——数据还在 Flash 里。

## 8. 任务上下文约束

- 建锁与建线程可在调度器启动前完成，但**真实 Flash 读写必须在任务线程内、调度器启动后**执行（SFUD 的 SPI 锁 take 依赖调度器已运行）。
- `fdb_kv_del` 后立即写回大量数据可能触发 GC 擦扇区，耗时较长，不要放在时间敏感的中断里。
- TSDB 初始化需要"取当前时间"回调，且要单独分区；未初始化就不调用 `fdb_tsl_append`。

## 9. 常见问题

| 现象 | 根因 | 解决 |
| ---- | ---- | ---- |
| `fdb_kvdb_init` 返回非 0 | path 分区不存在 / 分区 <2 扇区 | 检查 `fal_cfg.h` 分区表与分区大小 |
| init 正常但并发乱序 | 锁没在 init 之前注入 | 先 `fdb_kvdb_control(SET_LOCK/SET_UNLOCK)` 再 init |
| 读长字符串被截断 | 字符串值超过 128B，`fdb_kv_get` 缓冲区不够 | 改用 blob 接口 |
| 编译过但任务卡死 | 调度器前同步做 FlashDB 读写 | 读写移到任务线程内、调度器启动后 |
| 频繁删写后变慢 | 垃圾多，GC 在擦扇区 | 正常现象；避免高频写同一键，可间隔写入 |
| `Cannot open source input file fdb_cfg.h` | include 路径没指向 port 目录 | 确认 `Middlewares/FlashDB/port` 在 include 路径最前 |
| 改了 fdb_cfg.h 没反应 | include 命中了官方模板而非 port 版 | 确认 port 目录在最前 |
| 数据偶发损坏 | SPI 锁被删，总线事务交错 | 恢复 SPI 总线锁；两层锁缺一不可 |
| 小分区高频更新很慢 | 写不下触发 GC → 阻塞重试 | 扩大 fdb 分区提供 GC 缓冲 |

## 10. 验收

- KV 字符串 set/get 一致（`username -> firechip`）。
- blob 写读回 memcmp 一致。
- 掉电断电重启后数据仍在（`FLASHDB_ERASE_PART_ON_BOOT=0`）。
- 多任务并发读写不损坏数据（两层锁生效）。
- 可打印 `fdb_kv_print` 查看全部键值，或经 J-Link mem32 读全局观测变量（如 `g_flashdb_init_result`）。

## 参考资料

- FlashDB 官方仓库：https://github.com/armink/FlashDB
- FlashDB 官方文档（zh_CN）：https://armink.github.io/FlashDB/#/zh-cn/
- KVDB 使用说明（zh_CN）：https://armink.github.io/FlashDB/#/zh-cn/zh-cn-kvdb
- TSDB 使用说明（zh_CN）：https://armink.github.io/FlashDB/#/zh-cn/zh-cn-tsdb
- 底层分区与设备：`middleware-fal` skill
