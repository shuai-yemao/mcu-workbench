const fs = require('fs').promises;
const path = require('path');
const { getPlatformConfig } = require('./platform');

const CORE_PERIPHERALS = ['gpio', 'i2c', 'spi', 'adc', 'tim', 'uart', 'wdg', 'rtc'];
const CORE_ALIASES = { iic: 'i2c' };
const DEVICE_PROFILES = {
  aht21: { deviceType: 'sensor', cores: ['i2c'] },
  mpu6050: { deviceType: 'sensor', cores: ['i2c'] },
  w25q64: { deviceType: 'externflash', cores: ['spi'] }
};

function createError(message, code = 'USAGE') {
  const error = new Error(message);
  error.code = code;
  return error;
}

function normalizeCorePeripheral(peripheral) {
  const normalized = String(peripheral || '').trim().toLowerCase();
  const canonical = CORE_ALIASES[normalized] || normalized;
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
  return `__${prefix.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_H__`;
}

function fileHeader(fileName, summary) {
  return `/**\n * @file ${fileName}\n * @brief ${summary}\n */\n`;
}

function coreHeader(core) {
  const prefix = `core_${core}`;
  return `${fileHeader(`${prefix}.h`, `${core.toUpperCase()} MCU communication abstraction.`)}
#ifndef ${guard(prefix)}
#define ${guard(prefix)}

/* Includes */
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

/* Public Types */
typedef enum {
    CORE_STATUS_OK = 0,
    CORE_STATUS_BUSY,
    CORE_STATUS_NOT_SUPPORTED,
    CORE_STATUS_INVALID_ARGUMENT,
    CORE_STATUS_IO_ERROR
} core_status_t;

typedef struct {
    uint32_t event_id;
    core_status_t status;
    uint32_t sequence;
} ${prefix}_event_t;

typedef struct {
    void *backend_context;
    core_status_t (*pf_init)(void *backend_context);
    core_status_t (*pf_transfer)(void *backend_context, const void *tx_data, void *rx_data, size_t length, uint32_t timeout_ms);
    core_status_t (*pf_start_async)(void *backend_context, const void *tx_data, void *rx_data, size_t length);
    core_status_t (*pf_cancel)(void *backend_context);
} ${prefix}_t;

/* Public Functions */
/** @brief Initializes an injected MCU ${core.toUpperCase()} backend. */
core_status_t ${prefix}_init(${prefix}_t *instance);
/** @brief Executes a synchronous transaction with timeout expressed in milliseconds. */
core_status_t ${prefix}_transfer(${prefix}_t *instance, const void *tx_data, void *rx_data, size_t length, uint32_t timeout_ms);
/** @brief Starts an optional asynchronous transaction. */
core_status_t ${prefix}_start_async(${prefix}_t *instance, const void *tx_data, void *rx_data, size_t length);
/** @brief Cancels an optional asynchronous transaction. */
core_status_t ${prefix}_cancel(${prefix}_t *instance);
/** @brief Converts an IRQ completion into a value event for upper layers. */
core_status_t ${prefix}_irq_dispatch(${prefix}_t *instance, ${prefix}_event_t *event);
/** @brief Converts a DMA IRQ completion into a value event for upper layers. */
core_status_t ${prefix}_dma_irq_dispatch(${prefix}_t *instance, ${prefix}_event_t *event);

#endif
`;
}

