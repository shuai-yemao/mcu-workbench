const fs = require('fs').promises;
const path = require('path');
const { getPlatformConfig } = require('./platform');

const CORE_PERIPHERALS = ['gpio', 'i2c', 'spi', 'adc', 'tim', 'uart', 'wdg', 'rtc'];
const DEVICE_PROFILES = {
  aht21: { deviceType: 'sensor', cores: ['i2c'] },
  mpu6050: { deviceType: 'sensor', cores: ['i2c'] },
  w25q64: { deviceType: 'externflash', cores: ['spi'] },
  ssd1306: {
    deviceType: 'display',
    cores: ['i2c'],
    template: 'ssd1306-display',
    manifest: {
      handleKind: 'display',
      osalResources: ['mutex'],
      commentProfile: 'workflow-full-doc',
      blocking: ['init', 'flush'],
      isrSafe: []
    }
  }
};

function createError(message, code = 'USAGE') {
  const error = new Error(message);
  error.code = code;
  return error;
}

function normalizeCorePeripheral(peripheral) {
  const normalized = String(peripheral || '').trim().toLowerCase();
  const canonical = normalized;
  if (!CORE_PERIPHERALS.includes(canonical)) {
    throw createError(`Unsupported Core peripheral: ${peripheral}. Supported values: ${CORE_PERIPHERALS.join(', ')}.`);
  }
  return canonical;
}

function normalizeDeviceType(deviceType) {
  const normalized = String(deviceType || '').trim().toLowerCase().replace(/-/g, '_');
  if (!/^[a-z][a-z0-9_]*$/.test(normalized)) {
    throw createError('--device-type must use lower snake_case, for example externflash.');
  }
  return normalized;
}

function normalizeDevice(device) {
  const value = String(device || '').trim();
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(value)) {
    throw createError('--device must start with a letter and contain only letters, numbers, or underscores.');
  }
  return { directory: value.toUpperCase(), stem: value.toLowerCase() };
}

function normalizeCoreList(cores) {
  const values = Array.isArray(cores) ? cores : [cores];
  const normalized = [];
  for (const value of values) {
    const core = normalizeCorePeripheral(value);
    if (!normalized.includes(core)) normalized.push(core);
  }
  if (!normalized.length) throw createError('At least one --core option is required.');
  return normalized;
}

function validateDeviceProfile({ deviceType, device, cores, allowCustomDevice = false }) {
  const profile = DEVICE_PROFILES[device.stem];
  if (!profile) {
    if (!allowCustomDevice) {
      throw createError(`Unknown device ${device.directory}. Add --allow-custom-device after reviewing its bus contract.`);
    }
    return;
  }
  if (profile.deviceType !== deviceType || profile.cores.some((core) => !cores.includes(core))) {
    throw createError(`${device.directory} requires --device-type ${profile.deviceType} and --core ${profile.cores.join(' --core ')}.`);
  }
}

function guard(prefix) {
  return `${prefix.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_H`;
}

function fileHeader(fileName, summary) {
  return `/**\n * @file ${fileName}\n * @par dependencies\n * - generated BSP/Core public interfaces only\n * @author MCU Workbench\n * @brief ${summary}\n * Processing flow:\n * Generated slice participates in the declared layered contract.\n * @version V1.0\n */\n`;
}

function coreHeader(core) {
  const prefix = `platform_${core}`;
  return `${fileHeader(`${prefix}.h`, `${core.toUpperCase()} MCU communication abstraction.`)}
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
/** @brief Initializes an injected MCU ${core.toUpperCase()} backend. */
platform_err_t ${prefix}_init(${prefix}_t *instance);
/** @brief Executes a synchronous transaction with timeout expressed in milliseconds. */
platform_err_t ${prefix}_transfer(${prefix}_t *instance, const void *tx_data, void *rx_data, size_t length, uint32_t timeout_ms);
/** @brief Starts an optional asynchronous transaction. */
platform_err_t ${prefix}_start_async(${prefix}_t *instance, const void *tx_data, void *rx_data, size_t length);
/** @brief Cancels an optional asynchronous transaction. */
platform_err_t ${prefix}_cancel(${prefix}_t *instance);
/** @brief Converts an IRQ completion into a value event for upper layers. */
platform_err_t ${prefix}_irq_dispatch(${prefix}_t *instance, ${prefix}_event_t *event);
/** @brief Converts a DMA IRQ completion into a value event for upper layers. */
platform_err_t ${prefix}_dma_irq_dispatch(${prefix}_t *instance, ${prefix}_event_t *event);

#endif
`;
}

function coreSource(core) {
  const prefix = `platform_${core}`;
  return `${fileHeader(`${prefix}.c`, `${core.toUpperCase()} MCU communication abstraction implementation.`)}
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
  return `${fileHeader(`${prefix}.h`, 'GPIO MCU pin-level abstraction.')}
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
/** @brief Initializes an injected MCU GPIO backend. */
platform_err_t ${prefix}_init(${prefix}_t *instance);
/** @brief Configures one pin with platform-independent mode flags. */
platform_err_t ${prefix}_configure(${prefix}_t *instance, uint32_t pin, uint32_t mode_flags);
/** @brief Sets one pin output level. */
platform_err_t ${prefix}_set_pin(${prefix}_t *instance, uint32_t pin, bool level);
/** @brief Reads one pin level. */
platform_err_t ${prefix}_get_pin(${prefix}_t *instance, uint32_t pin, bool *level);
/** @brief Toggles one pin output level. */
platform_err_t ${prefix}_toggle_pin(${prefix}_t *instance, uint32_t pin);

#endif
`;
}

function gpioSource() {
  const prefix = 'platform_gpio';
  return `${fileHeader(`${prefix}.c`, 'GPIO MCU pin-level abstraction implementation.')}
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
  const core = normalizeCorePeripheral(peripheral);
  getPlatformConfig(platform);
  const usePinTemplate = core === 'gpio';
  return [
    { path: `03_Platform/platform_mcu/Inc/platform_${core}.h`, content: usePinTemplate ? gpioHeader() : coreHeader(core) },
    { path: `03_Platform/platform_mcu/Src/platform_${core}.c`, content: usePinTemplate ? gpioSource() : coreSource(core) }
  ];
}

