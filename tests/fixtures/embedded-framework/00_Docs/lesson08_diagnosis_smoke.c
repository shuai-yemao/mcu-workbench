/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file lesson08_diagnosis_smoke.c
 *
 * @par dependencies
 * - platform_log.h
 * - platform_version.h
 * - platform_reset_reason.h
 * - platform_assert.h
 * - app_init.h
 * - SEGGER_RTT.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 本课（平台日志与诊断可观测性）host 端冒烟验证。
 *
 * 验证点：
 *
 * 1. platform_log_init() 返回 OK；I/W/E 日志经 RTT 读回含 I/ W/ E/ 前缀。
 * 2. platform_banner_print() 读回含平台名、版本、编译日期。
 * 3. plat_boot→board→service→app 四阶段全 OK；日志顺序含
 *    [boot] [board] [service] [app]；空注册集下 board_manager_start OK。
 * 4. 裁剪（-DSMOKE_TRIM_ONLY 模式）：INFO 级别下 D/V 无输出、I 有输出。
 * 5. platform_assert_set_hook 注入记录器；PLATFORM_ASSERT(0) 触发且
 *    记录表达式，程序不死锁。
 * 6. platform_reset_reason_str(platform_reset_reason_get()) 返回非空串。
 *
 * 临时验证文件，仅编译到 /tmp 运行，不参与固件构建。
 *
 * @version V1.0 2026-08-09
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

/* Includes ----------------------------------------------------------------- */

#include <stdio.h>
#include <string.h>

#include <SEGGER_RTT.h>

#ifdef SMOKE_TRIM_ONLY
    /* 裁剪模式：将编译裁剪开关降到 INFO，验证 D/V 宏整体编译为空。 */
    #define PLATFORM_LOG_LEVEL 3 /* PLATFORM_LOG_LVL_INFO */
#endif

#include "app_init.h"
#include "platform_assert.h"
#include "platform_log.h"
#include "platform_reset_reason.h"
#include "platform_version.h"

/* Defines ------------------------------------------------------------------ */

#define CHECK(cond, msg)                                                                           \
    do                                                                                             \
    {                                                                                              \
        if (cond)                                                                                  \
        {                                                                                          \
            printf("  PASS: %s\n", (msg));                                                         \
        }                                                                                          \
        else                                                                                       \
        {                                                                                          \
            printf("  FAIL: %s (line %d)\n", (msg), __LINE__);                                     \
            g_fail++;                                                                              \
        }                                                                                          \
    } while (0)

/* Declaring ---------------------------------------------------------------- */

static void drain(void);
static int acc_has_str(const char *p_s);

/* State -------------------------------------------------------------------- */

static char g_acc[4096];
static int g_fail = 0;

#ifndef SMOKE_TRIM_ONLY

/* 断言记录器状态：仅主模式使用，裁剪模式下不定义避免 unused 告警。 */
static int g_assert_hits = 0;
static char g_assert_rec[128];

#endif /* SMOKE_TRIM_ONLY */

/* Functions ---------------------------------------------------------------- */

/**
 * @brief 从 RTT up-buffer 读回全部日志并累计到 g_acc。
 */
static void drain(void)
{
    char buf[256];
    unsigned n;

    while ((n = SEGGER_RTT_ReadUpBuffer(0u, buf, sizeof(buf) - 1u)) > 0u)
    {
        buf[n] = '\0';
        (void) strncat(g_acc, buf, sizeof(g_acc) - 1u - strlen(g_acc));
    }
}

/**
 * @brief 判断 g_acc 是否包含子串。
 *
 * @param[in] p_s : 待查找的子串。
 *
 * @retval 1 : 包含。
 * @retval 0 : 不包含。
 */
static int acc_has_str(const char *p_s)
{
    return (strstr(g_acc, p_s) != NULL) ? 1 : 0;
}

#ifndef SMOKE_TRIM_ONLY

/**
 * @brief 断言记录器：仅记录，返回不死锁。
 */
static void assert_recorder(const char *p_expr, const char *p_file, const char *p_func,
                            int32_t line)
{
    (void) p_file;
    g_assert_hits++;
    (void) snprintf(g_assert_rec, sizeof(g_assert_rec), "%s|%s|%d", p_expr, p_func, (int) line);
}

/**
 * @brief 完整验证：日志、banner、四阶段、assert、reset reason。
 *
 * @retval 0 : 全部断言通过。
 * @retval 1 : 存在失败断言。
 */
