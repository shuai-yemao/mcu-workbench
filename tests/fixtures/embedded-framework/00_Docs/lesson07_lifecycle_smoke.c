/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file lesson07_lifecycle_smoke.c
 *
 * @par dependencies
 * - platform_board_manager.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief Temporary host-side smoke test for the lesson 07 manager layer.
 *
 * This file verifies the lifecycle mainline
 *
 *   board_init -> register -> start -> process -> stop -> deinit
 *
 * and the three failure paths: duplicate registration, full capacity and
 * an illegal lifecycle jump. It is a temporary verification file, compiled
 * into /tmp only and NOT part of the firmware build.
 *
 * Build (from the repository root):
 *
 *   gcc -std=c11 -I00_Config \
 *       -I03_Platform/platform_common/core \
        -I03_Platform/platform_common/diag \
 *       -I03_Platform/platform_common/object \
 *       -I03_Platform/platform_common/manager \
 *       -I04_Impl/impl_board \
 *       00_Docs/lesson07_lifecycle_smoke.c <platform_common sources> \
 *       -o /tmp/lesson07_smoke && /tmp/lesson07_smoke
 *
 * @version V1.0 2026-08-08
 *
 * @note 1 tab == 4 spaces!
 *
 *****************************************************************************/

#include <stdio.h>

#include "platform_board_manager.h"
#include "platform_manager.h"

//******************************** Defines **********************************//

#define CHECK(cond, msg)  do {                                                \
    if (cond) { printf("  PASS: %s\n", (msg)); }                              \
    else      { printf("  FAIL: %s (line %d)\n", (msg), __LINE__); g_fail++; }\
} while (0)

//******************************** Declaring ********************************//

static int str_eq(const char *p_a, const char *p_b);

//******************************** State ************************************//

static int g_fail = 0;
static int g_trace_idx = 0;
static const char *g_trace[32];

static platform_device_t g_dev_a;
static platform_device_t g_dev_b;
static platform_service_t g_svc;

/* Tiny manager with capacity 1 for the NO_RESOURCE case. */
static platform_object_t *g_tiny_slots[1];
static platform_manager_t g_tiny_mgr;
static platform_device_t g_dev_c;
static platform_device_t g_dev_d;

static platform_lifecycle_ops_t g_dev_ops;
static platform_lifecycle_ops_t g_svc_ops;

//******************************** Functions ********************************//

static void trace(const char *p_tag)
{
    g_trace[g_trace_idx++] = p_tag;
}

static platform_err_t dev_init(void *p_self)
{
    (void)p_self;
    trace("dev:init");
    return PLATFORM_ERR_OK;
}

static platform_err_t dev_start(void *p_self)
{
    (void)p_self;
    trace("dev:start");
    return PLATFORM_ERR_OK;
}

static platform_err_t dev_process(void *p_self)
{
    (void)p_self;
    trace("dev:process");
    return PLATFORM_ERR_OK;
}

static platform_err_t dev_stop(void *p_self)
{
    (void)p_self;
    trace("dev:stop");
    return PLATFORM_ERR_OK;
}

static platform_err_t dev_deinit(void *p_self)
{
    (void)p_self;
    trace("dev:deinit");
    return PLATFORM_ERR_OK;
}

static platform_err_t svc_init(void *p_self)
{
    (void)p_self;
    trace("svc:init");
    return PLATFORM_ERR_OK;
}

static platform_err_t svc_start(void *p_self)
{
    (void)p_self;
    trace("svc:start");
    return PLATFORM_ERR_OK;
}

static platform_err_t svc_process(void *p_self)
{
    (void)p_self;
    trace("svc:process");
    return PLATFORM_ERR_OK;
}

static platform_err_t svc_stop(void *p_self)
{
    (void)p_self;
    trace("svc:stop");
    return PLATFORM_ERR_OK;
}

static platform_err_t svc_deinit(void *p_self)
{
    (void)p_self;
    trace("svc:deinit");
    return PLATFORM_ERR_OK;
}

static int str_eq(const char *p_a, const char *p_b)
{
    const char *p_x = p_a;
    const char *p_y = p_b;

    if ((NULL == p_a) || (NULL == p_b))
    {
        return -1;
    }

    while (('\0' != *p_x) && ('\0' != *p_y))
    {
        if (*p_x != *p_y)
        {
            return -1;
        }
        p_x++;
        p_y++;
    }

    return ((*p_x == *p_y) ? 0 : -1);
}

