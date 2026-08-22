const { getPlatformConfig } = require('../../platform');
const { fileHeader, guard } = require('../source-style');

function formatGeneratedFiles(files) {
  return require('../formatter').formatGeneratedFiles(files);
}

function driverConfig(device) {
  const prefix = `IMPL_${device.stem.toUpperCase()}`;
  return `${fileHeader(`impl_${device.stem}_config.h`, `${device.directory} 器件配置。`)}
#ifndef ${guard(`impl_${device.stem}_config`)}
#define ${guard(`impl_${device.stem}_config`)}

/* Public Defines */
#define ${prefix}_DEFAULT_TIMEOUT_MS 100U
#define ${prefix}_DMA_ENABLED 1U
#define ${prefix}_IRQ_ENABLED 1U

#endif
`;
}

function platformDeviceClass(deviceType, deviceStem) {
  const classes = {
    display: 'PLATFORM_DEVICE_CLASS_DISPLAY',
    touch: 'PLATFORM_DEVICE_CLASS_TOUCH',
    imu: 'PLATFORM_DEVICE_CLASS_IMU',
    sensor: deviceStem === 'aht21' ? 'PLATFORM_DEVICE_CLASS_TEMP_HUMI' : 'PLATFORM_DEVICE_CLASS_IMU',
    externflash: 'PLATFORM_DEVICE_CLASS_STORAGE',
    storage: 'PLATFORM_DEVICE_CLASS_STORAGE',
    backlight: 'PLATFORM_DEVICE_CLASS_BACKLIGHT',
    battery: 'PLATFORM_DEVICE_CLASS_BATTERY'
  };
  return classes[deviceType] || 'PLATFORM_DEVICE_CLASS_EVENT';
}

function modelHeaderV2(type) {
  const prefix = `platform_${type}`;
  return `${fileHeader(`${prefix}_model.h`, `${type} Platform BSP 设备模型。`, 'Model 只定义设备身份、四元组和 typed Ops；Driver、Handle 和板级资源由 Impl 装配。', ['<stddef.h>', '<stdint.h>', 'platform_device.h', 'platform_error.h', 'platform_lifecycle.h', 'platform_type.h'])}
#ifndef ${guard(`${prefix}_model`)}
#define ${guard(`${prefix}_model`)}

/* Includes */
#include <stddef.h>
#include <stdint.h>
#include "platform_device.h"
#include "platform_error.h"
#include "platform_lifecycle.h"
#include "platform_type.h"

/* Public Types */
typedef struct ${prefix}_device ${prefix}_device_t;

typedef struct {
    const void *p_resource_profile; /* Impl/resource 所有的资源描述，Model 不解释。 */
    uint32_t driver_count;          /* 已装配的同类 Driver 数量。 */
} ${prefix}_cfg_t;

typedef struct {
    void *backend_context; /* Impl Handle 上下文，Platform 只借用。 */
    uint8_t ready;
} ${prefix}_ctx_t;

typedef struct {
    uint32_t active_driver;
    uint32_t last_device_id;
    platform_err_t last_error;
} ${prefix}_data_t;

typedef struct {
    platform_err_t (*init)(${prefix}_device_t *p_dev);
    platform_err_t (*deinit)(${prefix}_device_t *p_dev);
    platform_err_t (*read_id)(${prefix}_device_t *p_dev, uint32_t driver_index, uint32_t *p_device_id);
    platform_err_t (*process)(${prefix}_device_t *p_dev);
} ${prefix}_ops_t;

struct ${prefix}_device {
    platform_device_t base;
    const ${prefix}_cfg_t *cfg;
    ${prefix}_ctx_t ctx;
    ${prefix}_data_t data;
    const ${prefix}_ops_t *ops;
};

/* Public Functions */
platform_err_t ${prefix}_init(${prefix}_device_t *p_dev, const char *p_name,
                              const ${prefix}_cfg_t *p_cfg,
                              const ${prefix}_ops_t *p_ops,
                              const platform_lifecycle_ops_t *p_lifecycle);
platform_err_t ${prefix}_register_default(${prefix}_device_t *p_dev);
${prefix}_device_t *${prefix}_get_default(void);

#endif /* ${guard(`${prefix}_model`)} */
`;
}

