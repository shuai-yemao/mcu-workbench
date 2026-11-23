const { fileHeader } = require('../source-style');

function formatGeneratedFiles(files) {
  return require('../formatter').formatGeneratedFiles(files);
}

function header(fileName, summary, includes, body, guardName) {
  return `${fileHeader(fileName, summary)}
#ifndef ${guardName}
#define ${guardName}

/* Includes */
${includes.map((include) => `#include ${include}`).join('\n')}

${body}

#endif /* ${guardName} */
`;
}

function platformTypeHeader() {
  return header('platform_type.h', 'Platform 公共基础类型出口。', [], `
typedef signed char int8_t;
typedef unsigned char uint8_t;
typedef signed short int16_t;
typedef unsigned short uint16_t;
typedef signed int int32_t;
typedef unsigned int uint32_t;
typedef signed long long int64_t;
typedef unsigned long long uint64_t;
typedef float float_t;
typedef double double_t;
typedef char char_t;
typedef unsigned char uchar_t;
typedef unsigned char bool_t;`, 'PLATFORM_TYPE_H');
}

function platformErrorHeader() {
  return header('platform_error.h', 'Platform 统一错误码。', ['"platform_type.h"'], `
typedef enum
{
    PLATFORM_ERR_OK              = 0,
    PLATFORM_ERR_GENERAL         = 1,
    PLATFORM_ERR_TIMEOUT         = 2,
    PLATFORM_ERR_PARAM           = 3,
    PLATFORM_ERR_NO_MEMORY       = 4,
    PLATFORM_ERR_NO_RESOURCE     = 5,
    PLATFORM_ERR_NOT_SUPPORTED   = 6,
    PLATFORM_ERR_NOT_INITIALIZED = 7,
    PLATFORM_ERR_ALREADY_INIT    = 8,
    PLATFORM_ERR_BUSY            = 9,
    PLATFORM_ERR_FAIL            = 10,
    PLATFORM_ERR_NOT_FOUND       = 11,
    PLATFORM_ERR_RESERVED        = 0x7FFFFFFF
} platform_err_t;

#define PLATFORM_IS_ERR(err) ((err) != PLATFORM_ERR_OK)
#define PLATFORM_IS_OK(err)  ((err) == PLATFORM_ERR_OK)`, 'PLATFORM_ERROR_H');
}

function platformDefHeader() {
  return header('platform_def.h', 'Platform 公共宏和延时声明。', ['"platform_type.h"'], `
#ifndef NULL
#define NULL ((void *)0)
#endif

#define PLATFORM_OK       (0U)
#define PLATFORM_ERROR    (1U)
#define PLATFORM_TRUE     (1U)
#define PLATFORM_FALSE    (0U)
#define PLATFORM_ALIGN_SIZE (4U)
#define PLATFORM_ALIGN(n) (((n) + PLATFORM_ALIGN_SIZE - 1U) & ~(PLATFORM_ALIGN_SIZE - 1U))
#define ARRAY_SIZE(array) (sizeof(array) / sizeof((array)[0]))
#define PLATFORM_DELAY_MS(ms) platform_delay_ms((uint32_t)(ms))
#define PLATFORM_DELAY_US(us) platform_delay_us((uint32_t)(us))

typedef bool_t platform_bool_t;

void platform_delay_ms(uint32_t milliseconds);
void platform_delay_us(uint32_t microseconds);`, 'PLATFORM_DEF_H');
}

function lifecycleHeader() {
  return header('platform_lifecycle.h', 'Platform 对象生命周期回调契约。', ['"platform_error.h"'], `
typedef struct
{
    platform_err_t (*init)(void *p_self);
    platform_err_t (*start)(void *p_self);
    platform_err_t (*process)(void *p_self);
    platform_err_t (*stop)(void *p_self);
    platform_err_t (*sleep)(void *p_self);
    platform_err_t (*wakeup)(void *p_self);
    platform_err_t (*deinit)(void *p_self);
} platform_lifecycle_ops_t;

typedef enum
{
    PLATFORM_LIFECYCLE_STAGE_INIT = 0,
    PLATFORM_LIFECYCLE_STAGE_START,
    PLATFORM_LIFECYCLE_STAGE_PROCESS,
    PLATFORM_LIFECYCLE_STAGE_STOP,
    PLATFORM_LIFECYCLE_STAGE_SLEEP,
    PLATFORM_LIFECYCLE_STAGE_WAKEUP,
    PLATFORM_LIFECYCLE_STAGE_DEINIT,
    PLATFORM_LIFECYCLE_STAGE_RESERVED = 0x7FFFFFFF
} platform_lifecycle_stage_t;`, 'PLATFORM_LIFECYCLE_H');
}