function driverConfig(device) {
  const prefix = `IMPL_${device.stem.toUpperCase()}`;
  return `${fileHeader(`impl_${device.stem}_config.h`, `${device.directory} device configuration.`)}
#ifndef ${guard(`impl_${device.stem}_config`)}
#define ${guard(`impl_${device.stem}_config`)}

/* Public Defines */
#define ${prefix}_DEFAULT_TIMEOUT_MS 100U
#define ${prefix}_DMA_ENABLED 1U
#define ${prefix}_IRQ_ENABLED 1U

#endif
`;
}

function driverHeader(device, primaryCore) {
  const prefix = `impl_${device.stem}_driver`;
  return `${fileHeader(`${prefix}.h`, `${device.directory} protocol Driver interface.`)}
#ifndef ${guard(prefix)}
#define ${guard(prefix)}

/* Includes */
#include <stdbool.h>
#include <stdint.h>

/* Public Types */
typedef struct {
    int32_t (*pf_transaction)(void *context);
    void *context;
} ${prefix}_core_ops_t;
typedef struct {
    int32_t (*pf_chip_feature)(void *context);
    void *context;
} ${prefix}_mcu_ops_t;
typedef struct {
    bool is_inited;
    ${prefix}_core_ops_t core_ops;
    ${prefix}_mcu_ops_t mcu_ops;
    int32_t (*pf_read_id)(void *context, uint32_t *device_id);
    void *context;
} ${prefix}_t;

/* Public Functions */
/** @brief Returns the per-instance ${device.directory} Driver function table. */
${prefix}_t *${prefix}_inst(void);
/** @brief Binds transaction-level Core operations to the Driver instance. */
int32_t ${prefix}_register_core_ops(${prefix}_t *driver, const ${prefix}_core_ops_t *ops);
/** @brief Binds MCU-only operations that Core cannot express to the Driver instance. */
int32_t ${prefix}_register_mcu_ops(${prefix}_t *driver, const ${prefix}_mcu_ops_t *ops);

#endif
`;
}

function driverSource(device) {
  const prefix = `impl_${device.stem}_driver`;
  return `${fileHeader(`${prefix}.c`, `${device.directory} protocol Driver implementation.`)}
/* Includes */
#include "${prefix}.h"
#include "impl_${device.stem}_config.h"

/* Private State */
static ${prefix}_t s_${device.stem}_driver;

/* Private Functions */
static int32_t ${device.stem}_driver_read_id(void *context, uint32_t *device_id) {
    ${prefix}_t *driver = context;
    if (driver == NULL || device_id == NULL || !driver->is_inited
        || driver->core_ops.pf_transaction == NULL || driver->mcu_ops.pf_chip_feature == NULL) {
        return -1;
    }
    if (driver->core_ops.pf_transaction(driver->core_ops.context) != 0
        || driver->mcu_ops.pf_chip_feature(driver->mcu_ops.context) != 0) {
        return -1;
    }
    *device_id = 0U;
    return 0;
}

/* Public Functions */
${prefix}_t *${prefix}_inst(void) {
    s_${device.stem}_driver.is_inited = true;
    s_${device.stem}_driver.pf_read_id = ${device.stem}_driver_read_id;
    s_${device.stem}_driver.context = &s_${device.stem}_driver;
    return &s_${device.stem}_driver;
}

int32_t ${prefix}_register_core_ops(${prefix}_t *driver, const ${prefix}_core_ops_t *ops) {
    if (driver == NULL || ops == NULL || ops->pf_transaction == NULL) {
        return -1;
    }
    driver->core_ops = *ops;
    return 0;
}

int32_t ${prefix}_register_mcu_ops(${prefix}_t *driver, const ${prefix}_mcu_ops_t *ops) {
    if (driver == NULL || ops == NULL || ops->pf_chip_feature == NULL) {
        return -1;
    }
    driver->mcu_ops = *ops;
    return 0;
}
`;
}

function handleHeader(type) {
  const prefix = `impl_${type}_handle`;
  return `${fileHeader(`${prefix}.h`, `${type} lifecycle and event Handle interface.`)}
#ifndef ${guard(prefix)}
#define ${guard(prefix)}

/* Includes */
#include <stdbool.h>
#include <stdint.h>

/* Public Types */
typedef void (*${prefix}_event_callback_t)(void *context, uint32_t event_id, int32_t status);
typedef struct {
    int32_t (*pf_read_id)(void *context, uint32_t *device_id);
    void *context;
} ${prefix}_driver_ops_t;
typedef struct {
    int32_t (*pf_notify_from_isr)(void *context);
    void *context;
} ${prefix}_osal_ops_t;
typedef struct {
    bool is_inited;
    ${prefix}_osal_ops_t osal_ops;
    ${prefix}_driver_ops_t driver_ops;
    ${prefix}_event_callback_t event_callback;
    void *event_context;
    bool event_pending;
    uint32_t pending_event_id;
    int32_t pending_status;
} ${prefix}_t;

/* Public Functions */
/** @brief Returns the ${type} Handle instance. */
${prefix}_t *${prefix}_inst(void);
/** @brief Binds the Driver operation table to the Handle. */
int32_t ${prefix}_register_driver(${prefix}_t *handle, const ${prefix}_driver_ops_t *ops);
/** @brief Binds OS Wrapper operations used by the Handler lifecycle. */
int32_t ${prefix}_register_osal_ops(${prefix}_t *handle, const ${prefix}_osal_ops_t *ops);
/** @brief Registers one task-context event callback for this instance. */
int32_t ${prefix}_set_event_callback(${prefix}_t *handle, ${prefix}_event_callback_t callback, void *context);
/** @brief Performs a synchronous ID read through injected Driver operations. */
int32_t ${prefix}_read_id(${prefix}_t *handle, uint32_t *device_id);
/** @brief Defers an ISR event without calling the user callback. */
int32_t ${prefix}_notify_from_isr(${prefix}_t *handle, uint32_t event_id, int32_t status);
/** @brief Delivers a deferred event in task context after lock release. */
int32_t ${prefix}_process(${prefix}_t *handle);

#endif
`;
}

