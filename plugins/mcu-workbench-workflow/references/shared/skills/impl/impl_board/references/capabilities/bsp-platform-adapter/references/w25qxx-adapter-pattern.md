---
name: w25qxx-adapter-pattern
description: W25Qxx 平台适配模式：SPI 依赖注入、模拟 SPI、CS 独立管理、时基映射。
---

# W25Qxx Adapter 模式

## 南向接口

```c
typedef struct {
    spi_driver_interface_t *p_spi_driver_instance;
    timebase_interface_t   *p_timebase_instance;
} w25qxx_ops_t;
```

W25Qxx 没有中断引脚，所有操作都是主机主动发起，因此只需要 SPI 和 Timebase。

## 硬件 SPI 映射

```c
static void w25qxx_adapter_spi_cs_enable(void) {
    HAL_GPIO_WritePin(W25QXX_CS_GPIO_Port, W25QXX_CS_Pin, GPIO_PIN_RESET);
}

static void w25qxx_adapter_spi_cs_disable(void) {
    HAL_GPIO_WritePin(W25QXX_CS_GPIO_Port, W25QXX_CS_Pin, GPIO_PIN_SET);
}

static int32_t w25qxx_adapter_spi_send(uint8_t *data, uint16_t len) {
    return HAL_SPI_Transmit(&hspi1, data, len, 100);
}

static int32_t w25qxx_adapter_spi_receive(uint8_t *data, uint16_t len) {
    return HAL_SPI_Receive(&hspi1, data, len, 100);
}

static int32_t w25qxx_adapter_spi_send_receive(uint8_t *tx, uint8_t *rx, uint16_t len) {
    return HAL_SPI_TransmitReceive(&hspi1, tx, rx, len, 100);
}
```

- CS 独立管理：发送/接收前后显式 enable/disable
- 同一 SPI 总线可挂载多个设备，通过不同 CS 切换

## 模拟 SPI 映射

当硬件 SPI 不够或引脚受限时，用 GPIO 模拟 SPI Mode 0。

```c
static uint8_t w25qxx_adapter_soft_spi_rw(uint8_t data) {
    for (uint8_t i = 0; i < 8; i++) {
        if (data & 0x80) MOSI_HIGH(); else MOSI_LOW();
        delay_1us();
        SCK_HIGH();              // 上升沿采样
        delay_1us();
        data <<= 1;
        if (MISO_READ()) data |= 1;
        SCK_LOW();
    }
    return data;
}
```

| 引脚 | 模式 | 说明 |
|------|------|------|
| MOSI | 推挽输出 | 主机发送 |
| SCK | 推挽输出 | 时钟 |
| CS | 推挽输出 | 片选 |
| MISO | 浮空输入 | 主机接收 |

- CPOL=0（空闲低），CPHA=0（上升沿采样）
- 1μs 约 500kHz，适合 W25Qxx
- 不能在 ISR 或临界区中调用

## Timebase 映射

```c
static uint32_t w25qxx_adapter_get_tick_ms(void) {
    return HAL_GetTick();
}

static void w25qxx_adapter_delay_ms(uint32_t ms) {
    HAL_Delay(ms);  // 裸机
    // osDelay(ms); // RTOS 时
}
```

- W25Qxx 操作需要毫秒级阻塞延时
- 页编程 ~3ms，扇区擦除 ~3s
- 建议在 Handler 层用后台线程异步执行

## 实例注入示例

```c
spi_driver_interface_t spi_instance = {
    .pf_cs_enable = w25qxx_adapter_spi_cs_enable,
    .pf_cs_disable = w25qxx_adapter_spi_cs_disable,
    .pf_send = w25qxx_adapter_spi_send,
    .pf_receive = w25qxx_adapter_spi_receive,
    .pf_send_receive = w25qxx_adapter_spi_send_receive,
};

timebase_interface_t timebase_instance = {
    .pf_get_tick_ms = w25qxx_adapter_get_tick_ms,
    .pf_delay_ms = w25qxx_adapter_delay_ms,
};

w25qxx_ops_t ops = {
    .p_spi_driver_instance = &spi_instance,
    .p_timebase_instance = &timebase_instance,
};

w25qxx_status_t status = w25qxx_inst(&w25qxx_driver, &ops);
```

## 模拟 SPI 与硬件 SPI 切换

```c
#if defined(W25QXX_USE_SOFT_SPI) && (W25QXX_USE_SOFT_SPI == 1)
    // 绑定 soft_spi 函数
#else
    // 绑定 HAL SPI 函数
#endif
```

## 设计禁区

- 不在 Adapter 中实现 Flash 协议（写使能、页对齐、忙等待）
- 不合并 CS 控制到 SPI 收发函数中
- 不在 ISR 中调用模拟 SPI（阻塞且依赖 CPU 循环）
- 不隐藏阻塞时序

## 交付检查

- [ ] CS enable/disable 独立且配对
- [ ] SPI 收发实现 MSB first
- [ ] 模拟 SPI Mode 0 时序正确
- [ ] Timebase 提供毫秒级延时和 tick
- [ ] 所有阻塞 API 有 ISR 调用警告注释
- [ ] 支持硬件 SPI 和模拟 SPI 切换