function objectHeader() {
  return header('platform_object.h', 'Platform 对象身份、父子关系和生命周期状态模型。', ['"platform_def.h"', '"platform_lifecycle.h"'], `
#define PLATFORM_OBJECT_MAGIC (0x504F424Au)

typedef enum
{
    PLATFORM_OBJECT_DEVICE = 0,
    PLATFORM_OBJECT_SERVICE,
    PLATFORM_OBJECT_MANAGER,
    PLATFORM_OBJECT_APP
} platform_object_type_t;

typedef enum
{
    PLATFORM_OBJECT_CREATED = 0,
    PLATFORM_OBJECT_REGISTERED,
    PLATFORM_OBJECT_INITIALIZED,
    PLATFORM_OBJECT_STARTED,
    PLATFORM_OBJECT_STOPPED,
    PLATFORM_OBJECT_DEINITIALIZED,
    PLATFORM_OBJECT_ERROR
} platform_object_state_t;

typedef struct
{
    uint32_t magic;
    const char *name;
    platform_object_type_t type;
    platform_object_state_t state;
    uint32_t flags;
    void *p_self;
    void *p_parent;
    const platform_lifecycle_ops_t *p_lifecycle;
    void *user_data;
} platform_object_t;

platform_err_t platform_object_init(platform_object_t *p_obj,
                                    const char *p_name,
                                    platform_object_type_t type,
                                    void *p_self,
                                    void *p_parent,
                                    const platform_lifecycle_ops_t *p_lifecycle);
platform_err_t platform_object_set_state(platform_object_t *p_obj,
                                         platform_object_state_t state);
platform_err_t platform_object_set_parent(platform_object_t *p_obj,
                                          void *p_parent);
bool_t platform_object_is_valid(const platform_object_t *p_obj,
                                platform_object_type_t expected_type);
platform_err_t platform_object_lifecycle_register(platform_object_t *p_obj,
                                                   void *p_parent);
platform_err_t platform_object_lifecycle_run(platform_object_t *p_obj,
                                             platform_lifecycle_stage_t stage);
platform_err_t platform_object_lifecycle_init(platform_object_t *p_obj);
platform_err_t platform_object_lifecycle_start(platform_object_t *p_obj);
platform_err_t platform_object_lifecycle_process(platform_object_t *p_obj);
platform_err_t platform_object_lifecycle_stop(platform_object_t *p_obj);
platform_err_t platform_object_lifecycle_sleep(platform_object_t *p_obj);
platform_err_t platform_object_lifecycle_wakeup(platform_object_t *p_obj);
platform_err_t platform_object_lifecycle_deinit(platform_object_t *p_obj);`, 'PLATFORM_OBJECT_H');
}

