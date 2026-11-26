---
name: mpu6050-handler-pattern
description: 高频 IMU Handler 模式：单消费者消息队列、ISR 桥接、lifetime 限频、DMA 帧处理。
---

# MPU6050 Handler 模式

## 设计目标

- 将 ISR 中的高频数据采集与线程中的解码/回调分离
- 单实例或多实例 IMU 统一管理
- lifetime 限频，避免上层被 8kHz 数据淹没

## 消息队列统一调度

```c
typedef enum {
    IMU_HANDLER_MESSAGE_READ_EVENT,
    IMU_HANDLER_MESSAGE_DMA_FRAME
} imu_handler_message_type_t;

typedef struct {
    imu_handler_message_type_t type;
    union {
        imu_handler_read_event_t read_event;
        imu_handler_dma_frame_t  dma_frame;
    } payload;
} imu_handler_message_t;
```

- 一条队列、一个永久阻塞点 `pf_os_queue_get(WAIT_FOREVER)`、一个 `switch(type)`
- 天然无锁，无需互斥量
- DMA ISR 和应用任务的投递在同一队列串行化

## 实例注册与双向引用

```c
typedef struct {
    void *instance;              // 指向 Driver 实例
    imu_sensor_ops_t *ops;       // 通用操作表
    bsp_imu_handler_t *handler;  // 回指 Handler
    uint32_t instance_index;
} imu_sensor_node_t;
```

- ISR 中通过 `context → node → handler` 链找到正确队列
- 注册时线性扫描 `instance_group` 防重复
- 最大实例数由数组大小限定

## ISR 桥接函数

```c
uint32_t bsp_imu_handler_dma_notify_from_isr(const uint8_t *const frame,
                                             uint32_t size,
                                             void *const context) {
    imu_sensor_node_t *node = (imu_sensor_node_t *)context;
    imu_handler_message_t msg;
    msg.type = IMU_HANDLER_MESSAGE_DMA_FRAME;
    memcpy(msg.payload.dma_frame.frame, frame, size);
    xQueueSendFromISR(node->handler->queue, &msg, &hpw);
    return hpw;
}
```

- 帧使用固定大小数组，ISR 中禁止 `malloc`
- 只做复制和队列投递
- 不解码、不读时间戳、不打日志、不调回调

## lifetime 限频

```c
elapsed = timestamp_ms - self->dma_last_process_time[node->instance_index];
if (IMU_HANDLER_DMA_TIMESTAMP_INVALID != self->dma_last_process_time[node->instance_index] &&
    elapsed < IMU_HANDLER_DMA_LIFETIME_MS) {
    return IMU_HANDLER_OK;  // 跳过不解码
}
self->dma_last_process_time[node->instance_index] = timestamp_ms;
```

- 默认 50ms（8kHz → 20Hz）
- 每实例独立计时
- 首次帧永远处理（初始值 INVALID）

## 临界区 + 回调外调

```c
imu_handler_enter_critical(self);
self->latest_data = data;
data_callback    = self->pf_data_callback;
callback_context = self->p_data_callback_context;
imu_handler_exit_critical(self);

if (NULL != data_callback) {
    data_callback(&self->latest_data, callback_context);
}
```

- 临界区内只写数据和快照指针
- 回调在临界区外调用，防止死锁
- 用户回调可能再次调用 Handler API

## OS_SUPPORTING 条件编译

| OS_SUPPORTING=1 | OS_SUPPORTING=0 |
|---|---|
| 信号量 + 队列 + 线程 | 无 OS 资源 |
| DMA 路径可用 | DMA 路径不可用 |
| 适合连续采集 | 适合裸机轮询 |

## 三段式退出

1. 设 `is_inited = NOT_INITED` → 阻止新消息投递
2. `pf_os_task_notify_give` 唤醒阻塞线程
3. 线程自然 `break` → `return`
4. 删除线程 → 删除队列 → 删除信号量

**禁止**：先 `pf_os_thread_delete` 强杀线程，再释放资源。

## 任务栈预算

```text
Handler 线程最小栈 = 业务栈(150~200B) + 上下文保存(~200B 含 FPU)
                     + 日志格式化预留(100~150B) + 安全系数 2
                   ≈ 1024B
```

- 上下文切换开销常被忽略
- DEBUG 宏在低栈任务中调用 elog 极易溢出

## 设计禁区

- 不在 Handler 中重复 I2C/SPI 协议
- 不把 Driver 错误直接当作 Handler 成功
- 不在临界区内调用户回调
- ISR 中不 `malloc`、不打日志

## 交付检查

- [ ] 一条队列、单消费者、无锁
- [ ] ISR 只做复制 + 队列投递
- [ ] lifetime 按实例独立计时
- [ ] 回调在临界区外调用
- [ ] 退出时线程自然退出后再删资源
- [ ] 任务栈 ≥ 1024B（含 FPU）
