# Core IIC 双后端案例

## 证据范围

固定源码：`shuai-yemao/stm32f411ceu6_freertos_transplant` 的 `Sensor_temp_humi` 分支，提交 `eb5f38b3acb55063b6a3e2777aae2fb983cda8bf`。

关键路径：

- `Bsp/Borad_drive/Sensor_temp_humi/iic/Inc/bsp_gpio_iic.h`
- `Bsp/Borad_drive/Sensor_temp_humi/iic/Src/bsp_gpio_iic.c`
- `Bsp/Porting/drv_adapter_port_temp_humi/Src/drv_adapter_port_temp_humi.c`

## 源码观察

`bsp_gpio_iic` 通过 `iic_gpio_ops_t` 注入 GPIO read/write/init 和微秒延时，已经把位时序与 STM32 HAL 解耦。这是可复用的总线后端，不是 AHT21 器件协议，因此名称和目录虽带 `bsp`，通用归属应为 Core Software IIC。

当前 BSP Port 又同时实现 GPIO/DWT 软件 IIC绑定和 `HAL_I2C_Master_Transmit/Receive` 硬件 IIC绑定，并把 start/stop/ack 暴露给器件 Driver。结果是 Port 承担了总线实现，Driver 也感知软件 IIC细节。

## 目标接口

```c
typedef struct {
  int32_t (*write)(void *context, uint16_t address,
                   const uint8_t *data, size_t size,
                   uint32_t timeout_ms);
  int32_t (*read)(void *context, uint16_t address,
                  uint8_t *data, size_t size,
                  uint32_t timeout_ms);
  int32_t (*mem_write)(void *context, uint16_t address,
                       uint32_t memory_address, uint8_t address_width_bits,
                       const uint8_t *data, size_t size,
                       uint32_t timeout_ms);
  int32_t (*mem_read)(void *context, uint16_t address,
                      uint32_t memory_address, uint8_t address_width_bits,
                      uint8_t *data, size_t size,
                      uint32_t timeout_ms);
} core_iic_ops_t;
```

公共接口还可按真实能力提供 init/deinit、DMA 和状态查询，但必须明确超时单位和缓冲区生命周期。`I2C_HandleTypeDef`、`GPIO_TypeDef`、START/STOP/ACK、SDA 方向切换均不得进入公共头。

## 后端与锁

```text
Core IIC Bus
├─ Hardware Backend → HAL/LL/CMSIS controller calls
└─ Software Backend → Core GPIO Ops + microsecond timebase
```

- Core Bus 实例选择后端并统一错误语义。
- Software Backend 私有实现位时序；Hardware Backend 不再提供空的 ACK/START 函数。
- 跨设备共享总线锁属于 Core Bus，可使用 `osal_mutex_*` 或注入 lock/unlock Ops。
- 单设备请求队列、缓存和重试策略属于 BSP Handler。

## 迁移顺序

1. 先建立事务级 Core IIC Fake，固定 read/write 和超时语义。
2. 把 `bsp_gpio_iic` 移为 Core Software Backend，位级符号设为私有。
3. 把 BSP Port 中 HAL IIC代码移为 Core Hardware Backend。
4. 将 AHT21 Driver 的 10 函数总线接口缩减为事务级 Ops。
5. 用相同测试分别运行 Fake、Hardware 和 Software 后端。