function objectSource() {
  return `${fileHeader('platform_object.c', 'Platform 对象身份和生命周期状态实现。')}
/* Includes */
#include "platform_object.h"

static platform_err_t platform_object_run_hook(platform_object_t *p_obj,
                                                platform_err_t (*hook)(void *p_self),
                                                platform_object_state_t success_state) {
    platform_err_t ret;
    if (p_obj == NULL) return PLATFORM_ERR_PARAM;
    ret = (hook == NULL) ? PLATFORM_ERR_OK : hook(p_obj->p_self);
    if (ret != PLATFORM_ERR_OK) {
        p_obj->state = PLATFORM_OBJECT_ERROR;
        return ret;
    }
    p_obj->state = success_state;
    return PLATFORM_ERR_OK;
}

platform_err_t platform_object_init(platform_object_t *p_obj,
                                    const char *p_name,
                                    platform_object_type_t type,
                                    void *p_self,
                                    void *p_parent,
                                    const platform_lifecycle_ops_t *p_lifecycle) {
    if (p_obj == NULL) return PLATFORM_ERR_PARAM;
    p_obj->magic = PLATFORM_OBJECT_MAGIC;
    p_obj->name = p_name;
    p_obj->type = type;
    p_obj->state = PLATFORM_OBJECT_CREATED;
    p_obj->flags = 0U;
    p_obj->p_self = (p_self != NULL) ? p_self : p_obj;
    p_obj->p_parent = p_parent;
    p_obj->p_lifecycle = p_lifecycle;
    p_obj->user_data = NULL;
    return PLATFORM_ERR_OK;
}

platform_err_t platform_object_set_state(platform_object_t *p_obj,
                                         platform_object_state_t state) {
    if (p_obj == NULL) return PLATFORM_ERR_PARAM;
    p_obj->state = state;
    return PLATFORM_ERR_OK;
}

platform_err_t platform_object_set_parent(platform_object_t *p_obj, void *p_parent) {
    if (p_obj == NULL) return PLATFORM_ERR_PARAM;
    p_obj->p_parent = p_parent;
    return PLATFORM_ERR_OK;
}

bool_t platform_object_is_valid(const platform_object_t *p_obj,
                                platform_object_type_t expected_type) {
    return (p_obj != NULL) && (p_obj->magic == PLATFORM_OBJECT_MAGIC)
        && (p_obj->type == expected_type);
}

platform_err_t platform_object_lifecycle_register(platform_object_t *p_obj, void *p_parent) {
    platform_err_t ret = platform_object_set_parent(p_obj, p_parent);
    if (ret != PLATFORM_ERR_OK) return ret;
    return platform_object_set_state(p_obj, PLATFORM_OBJECT_REGISTERED);
}

platform_err_t platform_object_lifecycle_run(platform_object_t *p_obj,
                                             platform_lifecycle_stage_t stage) {
    if (p_obj == NULL) return PLATFORM_ERR_PARAM;
    switch (stage) {
    case PLATFORM_LIFECYCLE_STAGE_INIT: return platform_object_lifecycle_init(p_obj);
    case PLATFORM_LIFECYCLE_STAGE_START: return platform_object_lifecycle_start(p_obj);
    case PLATFORM_LIFECYCLE_STAGE_PROCESS: return platform_object_lifecycle_process(p_obj);
    case PLATFORM_LIFECYCLE_STAGE_STOP: return platform_object_lifecycle_stop(p_obj);
    case PLATFORM_LIFECYCLE_STAGE_SLEEP: return platform_object_lifecycle_sleep(p_obj);
    case PLATFORM_LIFECYCLE_STAGE_WAKEUP: return platform_object_lifecycle_wakeup(p_obj);
    case PLATFORM_LIFECYCLE_STAGE_DEINIT: return platform_object_lifecycle_deinit(p_obj);
    default: return PLATFORM_ERR_PARAM;
    }
}

platform_err_t platform_object_lifecycle_init(platform_object_t *p_obj) {
    if (p_obj == NULL) return PLATFORM_ERR_PARAM;
    if ((p_obj->state == PLATFORM_OBJECT_INITIALIZED)
        || (p_obj->state == PLATFORM_OBJECT_STARTED)) return PLATFORM_ERR_OK;
    return platform_object_run_hook(p_obj, p_obj->p_lifecycle == NULL ? NULL : p_obj->p_lifecycle->init,
                                    PLATFORM_OBJECT_INITIALIZED);
}

platform_err_t platform_object_lifecycle_start(platform_object_t *p_obj) {
    if (p_obj == NULL) return PLATFORM_ERR_PARAM;
    if (p_obj->state == PLATFORM_OBJECT_STARTED) return PLATFORM_ERR_OK;
    return platform_object_run_hook(p_obj, p_obj->p_lifecycle == NULL ? NULL : p_obj->p_lifecycle->start,
                                    PLATFORM_OBJECT_STARTED);
}

platform_err_t platform_object_lifecycle_process(platform_object_t *p_obj) {
    if (p_obj == NULL) return PLATFORM_ERR_PARAM;
    if (p_obj->state != PLATFORM_OBJECT_STARTED) return PLATFORM_ERR_OK;
    if ((p_obj->p_lifecycle == NULL) || (p_obj->p_lifecycle->process == NULL)) return PLATFORM_ERR_OK;
    return platform_object_run_hook(p_obj, p_obj->p_lifecycle->process, PLATFORM_OBJECT_STARTED);
}

platform_err_t platform_object_lifecycle_stop(platform_object_t *p_obj) {
    if (p_obj == NULL) return PLATFORM_ERR_PARAM;
    if (p_obj->state != PLATFORM_OBJECT_STARTED) {
        p_obj->state = PLATFORM_OBJECT_STOPPED;
        return PLATFORM_ERR_OK;
    }
    return platform_object_run_hook(p_obj, p_obj->p_lifecycle == NULL ? NULL : p_obj->p_lifecycle->stop,
                                    PLATFORM_OBJECT_STOPPED);
}

platform_err_t platform_object_lifecycle_sleep(platform_object_t *p_obj) {
    if (p_obj == NULL) return PLATFORM_ERR_PARAM;
    if (p_obj->state != PLATFORM_OBJECT_STARTED) return PLATFORM_ERR_OK;
    if ((p_obj->p_lifecycle == NULL) || (p_obj->p_lifecycle->sleep == NULL)) return PLATFORM_ERR_OK;
    return platform_object_run_hook(p_obj, p_obj->p_lifecycle->sleep, PLATFORM_OBJECT_STARTED);
}

platform_err_t platform_object_lifecycle_wakeup(platform_object_t *p_obj) {
    if (p_obj == NULL) return PLATFORM_ERR_PARAM;
    if (p_obj->state != PLATFORM_OBJECT_STARTED) return PLATFORM_ERR_OK;
    if ((p_obj->p_lifecycle == NULL) || (p_obj->p_lifecycle->wakeup == NULL)) return PLATFORM_ERR_OK;
    return platform_object_run_hook(p_obj, p_obj->p_lifecycle->wakeup, PLATFORM_OBJECT_STARTED);
}

platform_err_t platform_object_lifecycle_deinit(platform_object_t *p_obj) {
    if (p_obj == NULL) return PLATFORM_ERR_PARAM;
    if ((p_obj->p_lifecycle == NULL) || (p_obj->p_lifecycle->deinit == NULL)) {
        p_obj->state = PLATFORM_OBJECT_DEINITIALIZED;
        return PLATFORM_ERR_OK;
    }
    return platform_object_run_hook(p_obj, p_obj->p_lifecycle->deinit, PLATFORM_OBJECT_DEINITIALIZED);
}
`;
}

