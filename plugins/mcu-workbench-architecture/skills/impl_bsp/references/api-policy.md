# Driver API 策略

## `instance_only`（默认）

模块级只导出 `bsp_xxx_driver_inst()`。`init/read/write/control/deinit` 必须通过 `bsp_xxx_driver_t` 的 `pf_*` 实例函数表访问；源文件辅助函数使用 `static`。适用于新 Driver、AHT21、W25Qxx 和可替换 Fake 的器件。

## `legacy_event_api`（白名单兼容）

仅当既有应用或 ISR 向量已经依赖一个模块级事件入口时使用。除构造函数外，允许在迁移说明中逐项列出的事件桥接函数；桥接函数不得执行协议读写、持锁回调或队列消费，只能把事件转交给实例/Handle 的 ISR-safe 接口。

使用该策略必须在验收证据中记录：旧符号、调用方、保留期限和删除条件。