function handleSource(type) {
  const prefix = `impl_${type}_handle`;
  return `${fileHeader(`${prefix}.c`, `${type} lifecycle and event Handle implementation.`)}
/* Includes */
#include "${prefix}.h"

/* Private State */
static ${prefix}_t s_${type}_handle;

/* Public Functions */
${prefix}_t *${prefix}_inst(void) {
    s_${type}_handle.is_inited = true;
    return &s_${type}_handle;
}

int32_t ${prefix}_register_driver(${prefix}_t *handle, const ${prefix}_driver_ops_t *ops) {
    if (handle == NULL || ops == NULL || ops->pf_read_id == NULL) {
        return -1;
    }
    handle->driver_ops = *ops;
    return 0;
}

int32_t ${prefix}_register_osal_ops(${prefix}_t *handle, const ${prefix}_osal_ops_t *ops) {
    if (handle == NULL || ops == NULL || ops->pf_notify_from_isr == NULL) {
        return -1;
    }
    handle->osal_ops = *ops;
    return 0;
}

int32_t ${prefix}_set_event_callback(${prefix}_t *handle, ${prefix}_event_callback_t callback, void *context) {
    if (handle == NULL || callback == NULL) {
        return -1;
    }
    if (handle->event_callback != NULL) {
        return -2; /* ALREADY_REGISTERED */
    }
    handle->event_callback = callback;
    handle->event_context = context;
    return 0;
}

int32_t ${prefix}_read_id(${prefix}_t *handle, uint32_t *device_id) {
    if (handle == NULL || device_id == NULL || handle->driver_ops.pf_read_id == NULL) {
        return -1;
    }
    return handle->driver_ops.pf_read_id(handle->driver_ops.context, device_id);
}

int32_t ${prefix}_notify_from_isr(${prefix}_t *handle, uint32_t event_id, int32_t status) {
    if (handle == NULL || handle->osal_ops.pf_notify_from_isr == NULL) {
        return -1;
    }
    if (handle->osal_ops.pf_notify_from_isr(handle->osal_ops.context) != 0) {
        return -1;
    }
    handle->pending_event_id = event_id;
    handle->pending_status = status;
    handle->event_pending = true; /* Replace with injected osal_*_from_isr queue notification. */
    return 0;
}

int32_t ${prefix}_process(${prefix}_t *handle) {
    ${prefix}_event_callback_t callback;
    void *context;
    uint32_t event_id;
    int32_t status;
    if (handle == NULL || !handle->event_pending) {
        return -1;
    }
    event_id = handle->pending_event_id;
    status = handle->pending_status;
    callback = handle->event_callback;
    context = handle->event_context;
    handle->event_pending = false; /* Lock, if injected, is released before callback. */
    if (callback != NULL) {
        callback(context, event_id, status);
    }
    return 0;
}
`;
}

function wrapperHeader(type) {
  const prefix = `platform_${type}_wrapper`;
  return `${fileHeader(`${prefix}.h`, `${type} platform-independent BSP Wrapper.`)}
#ifndef ${guard(prefix)}
#define ${guard(prefix)}

/* Includes */
#include <stddef.h>
#include <stdint.h>

/* Public Types */
typedef void (*${prefix}_event_callback_t)(void *context, uint32_t event_id, int32_t status);
typedef struct {
    int32_t (*pf_read_id)(uint32_t *device_id);
    int32_t (*pf_set_event_callback)(${prefix}_event_callback_t callback, void *context);
} ${prefix}_ops_t;

/* Public Functions */
/** @brief Registers one platform implementation function table. */
int32_t ${prefix}_register(const ${prefix}_ops_t *ops);
/** @brief Reads a device ID through the registered Port implementation. */
int32_t ${prefix}_read_id(uint32_t *device_id);
/** @brief Registers an application event callback through the registered Port. */
int32_t ${prefix}_set_event_callback(${prefix}_event_callback_t callback, void *context);

#endif
`;
}

function wrapperSource(type) {
  const prefix = `platform_${type}_wrapper`;
  return `${fileHeader(`${prefix}.c`, `${type} platform-independent BSP Wrapper implementation.`)}
/* Includes */
#include "${prefix}.h"

/* Private State */
static ${prefix}_ops_t s_${type}_ops;
static uint8_t s_${type}_registered;

/* Public Functions */
int32_t ${prefix}_register(const ${prefix}_ops_t *ops) {
    if (ops == NULL || ops->pf_read_id == NULL || ops->pf_set_event_callback == NULL) {
        return -1;
    }
    s_${type}_ops = *ops;
    s_${type}_registered = 1U;
    return 0;
}

int32_t ${prefix}_read_id(uint32_t *device_id) {
    if (s_${type}_registered == 0U) {
        return -1;
    }
    return s_${type}_ops.pf_read_id(device_id);
}

int32_t ${prefix}_set_event_callback(${prefix}_event_callback_t callback, void *context) {
    if (s_${type}_registered == 0U) {
        return -1;
    }
    return s_${type}_ops.pf_set_event_callback(callback, context);
}
`;
}

function portHeader(type) {
  const prefix = `impl_${type}_port`;
  return `${fileHeader(`${prefix}.h`, `${type} BSP Port registration interface.`)}
#ifndef ${guard(prefix)}
#define ${guard(prefix)}

/* Includes */
#include <stdint.h>

/* Public Functions */
/** @brief Injects Core/MCU/OS/Driver Ops, then registers Wrapper operations. */
int32_t ${prefix}_register(void);

#endif
`;
}

function portSource(type, device) {
  const prefix = `impl_${type}_port`;
  const handle = `impl_${type}_handle`;
  const driver = `impl_${device.stem}_driver`;
  const wrapper = `platform_${type}_wrapper`;
  return `${fileHeader(`${prefix}.c`, `${type} BSP Port composition and Wrapper registration.`)}
/* Includes */
#include "${prefix}.h"
#include "${handle}.h"
#include "${driver}.h"
#include "${wrapper}.h"

/* Private Composition */
static ${handle}_t *s_${type}_handle;

extern int32_t ${type}_platform_core_transaction(void *context);
extern int32_t ${type}_platform_mcu_feature(void *context);
extern int32_t ${type}_platform_osal_notify_from_isr(void *context);

static int32_t ${type}_port_core_transaction(void *context) {
    return ${type}_platform_core_transaction(context);
}

static int32_t ${type}_port_mcu_feature(void *context) {
    return ${type}_platform_mcu_feature(context);
}

static int32_t ${type}_port_osal_notify_from_isr(void *context) {
    return ${type}_platform_osal_notify_from_isr(context);
}

/* Private Functions */
static int32_t ${type}_port_read_id(uint32_t *device_id) {
    return ${handle}_read_id(s_${type}_handle, device_id);
}

static int32_t ${type}_port_set_event_callback(${wrapper}_event_callback_t callback, void *context) {
    return ${handle}_set_event_callback(s_${type}_handle, callback, context);
}

/* Public Functions */
int32_t ${prefix}_register(void) {
    ${driver}_t *driver = ${driver}_inst();
    ${driver}_core_ops_t core_ops;
    ${driver}_mcu_ops_t mcu_ops;
    ${handle}_driver_ops_t driver_ops;
    ${handle}_osal_ops_t osal_ops;
    ${wrapper}_ops_t wrapper_ops;
    s_${type}_handle = ${handle}_inst();
    core_ops.pf_transaction = ${type}_port_core_transaction;
    core_ops.context = NULL;
    mcu_ops.pf_chip_feature = ${type}_port_mcu_feature;
    mcu_ops.context = NULL;
    driver_ops.pf_read_id = driver->pf_read_id;
    driver_ops.context = driver->context;
    osal_ops.pf_notify_from_isr = ${type}_port_osal_notify_from_isr;
    osal_ops.context = NULL;
    if (${driver}_register_core_ops(driver, &core_ops) != 0
        || ${driver}_register_mcu_ops(driver, &mcu_ops) != 0
        || ${handle}_register_osal_ops(s_${type}_handle, &osal_ops) != 0
        || ${handle}_register_driver(s_${type}_handle, &driver_ops) != 0) {
        return -1;
    }
    wrapper_ops.pf_read_id = ${type}_port_read_id;
    wrapper_ops.pf_set_event_callback = ${type}_port_set_event_callback;
    return ${wrapper}_register(&wrapper_ops);
}
`;
}