function modelSourceV2(type, deviceType, deviceStem) {
  const prefix = `platform_${type}`;
  const className = platformDeviceClass(deviceType, deviceStem);
  return `${fileHeader(`${prefix}_model.c`, `${type} Platform BSP 设备模型实现。`, 'Model 仅初始化公共对象身份和四元组，不承担器件协议、缓存、任务或资源绑定。', [`${prefix}_model.h`, 'platform_def.h'])}
/* Includes */
#include "${prefix}_model.h"

/* Private State */
static ${prefix}_device_t *s_${type}_default;

/* Public Functions */
platform_err_t ${prefix}_init(${prefix}_device_t *p_dev, const char *p_name,
                              const ${prefix}_cfg_t *p_cfg,
                              const ${prefix}_ops_t *p_ops,
                              const platform_lifecycle_ops_t *p_lifecycle) {
    platform_err_t ret;
    if ((p_dev == NULL) || (p_name == NULL) || (p_cfg == NULL) || (p_ops == NULL)) {
        return PLATFORM_ERR_PARAM;
    }
    ret = platform_device_init(&p_dev->base, p_name, ${className},
                               PLATFORM_DEVICE_CAP_READ | PLATFORM_DEVICE_CAP_WRITE |
                                   PLATFORM_DEVICE_CAP_CONTROL | PLATFORM_DEVICE_CAP_IRQ |
                                   PLATFORM_DEVICE_CAP_DMA,
                               p_dev, p_lifecycle);
    if (ret != PLATFORM_ERR_OK) {
        return ret;
    }
    p_dev->cfg = p_cfg;
    p_dev->ops = p_ops;
    p_dev->ctx.backend_context = NULL;
    p_dev->ctx.ready = 0U;
    p_dev->data.active_driver = 0U;
    p_dev->data.last_device_id = 0U;
    p_dev->data.last_error = PLATFORM_ERR_OK;
    return PLATFORM_ERR_OK;
}

platform_err_t ${prefix}_register_default(${prefix}_device_t *p_dev) {
    if (p_dev == NULL) return PLATFORM_ERR_PARAM;
    if (s_${type}_default != NULL) {
        return (s_${type}_default == p_dev) ? PLATFORM_ERR_ALREADY_INIT : PLATFORM_ERR_BUSY;
    }
    s_${type}_default = p_dev;
    return PLATFORM_ERR_OK;
}

${prefix}_device_t *${prefix}_get_default(void) {
    return s_${type}_default;
}
`;
}

function driverHeaderV2(device) {
  const prefix = `impl_${device.stem}_driver`;
  return `${fileHeader(`${prefix}.h`, `${device.directory} 协议 Driver 四元组。`, 'Driver 是一个具体物理设备实例；只对 Port 暴露构造函数，IRQ/DMA 通过注入的 MCU Ops 进入协议实现。', ['<stdint.h>', 'platform_error.h'])}
#ifndef ${guard(prefix)}
#define ${guard(prefix)}

/* Includes */
#include <stdint.h>
#include "platform_error.h"

/* Public Types */
typedef struct ${prefix}_ops ${prefix}_ops_t;
typedef struct {
    uint32_t timeout_ms;
} ${prefix}_cfg_t;
typedef struct {
    platform_err_t (*pf_transaction)(void *p_context);
    void *p_context;
    platform_err_t (*pf_chip_feature)(void *p_context);
    void *p_mcu_context;
} ${prefix}_ctx_t;
typedef struct {
    uint32_t last_device_id;
    platform_err_t last_error;
    uint8_t is_inited;
} ${prefix}_data_t;
typedef struct {
    const ${prefix}_cfg_t *cfg;
    ${prefix}_ctx_t ctx;
    ${prefix}_data_t data;
    const ${prefix}_ops_t *ops;
} ${prefix}_t;

struct ${prefix}_ops {
    platform_err_t (*read_id)(void *p_context, uint32_t *p_device_id);
};

/* Public Functions */
/** @brief 构造一个由调用者持有的 ${device.directory} Driver 实例。 */
platform_err_t ${prefix}_construct(${prefix}_t *p_driver,
                                   const ${prefix}_cfg_t *p_cfg,
                                   const ${prefix}_ctx_t *p_ctx);

#endif /* ${guard(prefix)} */
`;
}

