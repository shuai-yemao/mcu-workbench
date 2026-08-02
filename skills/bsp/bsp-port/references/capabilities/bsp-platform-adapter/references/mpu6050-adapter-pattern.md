---
name: mpu6050-adapter-pattern
description: MPU6050 平台适配模式：5 南向接口注入、中断/DMA 平台映射、Trace 调试。
---

# MPU6050 Adapter 模式

## 5 南向接口注入

```c
typedef struct {
    iic_driver_interface_t *p_iic_driver_instance;
    timebase_interface_t   *p_timebase_instance;
    irq_interface_t        *p_irq_instance;
    dma_interface_t        *p_dma_instance;
    trace_interface_t      *p_trace_instance;
} mpu6050_ops_t;
```

Adapter 层负责把这 5 个抽象接口映射到当前板子的 HAL/RTOS。

## IIC 接口映射

```c
static int32_t mpu6050_adapter_iic_send(uint8_t reg, uint8_t *data, uint16_t len) {
    return HAL_I2C_Mem_Write(&hi2c1, MPU6050_ADDR << 1, reg,
                             I2C_MEMADD_SIZE_8BIT, data, len, 100);
}

static int32_t mpu6050_adapter_iic_receive(uint8_t reg, uint8_t *data, uint16_t len) {
    return HAL_I2C_Mem_Read(&hi2c1, MPU6050_ADDR << 1, reg,
                            I2C_MEMADD_SIZE_8BIT, data, len, 100);
}
```

- 把 HAL 的 `Mem_Write/Mem_Read` 映射为 `pf_send_bytes/pf_receive_bytes`
- 处理寄存器地址 + 数据两段式事务
- 不处理业务协议，只负责总线收发

## Timebase 接口映射

```c
static uint32_t mpu6050_adapter_get_tick_ms(void) {
    return HAL_GetTick();
}

static void mpu6050_adapter_delay_ms(uint32_t ms) {
    osDelay(ms);  // 使用 RTOS 阻塞延时，非裸机忙等
}
```

- 裸机时可用 `HAL_GetTick` + `HAL_Delay`
- RTOS 时改用 `osDelay`，让出 CPU

## IRQ 接口映射

```c
static void mpu6050_adapter_irq_mask(void) {
    HAL_NVIC_DisableIRQ(MPU6050_INT_EXTI_IRQn);
}

static void mpu6050_adapter_irq_unmask(void) {
    HAL_NVIC_EnableIRQ(MPU6050_INT_EXTI_IRQn);
}
```

- 上半部 ISR 中必须 mask EXTI 再启动 DMA
- DMA 完成后再 unmask

## DMA 接口映射

```c
static int32_t mpu6050_adapter_dma_start(uint8_t *buf, uint16_t len) {
    HAL_I2C_Master_Receive_DMA(&hi2c1, MPU6050_ADDR << 1, buf, len);
    return 0;
}

static void mpu6050_adapter_dma_swap_buffers(dma_buffer_t *dma) {
    uint8_t *tmp = dma->write_buffer;
    dma->write_buffer = dma->read_buffer;
    dma->read_buffer = tmp;
}
```

- DMA 启动在 EXTI 关闭期间完成
- 双缓冲指针交换由 ISR 调用
- Adapter 提供平台相关的 DMA 启动函数

## Trace 接口映射

```c
static void mpu6050_adapter_trace_toggle(void) {
    HAL_GPIO_TogglePin(DBG_GPIO_Port, DBG_Pin);
}
```

- 用于逻辑分析仪捕获 ISR 耗时
- 配合 Driver 中的 DWT 周期计数器

## 实例注入示例

```c
mpu6050_ops_t ops = {
    .p_iic_driver_instance = &iic_instance,
    .p_timebase_instance = &timebase_instance,
    .p_irq_instance = &irq_instance,
    .p_dma_instance = &dma_instance,
    .p_trace_instance = &trace_instance,
};

mpu6050_status_t status = mpu6050_inst(&mpu6050_driver, &ops);
if (status != MPU6050_OK) {
    // 处理错误
}
```

## 设计禁区

- Adapter 只映射平台 API，不实现 AHT21/MPU6050 协议
- 不在 Adapter 中做 lifetime 限频或业务回调
- 不隐藏初始化顺序和锁策略
- 临界区内只执行最短的 HAL 调用

## 交付检查

- [ ] 所有南向接口函数非空
- [ ] IIC 发送/接收实现寄存器+数据两段式事务
- [ ] IRQ mask/unmask 配对
- [ ] DMA 启动在 EXTI 关闭期间
- [ ] Trace 接口可用 GPIO 翻转
- [ ] 不依赖具体业务状态
