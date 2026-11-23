# Flash 存储源码证据

## 来源与归属

| 仓库 | 复核 commit | 归属 |
| --- | --- | --- |
| [armink/SFUD](https://github.com/armink/SFUD) | `6b4bef82e6c603b783a17968f1b75da89cc5e2f8` | 器件协议属于 `bsp-hal-driver`；容量、文件和配置 API 属于本 skill |
| [armink/EasyFlash](https://github.com/armink/EasyFlash) | `45d22e238adbabb4a070835fcf0c05673b35ec71` | KV、IAP 和日志存储 |
| [armink/FlashDB](https://github.com/armink/FlashDB) | `8236571f6e29273a16bba62061bf0405e4186878` | KV 和时序数据 |

## 分层调用

```text
APP / Middleware
  → storage public API
  → BSP Wrapper
  → BSP Port
  → SFUD 或具体 hal_driver
  → Core SPI / Flash Controller
  → Vendor Driver
```

SFUD 的 JEDEC/SFDP 探测、读写擦除时序和器件状态机不能放到 `middleware-storage` 主入口；主入口只描述公共存储契约、同步策略、恢复路径和错误映射。

## 验收规则

- 记录 Flash 几何参数、擦除块、写入粒度、对齐要求和寿命预算。
- 掉电测试至少覆盖半写入、索引损坏、重复挂载和版本升级。
- 后台刷写通过 OS Wrapper 的任务/队列完成，禁止在 UI 或中断中阻塞擦除。
- 任何持久化格式变更都要有迁移或回滚方案。