function driverSourceV2(device) {
  const prefix = `impl_${device.stem}_driver`;
  return `${fileHeader(`${prefix}.c`, `${device.directory} 协议 Driver 实现。`, 'Driver 只执行器件协议；Core/MCU 的事务、IRQ 和 DMA 能力由 Port 注入。', [`${prefix}.h`, `impl_${device.stem}_config.h`])}
/* Includes */
#include "${prefix}.h"
#include "impl_${device.stem}_config.h"

/* Private Functions */
static platform_err_t ${device.stem}_driver_read_id(void *p_context, uint32_t *p_device_id) {
    ${prefix}_t *p_driver = p_context;
    if ((p_driver == NULL) || (p_device_id == NULL) ||
        (p_driver->ctx.pf_transaction == NULL) || (p_driver->ctx.pf_chip_feature == NULL)) {
        return PLATFORM_ERR_PARAM;
    }
    if ((p_driver->ctx.pf_transaction(p_driver->ctx.p_context) != PLATFORM_ERR_OK) ||
        (p_driver->ctx.pf_chip_feature(p_driver->ctx.p_mcu_context) != PLATFORM_ERR_OK)) {
        p_driver->data.last_error = PLATFORM_ERR_FAIL;
        return p_driver->data.last_error;
    }
    *p_device_id = 0U;
    p_driver->data.last_device_id = *p_device_id;
    p_driver->data.is_inited = 1U;
    p_driver->data.last_error = PLATFORM_ERR_OK;
    return PLATFORM_ERR_OK;
}

/* Private State */
static const ${prefix}_ops_t s_${device.stem}_driver_ops = {
    .read_id = ${device.stem}_driver_read_id
};

/* Public Functions */
platform_err_t ${prefix}_construct(${prefix}_t *p_driver,
                                   const ${prefix}_cfg_t *p_cfg,
                                   const ${prefix}_ctx_t *p_ctx) {
    if ((p_driver == NULL) || (p_cfg == NULL) || (p_ctx == NULL)) {
        return PLATFORM_ERR_PARAM;
    }
    p_driver->cfg = p_cfg;
    p_driver->ctx = *p_ctx;
    p_driver->data.last_device_id = 0U;
    p_driver->data.last_error = PLATFORM_ERR_OK;
    p_driver->data.is_inited = 0U;
    p_driver->ops = &s_${device.stem}_driver_ops;
    return PLATFORM_ERR_OK;
}
`;
}

function handleHeaderV2(type) {
  const prefix = `impl_${type}_handle`;
  const model = `platform_${type}_model`;
  return `${fileHeader(`${prefix}.h`, `${type} 同类 Driver Handle 四元组。`, 'Handle 只组合一个设备类别的 Driver 集合；其 ops 为 Impl 内部行为表，Platform-facing 函数以独立声明暴露。', ['<stddef.h>', '<stdint.h>', 'platform_error.h', `${model}.h`])}
#ifndef ${guard(prefix)}
#define ${guard(prefix)}

/* Includes */
#include <stddef.h>
#include <stdint.h>
#include "platform_error.h"
#include "${model}.h"

/* Public Types */
typedef struct {
    void *p_context;
    platform_err_t (*read_id)(void *p_context, uint32_t *p_device_id);
} ${prefix}_driver_ref_t;
typedef struct ${prefix}_ops ${prefix}_ops_t;
typedef struct {
    const ${prefix}_driver_ref_t *p_drivers;
    size_t driver_count;
    void *p_os_context;
} ${prefix}_cfg_t;
typedef struct {
    uint32_t active_driver;
    uint8_t is_inited;
} ${prefix}_ctx_t;
typedef struct {
    uint32_t last_device_id;
    platform_err_t last_error;
    uint32_t successful_reads;
} ${prefix}_data_t;
typedef struct {
    const ${prefix}_cfg_t *cfg;
    ${prefix}_ctx_t ctx;
    ${prefix}_data_t data;
    const ${prefix}_ops_t *ops;
} ${prefix}_t;

struct ${prefix}_ops {
    platform_err_t (*init)(${prefix}_t *p_handle);
    platform_err_t (*deinit)(${prefix}_t *p_handle);
    platform_err_t (*read_id)(${prefix}_t *p_handle, uint32_t driver_index, uint32_t *p_device_id);
    platform_err_t (*process)(${prefix}_t *p_handle);
};

/* 组合根装配接口 */
platform_err_t ${prefix}_construct(${prefix}_t *p_handle,
                                   const ${prefix}_cfg_t *p_cfg,
                                   const ${prefix}_ctx_t *p_ctx);

/* Public Functions */
/* 平台适配接口：函数签名直接匹配 platform_${type}_ops_t。 */
platform_err_t ${prefix}_init(platform_${type}_device_t *p_dev);
platform_err_t ${prefix}_deinit(platform_${type}_device_t *p_dev);
platform_err_t ${prefix}_read_id(platform_${type}_device_t *p_dev,
                                 uint32_t driver_index, uint32_t *p_device_id);
platform_err_t ${prefix}_process(platform_${type}_device_t *p_dev);

#endif /* ${guard(prefix)} */
`;
}