function deviceHeader() {
  return header('platform_device.h', 'Platform 设备对象基类。', ['"platform_object.h"'], `
typedef enum
{
    PLATFORM_DEVICE_CLASS_DISPLAY = 0,
    PLATFORM_DEVICE_CLASS_TOUCH,
    PLATFORM_DEVICE_CLASS_IMU,
    PLATFORM_DEVICE_CLASS_TEMP_HUMI,
    PLATFORM_DEVICE_CLASS_HEART_RATE,
    PLATFORM_DEVICE_CLASS_BATTERY,
    PLATFORM_DEVICE_CLASS_STORAGE,
    PLATFORM_DEVICE_CLASS_BACKLIGHT,
    PLATFORM_DEVICE_CLASS_MOTOR,
    PLATFORM_DEVICE_CLASS_CPU,
    PLATFORM_DEVICE_CLASS_CLOCK,
    PLATFORM_DEVICE_CLASS_POWER,
    PLATFORM_DEVICE_CLASS_RTC,
    PLATFORM_DEVICE_CLASS_KEY
} platform_device_class_t;

typedef enum
{
    PLATFORM_DEVICE_CAP_READ     = 1u << 0,
    PLATFORM_DEVICE_CAP_WRITE    = 1u << 1,
    PLATFORM_DEVICE_CAP_CONTROL  = 1u << 2,
    PLATFORM_DEVICE_CAP_IRQ      = 1u << 3,
    PLATFORM_DEVICE_CAP_DMA      = 1u << 4,
    PLATFORM_DEVICE_CAP_SLEEP    = 1u << 5,
    PLATFORM_DEVICE_CAP_WAKEUP   = 1u << 6,
    PLATFORM_DEVICE_CAP_PERIODIC = 1u << 7
} platform_device_cap_t;

typedef struct
{
    platform_object_t object;
    platform_device_class_t dev_class;
    uint32_t caps;
} platform_device_t;

platform_err_t platform_device_init(platform_device_t *p_dev,
                                    const char *p_name,
                                    platform_device_class_t dev_class,
                                    uint32_t caps,
                                    void *p_self,
                                    const platform_lifecycle_ops_t *p_lifecycle);`, 'PLATFORM_DEVICE_H');
}

function deviceSource() {
  return `${fileHeader('platform_device.c', 'Platform 设备对象基类实现。')}
/* Includes */
#include "platform_device.h"

platform_err_t platform_device_init(platform_device_t *p_dev,
                                    const char *p_name,
                                    platform_device_class_t dev_class,
                                    uint32_t caps,
                                    void *p_self,
                                    const platform_lifecycle_ops_t *p_lifecycle) {
    platform_err_t ret;
    if (p_dev == NULL) return PLATFORM_ERR_PARAM;
    ret = platform_object_init(&p_dev->object, p_name, PLATFORM_OBJECT_DEVICE,
                               p_self, NULL, p_lifecycle);
    if (ret != PLATFORM_ERR_OK) return ret;
    p_dev->dev_class = dev_class;
    p_dev->caps = caps;
    return PLATFORM_ERR_OK;
}
`;
}

