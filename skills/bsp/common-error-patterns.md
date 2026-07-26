---
name: common-error-patterns
description: BSP 层跨 skill 通用错误处理模式与调试教训汇总。
---

# 通用错误处理模式

## 枚举返回值禁止魔数比较

```c
// ❌ 错误：把返回的状态码和 ID 比较
if (0x38 != aht21_read_id(self)) { ... }

// ✅ 正确：用状态码常量
if (AHT21_OK != aht21_read_id(self)) { ... }
```

- `aht21_read_id` 返回 `aht21_status_t`，不是 ID 值
- 读 ID 应返回两个值：状态码 + ID 输出参数

## 协议专用接口

通用接口无法覆盖所有协议事务时，增加专用函数指针：

```c
// AHT21 状态读取需要两段式事务：写 0x71 + stop + 新 start + 读
iic_driver_interface_t ops = {
    .pf_send_bytes = ...,
    .pf_receive_bytes = ...,       // repeated start 通用读
    .pf_read_status = ...,         // 专用两段式读
};
```

## 严格时序

| 场景 | 最小等待 | 来源 |
|------|---------|------|
| AHT21 上电 | ≥100ms | 数据手册 |
| AHT21 测量 | ≥80ms | 数据手册 |
| W25Qxx 页编程 | ~3ms | 忙状态 |
| W25Qxx 扇区擦除 | ~3s | 忙状态 |

- 设置最大超时，避免永久阻塞
- 轮询使用 `pf_get_tick_ms` 而非硬延时
- 裸机时每次轮询可让出 CPU

## 初始化失败回滚

```c
status = init_phase1(self);
if (status != OK) { goto cleanup; }
status = init_phase2(self);
if (status != OK) { goto cleanup; }
return OK;

cleanup:
    pf_deinst(self);  // 逐层释放
    return status;
```

## 反初始化顺序

```c
// 正确：先释放 OS 资源，再解绑指针
self->is_inited = NOT_INITED;
pf_os_thread_delete(self->thread);
pf_os_queue_delete(self->queue);
pf_os_sem_delete(self->sem);
self->p_ops = NULL;

// 错误：先解绑指针，OS 资源还在运行
self->p_ops = NULL;  // 线程可能还在访问！
```

## 低功耗编排

```c
// ✅ 正确：先初始化外设，最后设置低功耗
board_init();
drv_adapter_disp_register();
pwr_mgmt_mode_set(SLEEP_MODE);

// ❌ 错误：先低功耗再初始化
pwr_mgmt_mode_set(SLEEP_MODE);
drv_adapter_disp_register();  // 寄存器写入后时钟被关闭
```

## NVM 空间不足

- 非易失存储空间设太小 → 绑定信息被覆盖
- 协议栈报错"加密失败"或"配置丢失"
- 实际根因是"存储满了"
- 事前规划存储布局，留足余量

## 任务栈预算

```text
最小栈 = 业务栈 + 上下文保存(~200B 含 FPU) + 日志格式化预留
安全系数 = 2
```

- `elog`/printf 的 `vsnprintf` 栈开销大
- DEBUG 宏改变执行路径，可能使低栈任务意外调用日志

## 分层锁

| 锁 | 保护对象 | 持锁时长 |
|----|---------|---------|
| Handler 临界区 | 实例组数组 | 微秒级 |
| Driver 互斥锁 | I2C/SPI 总线 | 毫秒级 |

- 不可合并为一层锁
- 合并后 Handler 遍历实例组时持锁等待 80ms → 注册传感器被阻塞

## 回调外调

```c
enter_critical(self);
self->latest_data = data;
callback = self->pf_callback;
exit_critical(self);

if (callback) callback(&data);  // 在临界区外
```

防止用户回调中再次调 Handler API 导致死锁。

## 三级验证闭环

```
Mock 命令序列测试 → 真实板 RTT 日志 → 逻辑分析仪波形
```

- 三层结论必须交叉验证
- 复杂环境通过不代表简单环境通过
- 反之亦然

## FromISR API

- ISR 中只调用带 `FromISR` 后缀的 FreeRTOS API
- 禁止 `printf`/`elog`/`delay`/`malloc`

## 写使能锁

W25Qxx 每次页编程/擦除前必须发送 `0x06`：

```c
w25qxx_write_enable(self);
spi_write(page_program_cmd);
w25qxx_wait_busy(self);
```

## CRC 失败即拒

AHT21 读取 7 字节后：

```c
if (crc8(data, 6) != data[6]) {
    return AHT21_ERRORCRC;
}
```

不将损坏数据继续向上传递换算。

## 调试宏副作用

```c
#define DEBUG_AHT21 1
```

开启后会在低栈任务中执行 `elog`，可能触发栈溢出。

## 常见根因对照表

| 现象 | 可能根因 |
|------|---------|
| 自检超时 | 高优先级任务不阻塞，低优先级 Handler 线程饿死 |
| HardFault | 任务栈不足、上下文保存 ~200B、elog 栈开销 |
| 数据全 0xFF | SPI/I2C 通信失败、CS 未拉低、地址错误 |
| 配置丢失 | NVM 空间不足被覆盖 |
| 静默故障 | 低功耗在初始化前设置 |
| 死锁 | 回调在临界区内调用 |
| I2C 状态读错 | repeated start vs 两段式事务 |