function handleSourceV2(type) {
  const prefix = `impl_${type}_handle`;
  return `${fileHeader(`${prefix}.c`, `${type} 同类 Driver Handle 实现。`, 'Handle 聚合同类 Driver 的生命周期、读取结果和事件状态；不实现器件协议。', [`${prefix}.h`])}
/* Includes */
#include "${prefix}.h"

/* Private Functions */
static platform_err_t ${type}_handle_init_impl(${prefix}_t *p_handle) {
    if ((p_handle == NULL) || (p_handle->cfg == NULL) ||
        (p_handle->cfg->p_drivers == NULL) || (p_handle->cfg->driver_count == 0U)) {
        return PLATFORM_ERR_PARAM;
    }
    p_handle->ctx.is_inited = 1U;
    return PLATFORM_ERR_OK;
}

static platform_err_t ${type}_handle_deinit_impl(${prefix}_t *p_handle) {
    if (p_handle == NULL) return PLATFORM_ERR_PARAM;
    p_handle->ctx.is_inited = 0U;
    return PLATFORM_ERR_OK;
}

static platform_err_t ${type}_handle_read_id_impl(${prefix}_t *p_handle,
                                                 uint32_t driver_index,
                                                 uint32_t *p_device_id) {
    const ${prefix}_driver_ref_t *p_ref;
    platform_err_t ret;
    if ((p_handle == NULL) || (p_device_id == NULL) || (p_handle->cfg == NULL) ||
        (p_handle->ctx.is_inited == 0U) || (driver_index >= p_handle->cfg->driver_count)) {
        return PLATFORM_ERR_PARAM;
    }
    p_ref = &p_handle->cfg->p_drivers[driver_index];
    if ((p_ref->read_id == NULL) || (p_ref->p_context == NULL)) return PLATFORM_ERR_PARAM;
    ret = p_ref->read_id(p_ref->p_context, p_device_id);
    p_handle->ctx.active_driver = (uint32_t)driver_index;
    p_handle->data.last_error = ret;
    if (ret == PLATFORM_ERR_OK) {
        p_handle->data.last_device_id = *p_device_id;
        p_handle->data.successful_reads++;
    }
    return ret;
}

static platform_err_t ${type}_handle_process_impl(${prefix}_t *p_handle) {
    if ((p_handle == NULL) || (p_handle->ctx.is_inited == 0U)) return PLATFORM_ERR_NOT_INITIALIZED;
    return PLATFORM_ERR_OK;
}

/* Private State */
static const ${prefix}_ops_t s_${type}_handle_ops = {
    .init = ${type}_handle_init_impl,
    .deinit = ${type}_handle_deinit_impl,
    .read_id = ${type}_handle_read_id_impl,
    .process = ${type}_handle_process_impl
};

/* Public Functions */
platform_err_t ${prefix}_construct(${prefix}_t *p_handle,
                                   const ${prefix}_cfg_t *p_cfg,
                                   const ${prefix}_ctx_t *p_ctx) {
    if ((p_handle == NULL) || (p_cfg == NULL) || (p_ctx == NULL)) return PLATFORM_ERR_PARAM;
    p_handle->cfg = p_cfg;
    p_handle->ctx = *p_ctx;
    p_handle->data.last_device_id = 0U;
    p_handle->data.last_error = PLATFORM_ERR_OK;
    p_handle->data.successful_reads = 0U;
    p_handle->ops = &s_${type}_handle_ops;
    return PLATFORM_ERR_OK;
}

static ${prefix}_t *${type}_handle_from_device(platform_${type}_device_t *p_dev) {
    return (p_dev == NULL) ? NULL : ((${prefix}_t *)p_dev->ctx.backend_context);
}

platform_err_t ${prefix}_init(platform_${type}_device_t *p_dev) {
    ${prefix}_t *p_handle = ${type}_handle_from_device(p_dev);
    return (p_handle == NULL) ? PLATFORM_ERR_PARAM : p_handle->ops->init(p_handle);
}

platform_err_t ${prefix}_deinit(platform_${type}_device_t *p_dev) {
    ${prefix}_t *p_handle = ${type}_handle_from_device(p_dev);
    return (p_handle == NULL) ? PLATFORM_ERR_PARAM : p_handle->ops->deinit(p_handle);
}

platform_err_t ${prefix}_read_id(platform_${type}_device_t *p_dev,
                                 uint32_t driver_index, uint32_t *p_device_id) {
    ${prefix}_t *p_handle = ${type}_handle_from_device(p_dev);
    return (p_handle == NULL) ? PLATFORM_ERR_PARAM :
        p_handle->ops->read_id(p_handle, driver_index, p_device_id);
}

platform_err_t ${prefix}_process(platform_${type}_device_t *p_dev) {
    ${prefix}_t *p_handle = ${type}_handle_from_device(p_dev);
    return (p_handle == NULL) ? PLATFORM_ERR_PARAM : p_handle->ops->process(p_handle);
}
`;
}