function serviceHeader() {
  return header('platform_service.h', 'Platform 服务对象基类。', ['"platform_object.h"'], `
typedef enum
{
    PLATFORM_SERVICE_CLASS_SYSTEM = 0,
    PLATFORM_SERVICE_CLASS_SENSOR,
    PLATFORM_SERVICE_CLASS_BATTERY,
    PLATFORM_SERVICE_CLASS_POWER,
    PLATFORM_SERVICE_CLASS_STORAGE,
    PLATFORM_SERVICE_CLASS_BACKLIGHT,
    PLATFORM_SERVICE_CLASS_BLE,
    PLATFORM_SERVICE_CLASS_OTA,
    PLATFORM_SERVICE_CLASS_LOG,
    PLATFORM_SERVICE_CLASS_DIAGNOSIS
} platform_service_class_t;

typedef struct
{
    platform_object_t object;
    platform_service_class_t service_class;
    const void *cfg;
    void *ctx;
    void *data;
    const void *ops;
} platform_service_t;

platform_err_t platform_service_init(platform_service_t *p_service,
                                     const char *p_name,
                                     platform_service_class_t service_class,
                                     const void *p_cfg,
                                     void *p_ctx,
                                     const platform_lifecycle_ops_t *p_lifecycle);
platform_err_t platform_service_model_init(platform_service_t *p_service,
                                            const char *p_name,
                                            platform_service_class_t service_class,
                                            const void *p_cfg,
                                            void *p_ctx,
                                            void *p_data,
                                            const void *p_ops,
                                            const platform_lifecycle_ops_t *p_lifecycle);`, 'PLATFORM_SERVICE_H');
}

function serviceSource() {
  return `${fileHeader('platform_service.c', 'Platform 服务对象基类实现。')}
/* Includes */
#include "platform_service.h"

platform_err_t platform_service_model_init(platform_service_t *p_service,
                                            const char *p_name,
                                            platform_service_class_t service_class,
                                            const void *p_cfg,
                                            void *p_ctx,
                                            void *p_data,
                                            const void *p_ops,
                                            const platform_lifecycle_ops_t *p_lifecycle) {
    platform_err_t ret;
    if (p_service == NULL) return PLATFORM_ERR_PARAM;
    ret = platform_object_init(&p_service->object, p_name, PLATFORM_OBJECT_SERVICE,
                               p_service, NULL, p_lifecycle);
    if (ret != PLATFORM_ERR_OK) return ret;
    p_service->service_class = service_class;
    p_service->cfg = p_cfg;
    p_service->ctx = p_ctx;
    p_service->data = p_data;
    p_service->ops = p_ops;
    return PLATFORM_ERR_OK;
}

platform_err_t platform_service_init(platform_service_t *p_service,
                                     const char *p_name,
                                     platform_service_class_t service_class,
                                     const void *p_cfg,
                                     void *p_ctx,
                                     const platform_lifecycle_ops_t *p_lifecycle) {
    return platform_service_model_init(p_service, p_name, service_class,
                                       p_cfg, p_ctx, NULL, NULL, p_lifecycle);
}
`;
}

function deviceManagerHeader() {
  return header('device_manager.h', 'Platform 设备全局注册和生命周期管理器。', ['"platform_device.h"'], `
#ifndef DEVICE_MANAGER_MAX_DEVICES
#define DEVICE_MANAGER_MAX_DEVICES (16U)
#endif

typedef struct
{
    uint32_t device_count;
    platform_object_state_t state;
    uint8_t ready;
} device_manager_data_t;

platform_err_t device_manager_register(platform_device_t *p_dev);
platform_err_t device_manager_init(void);
platform_err_t device_manager_start(void);
platform_err_t device_manager_process(void);
platform_err_t device_manager_stop(void);
platform_err_t device_manager_sleep(void);
platform_err_t device_manager_wakeup(void);
platform_err_t device_manager_deinit(void);
uint32_t device_manager_count(void);
platform_err_t device_manager_get_data(device_manager_data_t *p_out);`, 'DEVICE_MANAGER_H');
}