static void setup_objects(void)
{
    g_dev_ops.init = dev_init;
    g_dev_ops.start = dev_start;
    g_dev_ops.process = dev_process;
    g_dev_ops.stop = dev_stop;
    g_dev_ops.sleep = NULL;
    g_dev_ops.wakeup = NULL;
    g_dev_ops.deinit = dev_deinit;

    g_svc_ops.init = svc_init;
    g_svc_ops.start = svc_start;
    g_svc_ops.process = svc_process;
    g_svc_ops.stop = svc_stop;
    g_svc_ops.sleep = NULL;
    g_svc_ops.wakeup = NULL;
    g_svc_ops.deinit = svc_deinit;

    (void)platform_device_init(&g_dev_a, "aht21", PLATFORM_DEVICE_CLASS_TEMP_HUMI,
                               PLATFORM_DEVICE_CAP_READ | PLATFORM_DEVICE_CAP_PERIODIC,
                               &g_dev_a, &g_dev_ops);
    (void)platform_device_init(&g_dev_b, "display0", PLATFORM_DEVICE_CLASS_DISPLAY,
                               PLATFORM_DEVICE_CAP_WRITE | PLATFORM_DEVICE_CAP_PERIODIC,
                               &g_dev_b, &g_dev_ops);
    (void)platform_service_init(&g_svc, "sensor_svc", PLATFORM_SERVICE_CLASS_SENSOR,
                                NULL, NULL, &g_svc_ops);

    (void)platform_device_init(&g_dev_c, "dev_c", PLATFORM_DEVICE_CLASS_KEY, 0u,
                               &g_dev_c, &g_dev_ops);
    (void)platform_device_init(&g_dev_d, "dev_d", PLATFORM_DEVICE_CLASS_KEY, 0u,
                               &g_dev_d, &g_dev_ops);
}

static void test_happy_path(void)
{
    platform_board_manager_t board;
    platform_device_manager_t *p_dmgr = NULL;
    platform_service_manager_t *p_smgr = NULL;
    platform_device_t *p_found = NULL;
    platform_service_t *p_svc_found = NULL;
    platform_err_t ret;

    printf("[happy path] board_init -> register -> start -> process -> stop -> deinit\n");

    CHECK(PLATFORM_ERR_OK == platform_board_manager_init(&board), "board_manager_init");

    p_dmgr = platform_board_manager_get_device_manager(&board);
    p_smgr = platform_board_manager_get_service_manager(&board);
    CHECK(NULL != p_dmgr, "get_device_manager");
    CHECK(NULL != p_smgr, "get_service_manager");

    /* Registration phase. */
    CHECK(PLATFORM_ERR_OK == platform_device_manager_register(p_dmgr, &g_dev_a), "register aht21");
    CHECK(PLATFORM_ERR_OK == platform_device_manager_register(p_dmgr, &g_dev_b), "register display0");
    CHECK(PLATFORM_ERR_OK == platform_service_manager_register(p_smgr, &g_svc), "register sensor_svc");
    CHECK(PLATFORM_OBJECT_REGISTERED == g_dev_a.object.state, "aht21 state=REGISTERED");
    CHECK((void *)p_dmgr == g_dev_a.object.p_parent, "aht21 parent bound to device manager");

    /* Find helpers. */
    ret = platform_device_manager_get(p_dmgr, "aht21", &p_found);
    CHECK((PLATFORM_ERR_OK == ret) && (&g_dev_a == p_found), "device get by name");
    ret = platform_device_manager_get_by_class(p_dmgr, PLATFORM_DEVICE_CLASS_DISPLAY, &p_found);
    CHECK((PLATFORM_ERR_OK == ret) && (&g_dev_b == p_found), "device get by class");
    ret = platform_service_manager_get(p_smgr, "sensor_svc", &p_svc_found);
    CHECK((PLATFORM_ERR_OK == ret) && (&g_svc == p_svc_found), "service get by name");
    ret = platform_device_manager_get(p_dmgr, "nope", &p_found);
    CHECK(PLATFORM_ERR_NOT_FOUND == ret, "get missing device -> NOT_FOUND");

    /* Startup mainline. */
    g_trace_idx = 0;
    CHECK(PLATFORM_ERR_OK == platform_board_manager_start(&board), "board_manager_start");
    /* INITIALIZED is a transient phase inside start; only STARTED is observable. */
    CHECK(PLATFORM_OBJECT_STARTED == g_dev_a.object.state, "aht21 state=STARTED");
    CHECK(PLATFORM_OBJECT_STARTED == g_svc.object.state, "sensor_svc state=STARTED");

    /* Expected order: device init -> service init -> device start -> service start. */
    CHECK(6 == g_trace_idx, "six lifecycle callbacks ran");
    CHECK(0 == str_eq(g_trace[0], "dev:init") && 0 == str_eq(g_trace[1], "dev:init"),
          "two device inits first");
    CHECK(0 == str_eq(g_trace[2], "svc:init"), "service init after device init");
    CHECK(0 == str_eq(g_trace[3], "dev:start"), "device start after all inits");
    CHECK(0 == str_eq(g_trace[5], "svc:start"), "service start last");

    /* Main-loop tick. */
    g_trace_idx = 0;
    CHECK(PLATFORM_ERR_OK == platform_board_manager_process(&board), "board_manager_process");
    CHECK(0 == str_eq(g_trace[0], "dev:process") && 0 == str_eq(g_trace[1], "dev:process"),
          "device process before service process");
    CHECK(0 == str_eq(g_trace[2], "svc:process"), "service process after device process");

    /* Shutdown mainline in reverse order. */
    g_trace_idx = 0;
    CHECK(PLATFORM_ERR_OK == platform_board_manager_stop(&board), "board_manager_stop");
    CHECK(PLATFORM_OBJECT_STOPPED == g_dev_a.object.state, "aht21 state=STOPPED");
    CHECK(0 == str_eq(g_trace[0], "svc:stop"), "service stop first");
    CHECK(0 == str_eq(g_trace[2], "dev:stop"), "device stop last");

    g_trace_idx = 0;
    CHECK(PLATFORM_ERR_OK == platform_board_manager_deinit(&board), "board_manager_deinit");
    CHECK(PLATFORM_OBJECT_DEINITIALIZED == g_dev_a.object.state, "aht21 state=DEINITIALIZED");
    CHECK(0 == str_eq(g_trace[0], "svc:deinit"), "service deinit first");
    CHECK(0 == str_eq(g_trace[2], "dev:deinit"), "device deinit last");
}