function workflowFileHeader(fileName, brief, flow, dependencies = []) {
  const dependencyLines = dependencies.length
    ? dependencies.map((item) => ` * - ${item}`).join('\n')
    : ' * - none';
  return `/**\n * @file ${fileName}\n * @par dependencies\n${dependencyLines}\n * @author MCU Workbench\n * @brief ${brief}\n * Processing flow:\n * ${flow}\n * @version V1.0\n */\n`;
}

function ssd1306Config() {
  return `${workflowFileHeader('impl_ssd1306_config.h', 'SSD1306 device configuration.', 'Port injects these device geometry values into the display Handle.')}
#ifndef IMPL_SSD1306_CONFIG_H
#define IMPL_SSD1306_CONFIG_H

/* Public Defines */
#ifndef IMPL_SSD1306_WIDTH
#define IMPL_SSD1306_WIDTH 128U
#endif
#ifndef IMPL_SSD1306_HEIGHT
#define IMPL_SSD1306_HEIGHT 64U
#endif
#ifndef IMPL_SSD1306_I2C_ADDRESS_7BIT
#define IMPL_SSD1306_I2C_ADDRESS_7BIT 0x3CU
#endif
#ifndef IMPL_SSD1306_COLUMN_OFFSET
#define IMPL_SSD1306_COLUMN_OFFSET 0U
#endif
#ifndef IMPL_SSD1306_TIMEOUT_MS
#define IMPL_SSD1306_TIMEOUT_MS 100U
#endif
#define IMPL_SSD1306_PAGE_COUNT (IMPL_SSD1306_HEIGHT / 8U)
#define IMPL_SSD1306_FRAMEBUFFER_SIZE ((IMPL_SSD1306_WIDTH * IMPL_SSD1306_HEIGHT) / 8U)

#endif
`;
}

function ssd1306DriverHeader() {
  return `${workflowFileHeader('impl_ssd1306_driver.h', 'SSD1306 protocol Driver API.', 'Port injects Core I2C Ops; the Driver emits controller commands and frame transactions.', ['<stddef.h>', '<stdint.h>'])}
#ifndef IMPL_SSD1306_DRIVER_H
#define IMPL_SSD1306_DRIVER_H

/* Includes */
#include <stddef.h>
#include <stdint.h>

/* Public Types */
typedef struct {
    void *p_context; /**< Core Bus instance selected by Port. */
    /**
     * @brief Writes one SSD1306 command or data transaction.
     * @param p_context Core Bus instance.
     * @param address_7bit Seven-bit device address.
     * @param control SSD1306 control byte.
     * @param p_data Data to transfer.
     * @param length Number of bytes in p_data.
     * @param timeout_ms Blocking timeout; never call from an ISR.
     * @return Core-defined transaction status.
     */
    int32_t (*pf_write)(void *p_context, uint8_t address_7bit,
                        uint8_t control, const uint8_t *p_data,
                        size_t length, uint32_t timeout_ms);
} impl_ssd1306_bus_ops_t;

typedef struct {
    void *p_context; /**< Private Driver state. */
    /** @brief Binds Core Bus operations. @return Zero on success. */
    int32_t (*pf_bind_bus)(void *p_context,
                           const impl_ssd1306_bus_ops_t *p_ops);
    /** @brief Initializes the controller. @warning Blocking; not ISR-safe. */
    int32_t (*pf_init)(void *p_context);
    /** @brief Writes one complete page-formatted frame. @warning Blocking; not ISR-safe. */
    int32_t (*pf_write_frame)(void *p_context,
                              const uint8_t *p_framebuffer,
                              size_t length);
} impl_ssd1306_driver_api_t;

/* Public Functions */
/**
 * @brief Returns context-first SSD1306 Driver operations.
 * @param[out] p_api Destination API table.
 * @return Zero on success; a negative value for invalid input.
 */
int32_t impl_ssd1306_driver_inst(impl_ssd1306_driver_api_t *p_api);

#endif
`;
}