function coreSource(core) {
  const prefix = `core_${core}`;
  return `${fileHeader(`${prefix}.c`, `${core.toUpperCase()} MCU communication abstraction implementation.`)}
/* Includes */
#include "${prefix}.h"

/* Private Defines */
#define ${prefix.toUpperCase()}_EVENT_IRQ 1U
#define ${prefix.toUpperCase()}_EVENT_DMA_IRQ 2U

/* Public Functions */
core_status_t ${prefix}_init(${prefix}_t *instance) {
    if (instance == NULL || instance->pf_init == NULL) {
        return CORE_STATUS_INVALID_ARGUMENT;
    }
    return instance->pf_init(instance->backend_context);
}

core_status_t ${prefix}_transfer(${prefix}_t *instance, const void *tx_data, void *rx_data, size_t length, uint32_t timeout_ms) {
    if (instance == NULL || instance->pf_transfer == NULL) {
        return CORE_STATUS_INVALID_ARGUMENT;
    }
    return instance->pf_transfer(instance->backend_context, tx_data, rx_data, length, timeout_ms);
}

core_status_t ${prefix}_start_async(${prefix}_t *instance, const void *tx_data, void *rx_data, size_t length) {
    if (instance == NULL || instance->pf_start_async == NULL) {
        return CORE_STATUS_NOT_SUPPORTED;
    }
    return instance->pf_start_async(instance->backend_context, tx_data, rx_data, length);
}

core_status_t ${prefix}_cancel(${prefix}_t *instance) {
    if (instance == NULL || instance->pf_cancel == NULL) {
        return CORE_STATUS_NOT_SUPPORTED;
    }
    return instance->pf_cancel(instance->backend_context);
}

core_status_t ${prefix}_irq_dispatch(${prefix}_t *instance, ${prefix}_event_t *event) {
    if (instance == NULL || event == NULL) {
        return CORE_STATUS_INVALID_ARGUMENT;
    }
    event->event_id = ${prefix.toUpperCase()}_EVENT_IRQ;
    event->status = CORE_STATUS_OK;
    event->sequence += 1U;
    return CORE_STATUS_OK;
}

core_status_t ${prefix}_dma_irq_dispatch(${prefix}_t *instance, ${prefix}_event_t *event) {
    if (instance == NULL || event == NULL) {
        return CORE_STATUS_INVALID_ARGUMENT;
    }
    event->event_id = ${prefix.toUpperCase()}_EVENT_DMA_IRQ;
    event->status = CORE_STATUS_OK;
    event->sequence += 1U;
    return CORE_STATUS_OK;
}
`;
}

async function generateCorePeripheral(peripheral, platform) {
  const core = normalizeCorePeripheral(peripheral);
  getPlatformConfig(platform);
  return [
    { path: `Core/Inc/core_${core}.h`, content: coreHeader(core) },
    { path: `Core/Src/core_${core}.c`, content: coreSource(core) }
  ];
}

function driverConfig(device) {
  const prefix = `BSP_${device.stem.toUpperCase()}`;
  return `${fileHeader(`bsp_${device.stem}_config.h`, `${device.directory} device configuration.`)}
#ifndef ${guard(`bsp_${device.stem}_config`)}
#define ${guard(`bsp_${device.stem}_config`)}

/* Public Defines */
#define ${prefix}_DEFAULT_TIMEOUT_MS 100U
#define ${prefix}_DMA_ENABLED 1U
#define ${prefix}_IRQ_ENABLED 1U

#endif
`;
}

function driverHeader(device, primaryCore) {
  const prefix = `bsp_${device.stem}_driver`;
  return `${fileHeader(`${prefix}.h`, `${device.directory} protocol Driver interface.`)}
#ifndef ${guard(prefix)}
#define ${guard(prefix)}

/* Includes */
#include <stdbool.h>
#include <stdint.h>
#include "core_${primaryCore}.h"

/* Public Types */
typedef struct {
    bool is_inited;
    core_${primaryCore}_t *core;
    int32_t (*pf_read_id)(void *context, uint32_t *device_id);
    void *context;
} ${prefix}_t;

/* Public Functions */
/** @brief Returns the per-instance ${device.directory} Driver function table. */
${prefix}_t *${prefix}_inst(void);

#endif
`;
}

function driverSource(device) {
  const prefix = `bsp_${device.stem}_driver`;
  return `${fileHeader(`${prefix}.c`, `${device.directory} protocol Driver implementation.`)}
/* Includes */
#include "${prefix}.h"
#include "bsp_${device.stem}_config.h"

/* Private State */
static ${prefix}_t s_${device.stem}_driver;

/* Private Functions */
static int32_t ${device.stem}_driver_read_id(void *context, uint32_t *device_id) {
    ${prefix}_t *driver = context;
    if (driver == NULL || device_id == NULL || !driver->is_inited) {
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
`;
}

