const { getPlatformConfig } = require('../../platform');
const { fileHeader, guard } = require('../source-style');
const { formatGeneratedFiles } = require('../formatter');

function coreHeader(core) {
  const prefix = `platform_${core}`;
  return `${fileHeader(`${prefix}.h`, `${core.toUpperCase()} MCU 通信抽象接口。`)}
#ifndef ${guard(prefix)}
#define ${guard(prefix)}

/* Includes */
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

/* Public Types */
typedef enum {
    PLATFORM_ERR_OK            = 0,
    PLATFORM_ERR_PARAM         = 3,
    PLATFORM_ERR_NOT_SUPPORTED = 6,
    PLATFORM_ERR_BUSY          = 9
} platform_err_t;

typedef struct {
    uint32_t event_id;
    platform_err_t status;
    uint32_t sequence;
} ${prefix}_event_t;

typedef struct {
    void *backend_context;
    platform_err_t (*pf_init)(void *backend_context);
    platform_err_t (*pf_transfer)(void *backend_context, const void *tx_data, void *rx_data, size_t length, uint32_t timeout_ms);
    platform_err_t (*pf_start_async)(void *backend_context, const void *tx_data, void *rx_data, size_t length);
    platform_err_t (*pf_cancel)(void *backend_context);
} ${prefix}_t;

/* Public Functions */
/** @brief 初始化注入的 MCU ${core.toUpperCase()} 后端。 */
platform_err_t ${prefix}_init(${prefix}_t *instance);
/** @brief 以毫秒超时执行同步事务。 */
platform_err_t ${prefix}_transfer(${prefix}_t *instance, const void *tx_data, void *rx_data, size_t length, uint32_t timeout_ms);
/** @brief 启动可选的异步事务。 */
platform_err_t ${prefix}_start_async(${prefix}_t *instance, const void *tx_data, void *rx_data, size_t length);
/** @brief 取消可选的异步事务。 */
platform_err_t ${prefix}_cancel(${prefix}_t *instance);
/** @brief 将 IRQ 完成转换为上层可消费的值事件。 */
platform_err_t ${prefix}_irq_dispatch(${prefix}_t *instance, ${prefix}_event_t *event);
/** @brief 将 DMA IRQ 完成转换为上层可消费的值事件。 */
platform_err_t ${prefix}_dma_irq_dispatch(${prefix}_t *instance, ${prefix}_event_t *event);

#endif
`;
}

function coreSource(core) {
  const prefix = `platform_${core}`;
  return `${fileHeader(`${prefix}.c`, `${core.toUpperCase()} MCU 通信抽象接口实现。`)}
/* Includes */
#include "${prefix}.h"

/* Private Defines */
#define ${prefix.toUpperCase()}_EVENT_IRQ 1U
#define ${prefix.toUpperCase()}_EVENT_DMA_IRQ 2U

/* Public Functions */
platform_err_t ${prefix}_init(${prefix}_t *instance) {
    if (instance == NULL || instance->pf_init == NULL) {
        return PLATFORM_ERR_PARAM;
    }
    return instance->pf_init(instance->backend_context);
}

platform_err_t ${prefix}_transfer(${prefix}_t *instance, const void *tx_data, void *rx_data, size_t length, uint32_t timeout_ms) {
    if (instance == NULL || instance->pf_transfer == NULL) {
        return PLATFORM_ERR_PARAM;
    }
    return instance->pf_transfer(instance->backend_context, tx_data, rx_data, length, timeout_ms);
}

platform_err_t ${prefix}_start_async(${prefix}_t *instance, const void *tx_data, void *rx_data, size_t length) {
    if (instance == NULL || instance->pf_start_async == NULL) {
        return PLATFORM_ERR_NOT_SUPPORTED;
    }
    return instance->pf_start_async(instance->backend_context, tx_data, rx_data, length);
}

platform_err_t ${prefix}_cancel(${prefix}_t *instance) {
    if (instance == NULL || instance->pf_cancel == NULL) {
        return PLATFORM_ERR_NOT_SUPPORTED;
    }
    return instance->pf_cancel(instance->backend_context);
}

platform_err_t ${prefix}_irq_dispatch(${prefix}_t *instance, ${prefix}_event_t *event) {
    if (instance == NULL || event == NULL) {
        return PLATFORM_ERR_PARAM;
    }
    event->event_id = ${prefix.toUpperCase()}_EVENT_IRQ;
    event->status = PLATFORM_ERR_OK;
    event->sequence += 1U;
    return PLATFORM_ERR_OK;
}

platform_err_t ${prefix}_dma_irq_dispatch(${prefix}_t *instance, ${prefix}_event_t *event) {
    if (instance == NULL || event == NULL) {
        return PLATFORM_ERR_PARAM;
    }
    event->event_id = ${prefix.toUpperCase()}_EVENT_DMA_IRQ;
    event->status = PLATFORM_ERR_OK;
    event->sequence += 1U;
    return PLATFORM_ERR_OK;
}
`;
}