function ssd1306DriverSource() {
  return `${workflowFileHeader('impl_ssd1306_driver.c', 'SSD1306 protocol implementation.', 'Init emits SSD1306 commands; frame refresh uses injected transaction-level Core I2C Ops.', ['impl_ssd1306_driver.h', 'impl_ssd1306_config.h'])}
/* Includes */
#include "impl_ssd1306_driver.h"
#include "impl_ssd1306_config.h"

/* Private Defines */
#define SSD1306_OK 0
#define SSD1306_ERROR (-1)
#define SSD1306_CONTROL_COMMAND 0x00U
#define SSD1306_CONTROL_DATA 0x40U

/* Private Types */
typedef struct {
    impl_ssd1306_bus_ops_t bus_ops;
    uint8_t is_inited; /**< Set only after the initial command sequence succeeds. */
} ssd1306_driver_state_t;

/* Private State */
static ssd1306_driver_state_t s_ssd1306_state;

/* Private Functions */
/**
 * @brief Binds transaction-level Core I2C operations.
 * @param p_context Driver state supplied by the API table.
 * @param p_ops Context-first Core Bus operations supplied by Port.
 * @return Zero on success; negative when either operation is unavailable.
 */
static int32_t ssd1306_bind_bus(void *p_context,
                                const impl_ssd1306_bus_ops_t *p_ops) {
    ssd1306_driver_state_t *p_state = p_context;
    if ((p_state == NULL) || (p_ops == NULL) || (p_ops->pf_write == NULL)) return SSD1306_ERROR;
    p_state->bus_ops = *p_ops;
    return SSD1306_OK;
}

/**
 * @brief Sends the SSD1306 initial command sequence.
 * @param p_context Driver state supplied by the API table.
 * @return Zero when the controller accepts the command sequence.
 * @warning Blocking through Core I2C; not ISR-safe.
 */
static int32_t ssd1306_init(void *p_context) {
    static const uint8_t commands[] = {
        0xAEU, 0x20U, 0x00U, 0x21U, IMPL_SSD1306_COLUMN_OFFSET,
        (uint8_t)(IMPL_SSD1306_COLUMN_OFFSET + IMPL_SSD1306_WIDTH - 1U),
        0x22U, 0x00U, (uint8_t)(IMPL_SSD1306_PAGE_COUNT - 1U),
        0xA1U, 0xC8U, 0xAFU
    };
    ssd1306_driver_state_t *p_state = p_context;
    if ((p_state == NULL) || (p_state->bus_ops.pf_write == NULL)) return SSD1306_ERROR;
    if (p_state->bus_ops.pf_write(p_state->bus_ops.p_context, IMPL_SSD1306_I2C_ADDRESS_7BIT,
                                  SSD1306_CONTROL_COMMAND, commands, sizeof(commands),
                                  IMPL_SSD1306_TIMEOUT_MS) != SSD1306_OK) return SSD1306_ERROR;
    p_state->is_inited = 1U;
    return SSD1306_OK;
}

/**
 * @brief Writes a page-formatted full frame through Core I2C.
 * @param p_context Driver state supplied by the API table.
 * @param p_framebuffer Page-formatted framebuffer owned by the Handle.
 * @param length Exact configured framebuffer length.
 * @return Core transaction status or a negative validation error.
 * @warning Blocking through Core I2C; not ISR-safe.
 */
static int32_t ssd1306_write_frame(void *p_context, const uint8_t *p_framebuffer,
                                   size_t length) {
    static const uint8_t window[] = {
        0x21U, IMPL_SSD1306_COLUMN_OFFSET,
        (uint8_t)(IMPL_SSD1306_COLUMN_OFFSET + IMPL_SSD1306_WIDTH - 1U),
        0x22U, 0x00U, (uint8_t)(IMPL_SSD1306_PAGE_COUNT - 1U)
    };
    ssd1306_driver_state_t *p_state = p_context;
    if ((p_state == NULL) || (p_framebuffer == NULL) ||
        (length != IMPL_SSD1306_FRAMEBUFFER_SIZE) || (p_state->is_inited == 0U)) return SSD1306_ERROR;
    if (p_state->bus_ops.pf_write(p_state->bus_ops.p_context,
                                  IMPL_SSD1306_I2C_ADDRESS_7BIT,
                                  SSD1306_CONTROL_COMMAND, window, sizeof(window),
                                  IMPL_SSD1306_TIMEOUT_MS) != SSD1306_OK) return SSD1306_ERROR;
    return p_state->bus_ops.pf_write(p_state->bus_ops.p_context,
                                     IMPL_SSD1306_I2C_ADDRESS_7BIT,
                                     SSD1306_CONTROL_DATA, p_framebuffer, length,
                                     IMPL_SSD1306_TIMEOUT_MS);
}

/* Public Functions */
/**
 * @brief Exposes only context-first Driver operations to the Port.
 * @param[out] p_api Destination Driver API table.
 * @return Zero on success; negative for invalid input.
 */
int32_t impl_ssd1306_driver_inst(impl_ssd1306_driver_api_t *p_api) {
    if (p_api == NULL) return SSD1306_ERROR;
    p_api->p_context = &s_ssd1306_state;
    p_api->pf_bind_bus = ssd1306_bind_bus;
    p_api->pf_init = ssd1306_init;
    p_api->pf_write_frame = ssd1306_write_frame;
    return SSD1306_OK;
}
`;
}

function displayHandleHeader() {
  return `${workflowFileHeader('impl_display_handle.h', 'Display-class Handle API.', 'Port injects OSAL and Driver Ops; the Handle owns the framebuffer and serializes display requests.', ['<stdbool.h>', '<stddef.h>', '<stdint.h>'])}
#ifndef IMPL_DISPLAY_HANDLE_H
#define IMPL_DISPLAY_HANDLE_H

/* Includes */
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

/* Public Defines */
#define IMPL_DISPLAY_HANDLE_MAX_FRAMEBUFFER_SIZE 2048U
#define IMPL_DISPLAY_LOCK_TIMEOUT_MS 100U

/* Public Types */
typedef struct { uint16_t width; uint16_t height; size_t framebuffer_length; } impl_display_geometry_t;
typedef struct { void *p_context; int32_t (*pf_init)(void *p_context); int32_t (*pf_write_frame)(void *p_context, const uint8_t *p_data, size_t length); } impl_display_driver_ops_t;
typedef struct { void *p_mutex; int32_t (*pf_lock)(void *p_mutex, uint32_t timeout_ms); int32_t (*pf_unlock)(void *p_mutex); } impl_display_osal_ops_t;
typedef struct {
    void *p_context;
    int32_t (*pf_bind_driver)(void *p_context, const impl_display_driver_ops_t *p_ops);
    int32_t (*pf_bind_osal)(void *p_context, const impl_display_osal_ops_t *p_ops);
    int32_t (*pf_configure)(void *p_context, const impl_display_geometry_t *p_geometry);
    int32_t (*pf_init)(void *p_context);
    int32_t (*pf_clear)(void *p_context);
    int32_t (*pf_set_pixel)(void *p_context, uint16_t x, uint16_t y, bool enabled);
    int32_t (*pf_flush)(void *p_context);
} impl_display_handle_api_t;

/* Public Functions */
/** @brief Returns display-class context-first Handle operations. */
int32_t impl_display_handle_inst(impl_display_handle_api_t *p_api);

#endif
`;
}