function handleHeader(type) {
  const prefix = `bsp_${type}_handle`;
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
    bool is_inited;
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
  const prefix = `bsp_${type}_handle`;
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
    if (handle == NULL) {
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
  const prefix = `drv_adapter_wrapper_${type}`;
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
  const prefix = `drv_adapter_wrapper_${type}`;
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
  const prefix = `drv_adapter_port_${type}`;
  return `${fileHeader(`${prefix}.h`, `${type} BSP Port registration interface.`)}
#ifndef ${guard(prefix)}
#define ${guard(prefix)}

/* Includes */
#include <stdint.h>

/* Public Functions */
/** @brief Composes Core, Driver and Handle instances, then registers Wrapper operations. */
int32_t ${prefix}_register(void);

#endif
`;
}

function portSource(type, device) {
  const prefix = `drv_adapter_port_${type}`;
  const handle = `bsp_${type}_handle`;
  const driver = `bsp_${device.stem}_driver`;
  const wrapper = `drv_adapter_wrapper_${type}`;
  return `${fileHeader(`${prefix}.c`, `${type} BSP Port composition and Wrapper registration.`)}
/* Includes */
#include "${prefix}.h"
#include "${handle}.h"
#include "${driver}.h"
#include "${wrapper}.h"

/* Private Composition */
static ${handle}_t *s_${type}_handle;

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
    ${handle}_driver_ops_t driver_ops;
    ${wrapper}_ops_t wrapper_ops;
    s_${type}_handle = ${handle}_inst();
    driver_ops.pf_read_id = driver->pf_read_id;
    driver_ops.context = driver->context;
    if (${handle}_register_driver(s_${type}_handle, &driver_ops) != 0) {
        return -1;
    }
    wrapper_ops.pf_read_id = ${type}_port_read_id;
    wrapper_ops.pf_set_event_callback = ${type}_port_set_event_callback;
    return ${wrapper}_register(&wrapper_ops);
}
`;
}

async function generateBspDriver({ deviceType, device: deviceValue, cores, platform, allowCustomDevice = false }) {
  getPlatformConfig(platform);
  const type = normalizeDeviceType(deviceType);
  const device = normalizeDevice(deviceValue);
  const normalizedCores = normalizeCoreList(cores);
  validateDeviceProfile({ deviceType: type, device, cores: normalizedCores, allowCustomDevice });
  const primaryCore = normalizedCores[0];
  const driverRoot = `Bsp/BoardDriver/${type}/Driver/${device.directory}`;
  const handleRoot = `Bsp/BoardDriver/${type}/Handle`;
  const portRoot = `Bsp/Porting/${type}`;
  const wrapperRoot = `Bsp/Wrapper/${type}`;
  return [
    { path: `${driverRoot}/Inc/bsp_${device.stem}_config.h`, content: driverConfig(device) },
    { path: `${driverRoot}/Inc/bsp_${device.stem}_driver.h`, content: driverHeader(device, primaryCore) },
    { path: `${driverRoot}/Src/bsp_${device.stem}_driver.c`, content: driverSource(device) },
    { path: `${handleRoot}/Inc/bsp_${type}_handle.h`, content: handleHeader(type) },
    { path: `${handleRoot}/Src/bsp_${type}_handle.c`, content: handleSource(type) },
    { path: `${portRoot}/Inc/drv_adapter_port_${type}.h`, content: portHeader(type) },
    { path: `${portRoot}/Src/drv_adapter_port_${type}.c`, content: portSource(type, device) },
    { path: `${wrapperRoot}/Inc/drv_adapter_wrapper_${type}.h`, content: wrapperHeader(type) },
    { path: `${wrapperRoot}/Src/drv_adapter_wrapper_${type}.c`, content: wrapperSource(type) }
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
  CORE_ALIASES,
  CORE_PERIPHERALS,
  DEVICE_PROFILES,
  createError,
  generateBspDriver,
  generateCorePeripheral,
  normalizeCoreList,
  normalizeCorePeripheral,
  normalizeDevice,
  normalizeDeviceType,
  validateDeviceProfile,
  writeGeneratedFiles
};