static int test_mainline(void)
{
    const platform_version_t *p_ver;
    const char *p_rs;
    const char *p_boot;
    const char *p_board;
    const char *p_svc;
    const char *p_app;
    platform_err_t ret;

    printf("=== lesson08 diagnosis smoke ===\n");

    /* 1. 日志系统初始化 + I/W/E 前缀。 */
    g_acc[0] = '\0';
    CHECK(PLATFORM_ERR_OK == platform_log_init(), "platform_log_init");
    PLATFORM_LOG_I("diag", "hello info %d", 1);
    PLATFORM_LOG_W("diag", "hello warn %d", 2);
    PLATFORM_LOG_E("diag", "hello error %d", 3);
    drain();
    CHECK(acc_has_str("hello info 1") && acc_has_str("I/"), "info log with I/ prefix");
    CHECK(acc_has_str("hello warn 2") && acc_has_str("W/"), "warn log with W/ prefix");
    CHECK(acc_has_str("hello error 3") && acc_has_str("E/"), "error log with E/ prefix");
    platform_log_deinit();

    /* 2 + 3. 四阶段初始化 + banner。 */
    g_acc[0] = '\0';
    ret = plat_boot_init();
    CHECK(PLATFORM_ERR_OK == ret, "plat_boot_init");
    ret = plat_board_init();
    CHECK(PLATFORM_ERR_OK == ret, "plat_board_init");
    ret = plat_service_init();
    CHECK(PLATFORM_ERR_OK == ret, "plat_service_init");
    ret = plat_app_init();
    CHECK(PLATFORM_ERR_OK == ret, "plat_app_init (empty registrations)");
    drain();

    p_ver = platform_version_get();
    CHECK(acc_has_str("embedded_framework"), "banner project name");
    CHECK(acc_has_str(p_ver->p_version), "banner version string");
    CHECK(acc_has_str(__DATE__), "banner build date");

    p_boot = strstr(g_acc, "[boot]");
    p_board = strstr(g_acc, "[board]");
    p_svc = strstr(g_acc, "[service]");
    p_app = strstr(g_acc, "[app]");
    CHECK((p_boot != NULL) && (p_board != NULL) && (p_svc != NULL) && (p_app != NULL),
          "four-phase markers present");
    CHECK((p_boot != NULL) && (p_board != NULL) && (p_boot < p_board) && (p_board < p_svc) &&
              (p_svc < p_app),
          "init order boot<board<service<app");
    CHECK(acc_has_str("reset reason"), "reset reason logged");

    /* 5. assert hook：触发不死锁，表达式被记录。 */
    platform_assert_set_hook(assert_recorder);
    PLATFORM_ASSERT(0);
    CHECK(1 == g_assert_hits, "assert hook fired once");
    CHECK(NULL != strstr(g_assert_rec, "0|"), "assert expression recorded");
    platform_assert_set_hook(NULL);

    /* 6. reset reason 字符串非空（host 分支为 UNKNOWN 串）。 */
    p_rs = platform_reset_reason_str(platform_reset_reason_get());
    CHECK((p_rs != NULL) && ('\0' != p_rs[0]), "reset reason string non-empty");

    return (0 == g_fail) ? 0 : 1;
}

#else /* SMOKE_TRIM_ONLY */

/**
 * @brief 裁剪验证：INFO 级别下 I 输出、D/V 无输出。
 *
 * @retval 0 : 全部断言通过。
 * @retval 1 : 存在失败断言。
 */
static int test_trim(void)
{
    printf("=== lesson08 trim smoke (level=INFO) ===\n");

    g_acc[0] = '\0';
    CHECK(PLATFORM_ERR_OK == platform_log_init(), "platform_log_init (trim)");

    PLATFORM_LOG_I("trim", "info is visible");
    PLATFORM_LOG_D("trim", "debug should be trimmed");
    PLATFORM_LOG_V("trim", "verbose should be trimmed");
    drain();

    CHECK(acc_has_str("info is visible"), "info visible at INFO level");
    CHECK(!acc_has_str("debug should be trimmed"), "debug trimmed at INFO level");
    CHECK(!acc_has_str("verbose should be trimmed"), "verbose trimmed at INFO level");

    platform_log_deinit();

    return (0 == g_fail) ? 0 : 1;
}

#endif /* SMOKE_TRIM_ONLY */

/**
 * @brief 冒烟入口。
 *
 * @retval 0 : 全部断言通过。
 * @retval 1 : 存在失败断言。
 */
int main(void)
{
#ifndef SMOKE_TRIM_ONLY
    return test_mainline();
#else
    return test_trim();
#endif
}