function displayHandleSource() {
  return `${workflowFileHeader('impl_display_handle.c', 'Display-class framebuffer and serialization implementation.', 'Handle owns the framebuffer, locks it with injected OSAL Ops, then invokes generic Driver Ops.', ['impl_display_handle.h', '<string.h>'])}
/* Includes */
#include "impl_display_handle.h"
#include <string.h>

/* Private Defines */
#define DISPLAY_OK 0
#define DISPLAY_ERROR (-1)

/* Private Types */
typedef struct { impl_display_geometry_t geometry; impl_display_driver_ops_t driver_ops; impl_display_osal_ops_t osal_ops; uint8_t framebuffer[IMPL_DISPLAY_HANDLE_MAX_FRAMEBUFFER_SIZE]; uint8_t configured; uint8_t inited; uint8_t dirty; } display_handle_state_t;

/* Private State */
static display_handle_state_t s_display_handle;

/* Private Functions */
/** @brief Stores generic Driver operations without depending on a concrete Driver header. */
static int32_t display_bind_driver(void *p_context, const impl_display_driver_ops_t *p_ops) { display_handle_state_t *p_handle = p_context; if ((p_handle == NULL) || (p_ops == NULL) || (p_ops->pf_init == NULL) || (p_ops->pf_write_frame == NULL)) return DISPLAY_ERROR; p_handle->driver_ops = *p_ops; return DISPLAY_OK; }
/** @brief Stores OSAL mutex operations created by the Port. */
static int32_t display_bind_osal(void *p_context, const impl_display_osal_ops_t *p_ops) { display_handle_state_t *p_handle = p_context; if ((p_handle == NULL) || (p_ops == NULL) || (p_ops->pf_lock == NULL) || (p_ops->pf_unlock == NULL)) return DISPLAY_ERROR; p_handle->osal_ops = *p_ops; return DISPLAY_OK; }
/** @brief Accepts the model-specific geometry injected by the Port. */
static int32_t display_configure(void *p_context, const impl_display_geometry_t *p_geometry) { display_handle_state_t *p_handle = p_context; if ((p_handle == NULL) || (p_geometry == NULL) || (p_geometry->framebuffer_length > IMPL_DISPLAY_HANDLE_MAX_FRAMEBUFFER_SIZE)) return DISPLAY_ERROR; p_handle->geometry = *p_geometry; p_handle->configured = 1U; return DISPLAY_OK; }
/** @brief Initializes the Driver and clears the Handle-owned framebuffer. */
static int32_t display_init(void *p_context) { display_handle_state_t *p_handle = p_context; if ((p_handle == NULL) || (p_handle->configured == 0U) || (p_handle->driver_ops.pf_init == NULL)) return DISPLAY_ERROR; if (p_handle->driver_ops.pf_init(p_handle->driver_ops.p_context) != DISPLAY_OK) return DISPLAY_ERROR; memset(p_handle->framebuffer, 0, p_handle->geometry.framebuffer_length); p_handle->dirty = 1U; p_handle->inited = 1U; return DISPLAY_OK; }
/** @brief Clears the framebuffer under the display-instance mutex. @warning Not ISR-safe. */
static int32_t display_clear(void *p_context) { display_handle_state_t *p_handle = p_context; if ((p_handle == NULL) || (p_handle->inited == 0U)) return DISPLAY_ERROR; if (p_handle->osal_ops.pf_lock(p_handle->osal_ops.p_mutex, IMPL_DISPLAY_LOCK_TIMEOUT_MS) != DISPLAY_OK) return DISPLAY_ERROR; memset(p_handle->framebuffer, 0, p_handle->geometry.framebuffer_length); p_handle->dirty = 1U; return p_handle->osal_ops.pf_unlock(p_handle->osal_ops.p_mutex); }
/** @brief Sets one framebuffer pixel under the display-instance mutex. @warning Not ISR-safe. */
static int32_t display_set_pixel(void *p_context, uint16_t x, uint16_t y, bool enabled) { display_handle_state_t *p_handle = p_context; size_t index; uint8_t mask; if ((p_handle == NULL) || (p_handle->inited == 0U) || (x >= p_handle->geometry.width) || (y >= p_handle->geometry.height)) return DISPLAY_ERROR; if (p_handle->osal_ops.pf_lock(p_handle->osal_ops.p_mutex, IMPL_DISPLAY_LOCK_TIMEOUT_MS) != DISPLAY_OK) return DISPLAY_ERROR; index = (size_t)x + ((size_t)(y / 8U) * p_handle->geometry.width); mask = (uint8_t)(1U << (y % 8U)); if (enabled) p_handle->framebuffer[index] |= mask; else p_handle->framebuffer[index] &= (uint8_t)~mask; p_handle->dirty = 1U; return p_handle->osal_ops.pf_unlock(p_handle->osal_ops.p_mutex); }
/** @brief Flushes a dirty framebuffer while holding the display-instance mutex. @warning Not ISR-safe. */
static int32_t display_flush(void *p_context) { display_handle_state_t *p_handle = p_context; int32_t status = DISPLAY_OK; if ((p_handle == NULL) || (p_handle->inited == 0U)) return DISPLAY_ERROR; if (p_handle->osal_ops.pf_lock(p_handle->osal_ops.p_mutex, IMPL_DISPLAY_LOCK_TIMEOUT_MS) != DISPLAY_OK) return DISPLAY_ERROR; if (p_handle->dirty != 0U) { status = p_handle->driver_ops.pf_write_frame(p_handle->driver_ops.p_context, p_handle->framebuffer, p_handle->geometry.framebuffer_length); if (status == DISPLAY_OK) p_handle->dirty = 0U; } if (p_handle->osal_ops.pf_unlock(p_handle->osal_ops.p_mutex) != DISPLAY_OK) return DISPLAY_ERROR; return status; }

/* Public Functions */
/** @brief Exposes class-level operations; no SSD1306 symbol is visible here. */
int32_t impl_display_handle_inst(impl_display_handle_api_t *p_api) { if (p_api == NULL) return DISPLAY_ERROR; p_api->p_context = &s_display_handle; p_api->pf_bind_driver = display_bind_driver; p_api->pf_bind_osal = display_bind_osal; p_api->pf_configure = display_configure; p_api->pf_init = display_init; p_api->pf_clear = display_clear; p_api->pf_set_pixel = display_set_pixel; p_api->pf_flush = display_flush; return DISPLAY_OK; }
`;
}