function deviceManagerSource() {
  return `${fileHeader('device_manager.c', 'Platform 设备全局注册和生命周期管理实现。')}
/* Includes */
#include "device_manager.h"

static platform_device_t *s_device_table[DEVICE_MANAGER_MAX_DEVICES];
static uint32_t s_device_count;
static bool_t s_device_manager_ready;
static platform_object_t s_device_manager_object;

static platform_err_t device_manager_ensure_ready(void) {
    if (s_device_manager_ready != PLATFORM_FALSE) return PLATFORM_ERR_OK;
    if (platform_object_init(&s_device_manager_object, "device_manager",
                             PLATFORM_OBJECT_MANAGER, &s_device_manager_object,
                             NULL, NULL) != PLATFORM_ERR_OK) return PLATFORM_ERR_FAIL;
    s_device_manager_ready = PLATFORM_TRUE;
    return PLATFORM_ERR_OK;
}

static platform_err_t device_manager_drive_all(platform_lifecycle_stage_t stage,
                                                bool_t reverse) {
    uint32_t index;
    platform_err_t ret;
    if (device_manager_ensure_ready() != PLATFORM_ERR_OK) return PLATFORM_ERR_FAIL;
    if (reverse != PLATFORM_FALSE) {
        for (index = s_device_count; index > 0U; --index) {
            ret = platform_object_lifecycle_run(&s_device_table[index - 1U]->object, stage);
            if (ret != PLATFORM_ERR_OK) return ret;
        }
    } else {
        for (index = 0U; index < s_device_count; ++index) {
            ret = platform_object_lifecycle_run(&s_device_table[index]->object, stage);
            if (ret != PLATFORM_ERR_OK) return ret;
        }
    }
    return PLATFORM_ERR_OK;
}

platform_err_t device_manager_register(platform_device_t *p_device) {
    uint32_t index;
    if (p_device == NULL) return PLATFORM_ERR_PARAM;
    if (device_manager_ensure_ready() != PLATFORM_ERR_OK) return PLATFORM_ERR_FAIL;
    if (platform_object_is_valid(&p_device->object, PLATFORM_OBJECT_DEVICE) == PLATFORM_FALSE) return PLATFORM_ERR_PARAM;
    for (index = 0U; index < s_device_count; ++index) {
        if (s_device_table[index] == p_device) return PLATFORM_ERR_BUSY;
    }
    if (s_device_count >= DEVICE_MANAGER_MAX_DEVICES) return PLATFORM_ERR_NO_RESOURCE;
    if (platform_object_lifecycle_register(&p_device->object, &s_device_manager_object) != PLATFORM_ERR_OK) return PLATFORM_ERR_FAIL;
    s_device_table[s_device_count++] = p_device;
    return PLATFORM_ERR_OK;
}

platform_err_t device_manager_init(void) { return device_manager_drive_all(PLATFORM_LIFECYCLE_STAGE_INIT, PLATFORM_FALSE); }
platform_err_t device_manager_start(void) { return device_manager_drive_all(PLATFORM_LIFECYCLE_STAGE_START, PLATFORM_FALSE); }
platform_err_t device_manager_process(void) { return device_manager_drive_all(PLATFORM_LIFECYCLE_STAGE_PROCESS, PLATFORM_FALSE); }
platform_err_t device_manager_stop(void) { return device_manager_drive_all(PLATFORM_LIFECYCLE_STAGE_STOP, PLATFORM_TRUE); }

platform_err_t device_manager_sleep(void) {
    uint32_t index;
    platform_err_t ret;
    if (device_manager_ensure_ready() != PLATFORM_ERR_OK) return PLATFORM_ERR_FAIL;
    for (index = s_device_count; index > 0U; --index) {
        if ((s_device_table[index - 1U]->caps & PLATFORM_DEVICE_CAP_SLEEP) == 0U) continue;
        ret = platform_object_lifecycle_run(&s_device_table[index - 1U]->object, PLATFORM_LIFECYCLE_STAGE_SLEEP);
        if (ret != PLATFORM_ERR_OK) return ret;
    }
    return PLATFORM_ERR_OK;
}

platform_err_t device_manager_wakeup(void) {
    uint32_t index;
    platform_err_t ret;
    if (device_manager_ensure_ready() != PLATFORM_ERR_OK) return PLATFORM_ERR_FAIL;
    for (index = 0U; index < s_device_count; ++index) {
        if ((s_device_table[index]->caps & PLATFORM_DEVICE_CAP_WAKEUP) == 0U) continue;
        ret = platform_object_lifecycle_run(&s_device_table[index]->object, PLATFORM_LIFECYCLE_STAGE_WAKEUP);
        if (ret != PLATFORM_ERR_OK) return ret;
    }
    return PLATFORM_ERR_OK;
}

platform_err_t device_manager_deinit(void) {
    platform_err_t ret = device_manager_drive_all(PLATFORM_LIFECYCLE_STAGE_DEINIT, PLATFORM_TRUE);
    if (ret == PLATFORM_ERR_OK) {
        s_device_count = 0U;
        for (uint32_t index = 0U; index < DEVICE_MANAGER_MAX_DEVICES; ++index) s_device_table[index] = NULL;
    }
    return ret;
}

uint32_t device_manager_count(void) { return s_device_count; }

platform_err_t device_manager_get_data(device_manager_data_t *p_out) {
    if (p_out == NULL) return PLATFORM_ERR_PARAM;
    if (device_manager_ensure_ready() != PLATFORM_ERR_OK) return PLATFORM_ERR_FAIL;
    p_out->device_count = s_device_count;
    p_out->ready = s_device_manager_ready;
    p_out->state = s_device_manager_object.state;
    return PLATFORM_ERR_OK;
}
`;
}