function gpioHeader() {
  const prefix = 'platform_gpio';
  return `${fileHeader(`${prefix}.h`, 'GPIO MCU 引脚级抽象接口。')}
#ifndef ${guard(prefix)}
#define ${guard(prefix)}

/* Includes */
#include <stdbool.h>
#include <stdint.h>

/* Public Types */
typedef enum {
    PLATFORM_ERR_OK            = 0,
    PLATFORM_ERR_PARAM         = 3,
    PLATFORM_ERR_NOT_SUPPORTED = 6,
    PLATFORM_ERR_BUSY          = 9
} platform_err_t;

typedef struct {
    void *backend_context;
    platform_err_t (*pf_init)(void *backend_context);
    platform_err_t (*pf_configure)(void *backend_context, uint32_t pin, uint32_t mode_flags);
    platform_err_t (*pf_set)(void *backend_context, uint32_t pin, bool level);
    platform_err_t (*pf_get)(void *backend_context, uint32_t pin, bool *level);
    platform_err_t (*pf_toggle)(void *backend_context, uint32_t pin);
} ${prefix}_t;

/* Public Defines */
#define PLATFORM_GPIO_MODE_OUTPUT     (1UL << 0)
#define PLATFORM_GPIO_MODE_INPUT      (1UL << 1)
#define PLATFORM_GPIO_MODE_OPEN_DRAIN (1UL << 2)
#define PLATFORM_GPIO_PULL_UP         (1UL << 3)
#define PLATFORM_GPIO_PULL_DOWN       (1UL << 4)

/* Public Functions */
/** @brief 初始化注入的 MCU GPIO 后端。 */
platform_err_t ${prefix}_init(${prefix}_t *instance);
/** @brief 以平台无关的模式标志配置单个引脚。 */
platform_err_t ${prefix}_configure(${prefix}_t *instance, uint32_t pin, uint32_t mode_flags);
/** @brief 设置单个引脚输出电平。 */
platform_err_t ${prefix}_set_pin(${prefix}_t *instance, uint32_t pin, bool level);
/** @brief 读取单个引脚电平。 */
platform_err_t ${prefix}_get_pin(${prefix}_t *instance, uint32_t pin, bool *level);
/** @brief 翻转单个引脚输出电平。 */
platform_err_t ${prefix}_toggle_pin(${prefix}_t *instance, uint32_t pin);

#endif
`;
}

function gpioSource() {
  const prefix = 'platform_gpio';
  return `${fileHeader(`${prefix}.c`, 'GPIO MCU 引脚级抽象接口实现。')}
/* Includes */
#include "${prefix}.h"

/* Public Functions */
platform_err_t ${prefix}_init(${prefix}_t *instance) {
    if (instance == NULL || instance->pf_init == NULL) {
        return PLATFORM_ERR_PARAM;
    }
    return instance->pf_init(instance->backend_context);
}

platform_err_t ${prefix}_configure(${prefix}_t *instance, uint32_t pin, uint32_t mode_flags) {
    if (instance == NULL || instance->pf_configure == NULL) {
        return PLATFORM_ERR_PARAM;
    }
    return instance->pf_configure(instance->backend_context, pin, mode_flags);
}

platform_err_t ${prefix}_set_pin(${prefix}_t *instance, uint32_t pin, bool level) {
    if (instance == NULL || instance->pf_set == NULL) {
        return PLATFORM_ERR_PARAM;
    }
    return instance->pf_set(instance->backend_context, pin, level);
}

platform_err_t ${prefix}_get_pin(${prefix}_t *instance, uint32_t pin, bool *level) {
    if (instance == NULL || instance->pf_get == NULL || level == NULL) {
        return PLATFORM_ERR_PARAM;
    }
    return instance->pf_get(instance->backend_context, pin, level);
}

platform_err_t ${prefix}_toggle_pin(${prefix}_t *instance, uint32_t pin) {
    if (instance == NULL || instance->pf_toggle == NULL) {
        return PLATFORM_ERR_PARAM;
    }
    return instance->pf_toggle(instance->backend_context, pin);
}
`;
}

async function generateCorePeripheral(peripheral, platform) {
  const generator = require('../../generator');
  const core = generator.normalizeCorePeripheral(peripheral);
  getPlatformConfig(platform);
  const usePinTemplate = core === 'gpio';
  return formatGeneratedFiles([
    { path: `03_Platform/platform_mcu/Inc/platform_${core}.h`, content: usePinTemplate ? gpioHeader() : coreHeader(core) },
    { path: `03_Platform/platform_mcu/Src/platform_${core}.c`, content: usePinTemplate ? gpioSource() : coreSource(core) }
  ]);
}

module.exports = {
  id: 'platform-mcu.core',
  layer: 'platform_mcu',
  version: '1',
  skill: 'platform_mcu',
  render: async (request) => generateCorePeripheral(request.peripheral, request.platform),
  generateCorePeripheral
};