function displayWrapperHeader() {
  return `${workflowFileHeader('platform_display_wrapper.h', 'Platform-independent display Wrapper.', 'APP calls stable display APIs; the Wrapper forwards through a registered context-first Ops table.', ['<stdbool.h>', '<stdint.h>'])}
#ifndef PLATFORM_DISPLAY_WRAPPER_H
#define PLATFORM_DISPLAY_WRAPPER_H

/* Includes */
#include <stdbool.h>
#include <stdint.h>

/* Public Types */
typedef struct { void *p_context; int32_t (*pf_init)(void *p_context); int32_t (*pf_clear)(void *p_context); int32_t (*pf_set_pixel)(void *p_context, uint16_t x, uint16_t y, bool enabled); int32_t (*pf_flush)(void *p_context); } platform_display_wrapper_ops_t;

/* Public Functions */
/** @brief Registers one production or Fake Port implementation. */
int32_t platform_display_wrapper_register(const platform_display_wrapper_ops_t *p_ops);
/** @brief Initializes the display. @warning Not ISR-safe. */
int32_t platform_display_wrapper_init(void);
/** @brief Clears the display framebuffer. @warning Not ISR-safe. */
int32_t platform_display_wrapper_clear(void);
/** @brief Updates one framebuffer pixel. @warning Not ISR-safe. */
int32_t platform_display_wrapper_set_pixel(uint16_t x, uint16_t y, bool enabled);
/** @brief Flushes framebuffer changes. @warning Not ISR-safe. */
int32_t platform_display_wrapper_flush(void);

#endif
`;
}

function displayWrapperSource() {
  return `${workflowFileHeader('platform_display_wrapper.c', 'Display Wrapper forwarding implementation.', 'Wrapper stores only the abstract public Ops table and never references Port, Core, Handler, or Driver.', ['platform_display_wrapper.h'])}
/* Includes */
#include "platform_display_wrapper.h"

/* Private Defines */
#define DISPLAY_WRAPPER_ERROR (-1)

/* Private Types */

/* Private State */
static platform_display_wrapper_ops_t s_display_ops;
static uint8_t s_display_registered;

/* Private Functions */

/* Public Functions */
/** @brief Registers the single display public Ops table. */
int32_t platform_display_wrapper_register(const platform_display_wrapper_ops_t *p_ops) { if ((p_ops == NULL) || (p_ops->pf_init == NULL) || (p_ops->pf_clear == NULL) || (p_ops->pf_set_pixel == NULL) || (p_ops->pf_flush == NULL) || (s_display_registered != 0U)) return DISPLAY_WRAPPER_ERROR; s_display_ops = *p_ops; s_display_registered = 1U; return 0; }
/** @brief Forwards display initialization through the registered table. */
int32_t platform_display_wrapper_init(void) { return (s_display_registered == 0U) ? DISPLAY_WRAPPER_ERROR : s_display_ops.pf_init(s_display_ops.p_context); }
/** @brief Forwards framebuffer clear through the registered table. */
int32_t platform_display_wrapper_clear(void) { return (s_display_registered == 0U) ? DISPLAY_WRAPPER_ERROR : s_display_ops.pf_clear(s_display_ops.p_context); }
/** @brief Forwards pixel update through the registered table. */
int32_t platform_display_wrapper_set_pixel(uint16_t x, uint16_t y, bool enabled) { return (s_display_registered == 0U) ? DISPLAY_WRAPPER_ERROR : s_display_ops.pf_set_pixel(s_display_ops.p_context, x, y, enabled); }
/** @brief Forwards framebuffer flush through the registered table. */
int32_t platform_display_wrapper_flush(void) { return (s_display_registered == 0U) ? DISPLAY_WRAPPER_ERROR : s_display_ops.pf_flush(s_display_ops.p_context); }
`;
}

function displayPortHeader() {
  return `${workflowFileHeader('impl_display_port.h', 'Display BSP Port registration API.', 'Port creates OSAL resources, injects Core and Driver Ops, then registers Wrapper public Ops.', ['<stdint.h>'])}
#ifndef IMPL_DISPLAY_PORT_H
#define IMPL_DISPLAY_PORT_H

/* Includes */
#include <stdint.h>

/* Public Functions */
/**
 * @brief Constructs and registers the SSD1306 display composition root.
 * @return Zero when all dependencies are assembled and registered.
 * @warning Creates an OSAL mutex and performs blocking initialization; not ISR-safe.
 */
int32_t impl_display_port_register(void);

#endif
`;
}

function displayPortSource() {
  return `${workflowFileHeader('impl_display_port.c', 'SSD1306 display composition root.', 'Port creates an OSAL mutex, injects Core Bus and Driver APIs into the Handle, and registers Wrapper Ops.', ['osal.h', 'impl_ssd1306_driver.h', 'impl_display_handle.h', 'platform_display_wrapper.h'])}
/* Includes */
#include "impl_display_port.h"
#include "osal.h"
#include "impl_ssd1306_config.h"
#include "impl_ssd1306_driver.h"
#include "impl_display_handle.h"
#include "platform_display_wrapper.h"

/* Private Defines */
#define DISPLAY_PORT_ERROR (-1)

/* Private Types */

/* Private State */
static osal_mutex_handle_t s_display_mutex;
static uint8_t s_display_mutex_created;

/* Private Functions */

/* Public Functions */
/**
 * @brief Creates OSAL resources, injects all Ops, and registers Wrapper APIs.
 * @return Zero when registration succeeds; negative after releasing any mutex
 *         created by this call on failure.
 * @warning Blocking OSAL operation; not ISR-safe.
 */
int32_t impl_display_port_register(void) {
    impl_ssd1306_driver_api_t driver_api;
    impl_display_handle_api_t handle_api;
    impl_ssd1306_bus_ops_t bus_ops;
    impl_display_driver_ops_t driver_ops;
    impl_display_osal_ops_t osal_ops;
    impl_display_geometry_t geometry;
    platform_display_wrapper_ops_t wrapper_ops;
    if (osal_mutex_create(&s_display_mutex) != OSAL_OK) return DISPLAY_PORT_ERROR;
    s_display_mutex_created = 1U;
    if ((impl_ssd1306_driver_inst(&driver_api) != 0) || (impl_display_handle_inst(&handle_api) != 0)) goto cleanup_mutex;
    bus_ops.p_context = NULL;
    bus_ops.pf_write = platform_i2c_write_transaction;
    if (driver_api.pf_bind_bus(driver_api.p_context, &bus_ops) != 0) goto cleanup_mutex;
    osal_ops.p_mutex = s_display_mutex;
    osal_ops.pf_lock = osal_mutex_lock;
    osal_ops.pf_unlock = osal_mutex_unlock;
    driver_ops.p_context = driver_api.p_context;
    driver_ops.pf_init = driver_api.pf_init;
    driver_ops.pf_write_frame = driver_api.pf_write_frame;
    geometry.width = IMPL_SSD1306_WIDTH;
    geometry.height = IMPL_SSD1306_HEIGHT;
    geometry.framebuffer_length = IMPL_SSD1306_FRAMEBUFFER_SIZE;
    if ((handle_api.pf_bind_osal(handle_api.p_context, &osal_ops) != 0) ||
        (handle_api.pf_bind_driver(handle_api.p_context, &driver_ops) != 0) ||
        (handle_api.pf_configure(handle_api.p_context, &geometry) != 0)) goto cleanup_mutex;
    wrapper_ops.p_context = handle_api.p_context;
    wrapper_ops.pf_init = handle_api.pf_init;
    wrapper_ops.pf_clear = handle_api.pf_clear;
    wrapper_ops.pf_set_pixel = handle_api.pf_set_pixel;
    wrapper_ops.pf_flush = handle_api.pf_flush;
    if (platform_display_wrapper_register(&wrapper_ops) != 0) goto cleanup_mutex;
    return 0;
cleanup_mutex:
    if (s_display_mutex_created != 0U) { (void)osal_mutex_destroy(s_display_mutex); s_display_mutex_created = 0U; }
    return DISPLAY_PORT_ERROR;
}
`;
}