function serviceManagerHeader() {
  return header('service_manager.h', 'Platform 服务全局注册和生命周期管理器。', ['"platform_service.h"'], `
#ifndef SERVICE_MANAGER_MAX_SERVICES
#define SERVICE_MANAGER_MAX_SERVICES (16U)
#endif

typedef struct
{
    uint32_t service_count;
    platform_object_state_t state;
    uint8_t ready;
} service_manager_data_t;

platform_err_t service_manager_register(platform_service_t *p_svc);
platform_err_t service_manager_init(void);
platform_err_t service_manager_start(void);
platform_err_t service_manager_process(void);
platform_err_t service_manager_stop(void);
platform_err_t service_manager_deinit(void);
uint32_t service_manager_count(void);
platform_err_t service_manager_get_data(service_manager_data_t *p_out);`, 'SERVICE_MANAGER_H');
}

function serviceManagerSource() {
  return `${fileHeader('service_manager.c', 'Platform 服务全局注册和生命周期管理实现。')}
/* Includes */
#include "service_manager.h"

static platform_service_t *s_service_table[SERVICE_MANAGER_MAX_SERVICES];
static uint32_t s_service_count;
static bool_t s_service_manager_ready;
static platform_object_t s_service_manager_object;

static platform_err_t service_manager_ensure_ready(void) {
    if (s_service_manager_ready != PLATFORM_FALSE) return PLATFORM_ERR_OK;
    if (platform_object_init(&s_service_manager_object, "service_manager",
                             PLATFORM_OBJECT_MANAGER, &s_service_manager_object,
                             NULL, NULL) != PLATFORM_ERR_OK) return PLATFORM_ERR_FAIL;
    s_service_manager_ready = PLATFORM_TRUE;
    return PLATFORM_ERR_OK;
}

static platform_err_t service_manager_drive_all(platform_lifecycle_stage_t stage,
                                                 bool_t reverse) {
    uint32_t index;
    platform_err_t ret;
    if (service_manager_ensure_ready() != PLATFORM_ERR_OK) return PLATFORM_ERR_FAIL;
    if (reverse != PLATFORM_FALSE) {
        for (index = s_service_count; index > 0U; --index) {
            ret = platform_object_lifecycle_run(&s_service_table[index - 1U]->object, stage);
            if (ret != PLATFORM_ERR_OK) return ret;
        }
    } else {
        for (index = 0U; index < s_service_count; ++index) {
            ret = platform_object_lifecycle_run(&s_service_table[index]->object, stage);
            if (ret != PLATFORM_ERR_OK) return ret;
        }
    }
    return PLATFORM_ERR_OK;
}

platform_err_t service_manager_register(platform_service_t *p_service) {
    uint32_t index;
    if (p_service == NULL) return PLATFORM_ERR_PARAM;
    if (service_manager_ensure_ready() != PLATFORM_ERR_OK) return PLATFORM_ERR_FAIL;
    if (platform_object_is_valid(&p_service->object, PLATFORM_OBJECT_SERVICE) == PLATFORM_FALSE) return PLATFORM_ERR_PARAM;
    for (index = 0U; index < s_service_count; ++index) {
        if (s_service_table[index] == p_service) return PLATFORM_ERR_BUSY;
    }
    if (s_service_count >= SERVICE_MANAGER_MAX_SERVICES) return PLATFORM_ERR_NO_RESOURCE;
    if (platform_object_lifecycle_register(&p_service->object, &s_service_manager_object) != PLATFORM_ERR_OK) return PLATFORM_ERR_FAIL;
    s_service_table[s_service_count++] = p_service;
    return PLATFORM_ERR_OK;
}

platform_err_t service_manager_init(void) { return service_manager_drive_all(PLATFORM_LIFECYCLE_STAGE_INIT, PLATFORM_FALSE); }
platform_err_t service_manager_start(void) { return service_manager_drive_all(PLATFORM_LIFECYCLE_STAGE_START, PLATFORM_FALSE); }
platform_err_t service_manager_process(void) { return service_manager_drive_all(PLATFORM_LIFECYCLE_STAGE_PROCESS, PLATFORM_FALSE); }
platform_err_t service_manager_stop(void) { return service_manager_drive_all(PLATFORM_LIFECYCLE_STAGE_STOP, PLATFORM_TRUE); }

platform_err_t service_manager_deinit(void) {
    platform_err_t ret = service_manager_drive_all(PLATFORM_LIFECYCLE_STAGE_DEINIT, PLATFORM_TRUE);
    if (ret == PLATFORM_ERR_OK) {
        s_service_count = 0U;
        for (uint32_t index = 0U; index < SERVICE_MANAGER_MAX_SERVICES; ++index) s_service_table[index] = NULL;
    }
    return ret;
}

uint32_t service_manager_count(void) { return s_service_count; }

platform_err_t service_manager_get_data(service_manager_data_t *p_out) {
    if (p_out == NULL) return PLATFORM_ERR_PARAM;
    if (service_manager_ensure_ready() != PLATFORM_ERR_OK) return PLATFORM_ERR_FAIL;
    p_out->service_count = s_service_count;
    p_out->ready = s_service_manager_ready;
    p_out->state = s_service_manager_object.state;
    return PLATFORM_ERR_OK;
}
`;
}