function portHeaderV2(type) {
  const prefix = `impl_${type}_handle_port`;
  return `${fileHeader(`${prefix}.h`, `${type} BSP Port 注册接口。`, 'Port 从 resource 获取 MCU/Core 实例，构造 Driver 与同类 Handle，并注册 Platform Device。', ['<stdint.h>', 'platform_error.h'])}
#ifndef ${guard(prefix)}
#define ${guard(prefix)}

/* Includes */
#include <stdint.h>
#include "platform_error.h"

/* Public Functions */
platform_err_t ${prefix}_register(void);

#endif /* ${guard(prefix)} */
`;
}

function portSourceV2(type, device, primaryCore) {
  const prefix = `impl_${type}_handle_port`;
  const driverPrefix = `impl_${device.stem}_driver`;
  const handlePrefix = `impl_${type}_handle`;
  const modelPrefix = `platform_${type}`;
  return `${fileHeader(`${prefix}.c`, `${type} BSP Port 组合根。`, 'Port 只做 resource 注入、对象构造、函数绑定和 Platform Device 注册，不实现协议或运行时策略。', [`${prefix}.h`, `${driverPrefix}.h`, `${handlePrefix}.h`, `${modelPrefix}_model.h`])}
/* Includes */
#include "${prefix}.h"
#include "${driverPrefix}.h"
#include "${handlePrefix}.h"
#include "${modelPrefix}_model.h"

/* 资源注入接口：具体 resource.c 提供已注册的 MCU/Core 操作与上下文。 */
/* Private Types */
typedef struct {
    platform_err_t (*pf_transaction)(void *p_context);
    void *p_context;
    platform_err_t (*pf_chip_feature)(void *p_context);
    void *p_mcu_context;
} ${type}_resource_ops_t;

extern const ${type}_resource_ops_t *${type}_resource_get_ops(void);

/* Private Composition */
static ${driverPrefix}_t s_${device.stem}_driver;
static ${handlePrefix}_driver_ref_t s_${type}_driver_refs[1];
static ${handlePrefix}_t s_${type}_handle;
static ${modelPrefix}_device_t s_${type}_device;
static const ${driverPrefix}_cfg_t s_${device.stem}_driver_cfg = { .timeout_ms = 100U };
static const ${modelPrefix}_cfg_t s_${type}_model_cfg = {
    .p_resource_profile = NULL,
    .driver_count = 1U
};

/* Public Functions */
platform_err_t ${prefix}_register(void) {
    const ${type}_resource_ops_t *p_resource_ops = ${type}_resource_get_ops();
    ${driverPrefix}_ctx_t driver_ctx;
    ${handlePrefix}_cfg_t handle_cfg;
    ${handlePrefix}_ctx_t handle_ctx = { .active_driver = 0U, .is_inited = 0U };
    ${modelPrefix}_ops_t model_ops = {
        .init = ${handlePrefix}_init,
        .deinit = ${handlePrefix}_deinit,
        .read_id = ${handlePrefix}_read_id,
        .process = ${handlePrefix}_process
    };
    platform_err_t ret;
    if ((p_resource_ops == NULL) || (p_resource_ops->pf_transaction == NULL) ||
        (p_resource_ops->pf_chip_feature == NULL)) {
        return PLATFORM_ERR_NO_RESOURCE;
    }
    driver_ctx.pf_transaction = p_resource_ops->pf_transaction;
    driver_ctx.p_context = p_resource_ops->p_context;
    driver_ctx.pf_chip_feature = p_resource_ops->pf_chip_feature;
    driver_ctx.p_mcu_context = p_resource_ops->p_mcu_context;
    ret = ${driverPrefix}_construct(&s_${device.stem}_driver, &s_${device.stem}_driver_cfg, &driver_ctx);
    if (ret != PLATFORM_ERR_OK) return ret;
    s_${type}_driver_refs[0].p_context = &s_${device.stem}_driver;
    s_${type}_driver_refs[0].read_id = s_${device.stem}_driver.ops->read_id;
    handle_cfg.p_drivers = s_${type}_driver_refs;
    handle_cfg.driver_count = 1U;
    handle_cfg.p_os_context = NULL;
    ret = ${handlePrefix}_construct(&s_${type}_handle, &handle_cfg, &handle_ctx);
    if (ret != PLATFORM_ERR_OK) return ret;
    ret = ${modelPrefix}_init(&s_${type}_device, "${type}", &s_${type}_model_cfg, &model_ops, NULL);
    if (ret != PLATFORM_ERR_OK) return ret;
    s_${type}_device.ctx.backend_context = &s_${type}_handle;
    ret = ${modelPrefix}_register_default(&s_${type}_device);
    if (ret != PLATFORM_ERR_OK) return ret;
    return ${handlePrefix}_init(&s_${type}_device);
}
`;
}