function generateSsd1306Display() {
  const files = [
    { path: '04_Impl/impl_bsp/display/SSD1306/Inc/impl_ssd1306_config.h', content: ssd1306Config() },
    { path: '04_Impl/impl_bsp/display/SSD1306/Inc/impl_ssd1306_driver.h', content: ssd1306DriverHeader() },
    { path: '04_Impl/impl_bsp/display/SSD1306/Src/impl_ssd1306_driver.c', content: ssd1306DriverSource() },
    { path: '04_Impl/impl_bsp_handler/display/Inc/impl_display_handle.h', content: displayHandleHeader() },
    { path: '04_Impl/impl_bsp_handler/display/Src/impl_display_handle.c', content: displayHandleSource() },
    { path: '04_Impl/impl_board/display/Inc/impl_display_port.h', content: displayPortHeader() },
    { path: '04_Impl/impl_board/display/Src/impl_display_port.c', content: displayPortSource() },
    { path: '03_Platform/platform_bsp/display/Inc/platform_display_wrapper.h', content: displayWrapperHeader() },
    { path: '03_Platform/platform_bsp/display/Src/platform_display_wrapper.c', content: displayWrapperSource() }
  ];
  Object.defineProperty(files, 'manifest', {
    enumerable: false,
    value: {
      device: 'SSD1306', deviceType: 'display', cores: ['i2c'],
      osalResources: ['mutex'], commentProfile: 'workflow-full-doc',
      apiMapping: ['Wrapper -> Handle', 'Handle -> Driver', 'Driver -> Core I2C'],
      blocking: ['init', 'flush'], isrSafe: [],
      unresolved: ['UNRESOLVED_OSAL_API: verify osal.h before production integration']
    }
  });
  return files;
}

async function generateBspDriver({ deviceType, device: deviceValue, cores, platform, allowCustomDevice = false }) {
  getPlatformConfig(platform);
  const type = normalizeDeviceType(deviceType);
  const device = normalizeDevice(deviceValue);
  const normalizedCores = normalizeCoreList(cores);
  validateDeviceProfile({ deviceType: type, device, cores: normalizedCores, allowCustomDevice });
  const profile = DEVICE_PROFILES[device.stem];
  if (profile && profile.template === 'ssd1306-display') {
    return generateSsd1306Display();
  }
  const primaryCore = normalizedCores[0];
  const driverRoot = `04_Impl/impl_bsp/${type}/${device.directory}`;
  const handleRoot = `04_Impl/impl_bsp_handler/${type}`;
  const portRoot = `04_Impl/impl_board/${type}`;
  const wrapperRoot = `03_Platform/platform_bsp/${type}`;
  return [
    { path: `${driverRoot}/Inc/impl_${device.stem}_config.h`, content: driverConfig(device) },
    { path: `${driverRoot}/Inc/impl_${device.stem}_driver.h`, content: driverHeader(device, primaryCore) },
    { path: `${driverRoot}/Src/impl_${device.stem}_driver.c`, content: driverSource(device) },
    { path: `${handleRoot}/Inc/impl_${type}_handle.h`, content: handleHeader(type) },
    { path: `${handleRoot}/Src/impl_${type}_handle.c`, content: handleSource(type) },
    { path: `${portRoot}/Inc/impl_${type}_port.h`, content: portHeader(type) },
    { path: `${portRoot}/Src/impl_${type}_port.c`, content: portSource(type, device) },
    { path: `${wrapperRoot}/Inc/platform_${type}_wrapper.h`, content: wrapperHeader(type) },
    { path: `${wrapperRoot}/Src/platform_${type}_wrapper.c`, content: wrapperSource(type) }
  ];
}

async function writeGeneratedFiles(files, outputDir, { force = false } = {}) {
  const written = [];
  const root = path.resolve(outputDir);
  const targets = files.map((file) => ({ ...file, target: path.resolve(root, file.path) }));
  for (const file of targets) {
    if (!file.target.startsWith(`${root}${path.sep}`)) throw createError(`Generated path escapes output directory: ${file.path}`, 'INTERNAL');
    try {
      await fs.access(file.target);
      if (!force) throw createError(`Refusing to overwrite existing file: ${file.target}. Use --force after review.`, 'COLLISION');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  for (const file of targets) {
    await fs.mkdir(path.dirname(file.target), { recursive: true });
    await fs.writeFile(file.target, file.content, 'utf8');
    written.push(file.target);
  }
  return written;
}

module.exports = {
  CORE_PERIPHERALS,
  DEVICE_PROFILES,
  createError,
  generateSsd1306Display,
  generateBspDriver,
  generateCorePeripheral,
  normalizeCoreList,
  normalizeCorePeripheral,
  normalizeDevice,
  normalizeDeviceType,
  validateDeviceProfile,
  writeGeneratedFiles
};