function versionHeader() {
  return header('platform_version.h', 'Platform 版本和构建信息查询接口。', ['"platform_error.h"', '"version_config.h"'], `
typedef struct
{
    uint8_t major;
    uint8_t minor;
    uint8_t patch;
    uint8_t build;
    const char *p_product_name;
    const char *p_version_string;
    const char *p_git_hash;
    const char *p_build_date;
    const char *p_build_time;
} platform_version_t;

platform_err_t platform_version_get(platform_version_t *p_version);
const char *platform_version_get_string(void);`, 'PLATFORM_VERSION_H');
}

function versionSource() {
  return `${fileHeader('platform_version.c', 'Platform 版本和构建信息查询实现。')}
/* Includes */
#include "platform_version.h"

static const platform_version_t s_platform_version = {
    (uint8_t)PLATFORM_VERSION_MAJOR,
    (uint8_t)PLATFORM_VERSION_MINOR,
    (uint8_t)PLATFORM_VERSION_PATCH,
    (uint8_t)PLATFORM_VERSION_BUILD,
    PLATFORM_PRODUCT_NAME,
    PLATFORM_VERSION_STRING,
    PLATFORM_GIT_HASH,
    PLATFORM_BUILD_DATE,
    PLATFORM_BUILD_TIME
};

platform_err_t platform_version_get(platform_version_t *p_version) {
    if (p_version == NULL) return PLATFORM_ERR_PARAM;
    *p_version = s_platform_version;
    return PLATFORM_ERR_OK;
}

const char *platform_version_get_string(void) {
    return s_platform_version.p_version_string;
}
`;
}

function generatePlatformCommon() {
  const files = [
    { path: '03_Platform/platform_common/core/platform_type.h', content: platformTypeHeader() },
    { path: '03_Platform/platform_common/core/platform_error.h', content: platformErrorHeader() },
    { path: '03_Platform/platform_common/core/platform_def.h', content: platformDefHeader() },
    { path: '03_Platform/platform_common/object/inc/platform_object.h', content: objectHeader() },
    { path: '03_Platform/platform_common/object/src/platform_object.c', content: objectSource() },
    { path: '03_Platform/platform_common/manager/inc/platform_lifecycle.h', content: lifecycleHeader() },
    { path: '03_Platform/platform_common/object/inc/platform_device.h', content: deviceHeader() },
    { path: '03_Platform/platform_common/object/src/platform_device.c', content: deviceSource() },
    { path: '03_Platform/platform_common/object/inc/platform_service.h', content: serviceHeader() },
    { path: '03_Platform/platform_common/object/src/platform_service.c', content: serviceSource() },
    { path: '03_Platform/platform_common/manager/inc/device_manager.h', content: deviceManagerHeader() },
    { path: '03_Platform/platform_common/manager/src/device_manager.c', content: deviceManagerSource() },
    { path: '03_Platform/platform_common/manager/inc/service_manager.h', content: serviceManagerHeader() },
    { path: '03_Platform/platform_common/manager/src/service_manager.c', content: serviceManagerSource() },
    { path: '03_Platform/platform_common/diag/platform_version.h', content: versionHeader() },
    { path: '03_Platform/platform_common/diag/platform_version.c', content: versionSource() }
  ];
  Object.defineProperty(files, 'manifest', {
    enumerable: false,
    value: {
      layer: 'platform_common',
      generatedCFiles: 6,
      generatedHeaderFiles: 10,
      dependencies: ['platform_common only', 'version_config.h is supplied by platform_config'],
      unresolved: ['UNRESOLVED_VERSION_CONFIG_API: provide 03_Platform/platform_config/version_config.h in the target project']
    }
  });
  return formatGeneratedFiles(files);
}

module.exports = {
  id: 'platform-common.foundation',
  layer: 'platform_common',
  version: '2',
  skill: 'platform_common',
  render: async () => generatePlatformCommon(),
  generatePlatformCommon
};