static void test_failure_paths(void)
{
    platform_board_manager_t board;
    platform_device_manager_t *p_dmgr = NULL;
    platform_err_t ret;

    printf("[failure paths] ALREADY_INIT / NO_RESOURCE / BUSY\n");

    CHECK(PLATFORM_ERR_OK == platform_board_manager_init(&board), "board_manager_init (fault)");
    p_dmgr = platform_board_manager_get_device_manager(&board);

    /* ALREADY_INIT: duplicate registration. */
    CHECK(PLATFORM_ERR_OK == platform_device_manager_register(p_dmgr, &g_dev_a), "first register ok");
    CHECK(PLATFORM_ERR_ALREADY_INIT == platform_device_manager_register(p_dmgr, &g_dev_a),
          "duplicate register -> ALREADY_INIT");

    /* BUSY: registration window closes after init_all. */
    CHECK(PLATFORM_ERR_OK == platform_device_manager_register(p_dmgr, &g_dev_b), "second register ok");
    CHECK(PLATFORM_ERR_OK == platform_device_manager_init_all(p_dmgr, NULL), "device init_all");
    CHECK(PLATFORM_ERR_BUSY == platform_device_manager_register(p_dmgr, &g_dev_b),
          "register after init window -> BUSY");

    /* Tiny manager: NO_RESOURCE and the illegal-jump BUSY cases. */
    ret = platform_manager_init(&g_tiny_mgr, "tiny", g_tiny_slots, 1u, PLATFORM_OBJECT_DEVICE);
    CHECK(PLATFORM_ERR_OK == ret, "tiny manager init");
    ret = platform_manager_register(&g_tiny_mgr, &g_dev_c.object);
    CHECK(PLATFORM_ERR_OK == ret, "tiny register dev_c");
    ret = platform_manager_register(&g_tiny_mgr, &g_dev_d.object);
    CHECK(PLATFORM_ERR_NO_RESOURCE == ret, "tiny full capacity -> NO_RESOURCE");

    /* Illegal jump: drive a REGISTERED object to STARTED without init. */
    ret = platform_manager_drive(&g_tiny_mgr, &g_dev_c.object, PLATFORM_OBJECT_STARTED);
    CHECK(PLATFORM_ERR_BUSY == ret, "start without init -> BUSY");

    /* Normal driving through the tiny manager must succeed. */
    ret = platform_manager_drive(&g_tiny_mgr, &g_dev_c.object, PLATFORM_OBJECT_INITIALIZED);
    CHECK(PLATFORM_ERR_OK == ret, "tiny init ok");
    ret = platform_manager_drive(&g_tiny_mgr, &g_dev_c.object, PLATFORM_OBJECT_STARTED);
    CHECK(PLATFORM_ERR_OK == ret, "tiny start ok");
}

int main(void)
{
    printf("=== lesson07 lifecycle smoke ===\n");

    setup_objects();
    test_happy_path();
    test_failure_paths();

    if (0 == g_fail)
    {
        printf("ALL PASS\n");
    }
    else
    {
        printf("%d CHECK(S) FAILED\n", g_fail);
    }

    return (0 == g_fail) ? 0 : 1;
}