function generateModelFirstBsp({ deviceType, device, cores }) {
  const primaryCore = cores[0];
  const driverRoot = `04_Impl/impl_bsp/impl_bsp_hal_driver/${device.directory}`;
  const handleRoot = `04_Impl/impl_bsp/impl_bsp_handle/${deviceType}`;
  const portRoot = '04_Impl/impl_bsp/impl_bsp_port';
  const modelRoot = `03_Platform/platform_bsp/${deviceType}`;
  const files = [
    { path: `${modelRoot}/Inc/platform_${deviceType}_model.h`, content: modelHeaderV2(deviceType) },
    { path: `${modelRoot}/Src/platform_${deviceType}_model.c`, content: modelSourceV2(deviceType, deviceType, device.stem) },
    { path: `${driverRoot}/Inc/impl_${device.stem}_config.h`, content: driverConfig(device) },
    { path: `${driverRoot}/Inc/impl_${device.stem}_driver.h`, content: driverHeaderV2(device, primaryCore) },
    { path: `${driverRoot}/Src/impl_${device.stem}_driver.c`, content: driverSourceV2(device) },
    { path: `${handleRoot}/Inc/impl_${deviceType}_handle.h`, content: handleHeaderV2(deviceType) },
    { path: `${handleRoot}/Src/impl_${deviceType}_handle.c`, content: handleSourceV2(deviceType) },
    { path: `${portRoot}/Inc/impl_${deviceType}_handle_port.h`, content: portHeaderV2(deviceType) },
    { path: `${portRoot}/Src/impl_${deviceType}_handle_port.c`, content: portSourceV2(deviceType, device, primaryCore) }
  ];
  Object.defineProperty(files, 'manifest', {
    enumerable: false,
    value: {
      device: device.directory, deviceType, cores,
      osalResources: [], styleProfile: 'style-profile',
      apiMapping: ['Platform Device Model -> Handle', 'Handle -> same-class Driver set', 'Driver -> Core/MCU Ops'],
      blocking: [], isrSafe: [],
      unresolved: ['UNRESOLVED_RESOURCE_API: bind resource-provided MCU/Core instances before production integration']
    }
  });
  return formatGeneratedFiles(files);
}

function generateSsd1306Display() {
  return generateModelFirstBsp({
    deviceType: 'display',
    device: { directory: 'SSD1306', stem: 'ssd1306' },
    cores: ['i2c']
  });
}

async function generateBspDriver({ deviceType, device: deviceValue, cores, platform, allowCustomDevice = false }) {
  const generator = require('../../generator');
  getPlatformConfig(platform);
  const type = generator.normalizeDeviceType(deviceType);
  const device = generator.normalizeDevice(deviceValue);
  const normalizedCores = generator.normalizeCoreList(cores);
  generator.validateDeviceProfile({
    deviceType: type,
    device,
    cores: normalizedCores,
    allowCustomDevice
  });
  const profile = generator.DEVICE_PROFILES[device.stem];
  if (profile && profile.template === 'ssd1306-display') {
    return generateSsd1306Display();
  }
  return generateModelFirstBsp({ deviceType: type, device, cores: normalizedCores });
}

module.exports = {
  id: 'impl-bsp.model-first',
  layer: 'platform_bsp',
  version: '2',
  skill: 'impl_bsp',
  render: async (request) => generateBspDriver(request),
  generateBspDriver,
  generateSsd1306Display
};
