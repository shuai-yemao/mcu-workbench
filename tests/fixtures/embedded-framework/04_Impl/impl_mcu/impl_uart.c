/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file impl_uart.c
 *
 * @par dependencies
 * - platform_uart.h
 * - platform_tick.h（发送超时判定依赖时基，须先 platform_tick_init）
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief UART 最小发送的目标端实现（STM32F411 寄存器直操）。
 *
 * 处理流程：
 *
 * 1. platform_uart_init()：使能 GPIOA 与 USART1 时钟，PA9/PA10 复用
 *    AF7，按 HAL 定点公式计算 BRR，使能 UE|TE|RE。
 * 2. platform_uart_write()：逐字节等待 TXE 后写 DR，末字节等待 TC
 *    （移位寄存器腾空），全程基于 platform_tick_get_ms() 超时判定。
 *
 * 串口映射（第一版）：uart_id 0 → USART1（TX=PA9、RX=PA10，8N1）。
 * 扩展点：USART2（PA2/PA3，APB1）、USART6（PC6/PC7，APB2）后续按同
 * 模式补映射表。
 *
 * @note 寄存器基址/位定义自包含（数据手册值），不依赖 HAL/CMSIS 头
 *       （D7：Vendor 源码不复制进工程）。
 * @note PLATFORM_UART_PCLK_HZ 默认 HSI 16MHz；若工程经 PLL 提升外设
 *       总线时钟，须在编译时覆盖：-DPLATFORM_UART_PCLK_HZ=96000000。
 * @note write 的超时判定依赖 platform_tick（1ms 时基）：
 *       boot 阶段须先调用 platform_tick_init()。
 *
 * @version V1.0 2026-08-10
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

/* Includes ----------------------------------------------------------------- */

#include "platform_uart.h"
#include "platform_tick.h"
#include "platform_def.h"

#if defined(STM32F411xE)

/* Defines ------------------------------------------------------------------ */

/* 外设总线时钟（Hz）：默认 HSI 16MHz，PLL 后须外部覆盖。 */
#ifndef PLATFORM_UART_PCLK_HZ
    #define PLATFORM_UART_PCLK_HZ (16000000UL)
#endif

/* RCC（复位与时钟控制）。 */
#define RCC_BASE_ADDR     (0x40023800UL)
#define RCC_AHB1ENR_OFF   (0x30UL)
#define RCC_APB2ENR_OFF   (0x44UL)
#define GPIOA_CLK_BIT     (0UL)  /* AHB1ENR：GPIOA 时钟。 */
#define USART1_CLK_BIT    (4UL)  /* APB2ENR：USART1 时钟。 */

/* GPIOA（PA9=USART1_TX、PA10=USART1_RX，复用 AF7）。
 * PA8..PA15 的复用编号位于 AFRH（偏移 0x24），位偏移 (pin-8)*4。 */
#define GPIOA_BASE        (0x40020000UL)
#define GPIO_MODER_OFF    (0x00UL)
#define GPIO_AFRH_OFF     (0x24UL)
#define USART1_TX_PIN     (9UL)
#define USART1_RX_PIN     (10UL)
#define GPIO_AF_USART1    (7UL)
#define GPIO_MODER_AF     (2UL) /* 复用功能模式编码。 */

/* USART1 外设（挂 APB2）。 */
#define USART1_BASE       (0x40011000UL)
#define USART_SR_OFF      (0x00UL)
#define USART_DR_OFF      (0x04UL)
#define USART_BRR_OFF     (0x08UL)
#define USART_CR1_OFF     (0x0CUL)

/* 状态/控制位。 */
#define USART_SR_TXE      (1UL << 7) /* 发送数据寄存器空。 */
#define USART_SR_TC       (1UL << 6) /* 发送完成。          */
#define USART_CR1_RE      (1UL << 2) /* 接收使能。          */
#define USART_CR1_TE      (1UL << 3) /* 发送使能。          */
#define USART_CR1_UE      (1UL << 13) /* USART 使能。        */

/* Functions ---------------------------------------------------------------- */

/**
 * @brief USART1 引脚复用配置（PA9/PA10 → AF7）。
 */
static void s_uart1_pin_mux_init(void)
{
    volatile uint32_t *p_ahb1enr = (volatile uint32_t *) (RCC_BASE_ADDR + RCC_AHB1ENR_OFF);
    volatile uint32_t *p_moder = (volatile uint32_t *) (GPIOA_BASE + GPIO_MODER_OFF);
    volatile uint32_t *p_afrh  = (volatile uint32_t *) (GPIOA_BASE + GPIO_AFRH_OFF);

    /* 使能 GPIOA 时钟。 */
    *p_ahb1enr |= (1UL << GPIOA_CLK_BIT);

    /* PA9/PA10 → AF 模式。 */
    *p_moder &= ~(3UL << (USART1_TX_PIN * 2u));
    *p_moder |= (GPIO_MODER_AF << (USART1_TX_PIN * 2u));
    *p_moder &= ~(3UL << (USART1_RX_PIN * 2u));
    *p_moder |= (GPIO_MODER_AF << (USART1_RX_PIN * 2u));

    /* PA9/PA10 复用编号 AF7（USART1），位于 AFRH。 */
    *p_afrh &= ~(0xFUL << ((USART1_TX_PIN - 8u) * 4u));
    *p_afrh |= (GPIO_AF_USART1 << ((USART1_TX_PIN - 8u) * 4u));
    *p_afrh &= ~(0xFUL << ((USART1_RX_PIN - 8u) * 4u));
    *p_afrh |= (GPIO_AF_USART1 << ((USART1_RX_PIN - 8u) * 4u));
}

/**
 * @brief 按波特率计算 BRR（HAL 定点公式，16 倍过采样）。
 *
 * @param[in] baud : 目标波特率。
 *
 * @return BRR 寄存器值。
 */
static uint32_t s_baud_brr(uint32_t baud)
{
    uint32_t usartdiv = (PLATFORM_UART_PCLK_HZ * 25UL) / (4UL * baud);
    uint32_t mantissa = usartdiv / 100UL;
    uint32_t fraction = usartdiv % 100UL;

    return (mantissa << 4) | ((fraction * 16UL + 50UL) / 100UL);
}

/**
 * @brief 初始化 USART1（8N1）。
 */
platform_err_t platform_uart_init(uint32_t uart_id, const platform_uart_cfg_t *p_cfg)
{
    volatile uint32_t *p_apb2enr;
    volatile uint32_t *p_brr;
    volatile uint32_t *p_cr1;

    if ((p_cfg == NULL) || (p_cfg->baudrate == 0UL))
    {
        return PLATFORM_ERR_PARAM;
    }
    if (uart_id != 0UL)
    {
        return PLATFORM_ERR_NOT_SUPPORTED; /* 第一版仅 USART1。 */
    }

    /* 使能 USART1 时钟并配置引脚复用。 */
    p_apb2enr = (volatile uint32_t *) (RCC_BASE_ADDR + RCC_APB2ENR_OFF);
    *p_apb2enr |= (1UL << USART1_CLK_BIT);
    s_uart1_pin_mux_init();

    /* 波特率（8N1 固定，无需配置 CR2/CR3）。 */
    p_brr = (volatile uint32_t *) (USART1_BASE + USART_BRR_OFF);
    *p_brr = s_baud_brr(p_cfg->baudrate);

    /* 使能 USART、发送、接收。 */
    p_cr1 = (volatile uint32_t *) (USART1_BASE + USART_CR1_OFF);
    *p_cr1 = USART_CR1_UE | USART_CR1_TE | USART_CR1_RE;

    return PLATFORM_ERR_OK;
}

/**
 * @brief 阻塞发送数据（基于时基超时判定）。
 */
platform_err_t platform_uart_write(uint32_t uart_id, const uint8_t *p_data, uint32_t len,
                                   uint32_t timeout_ms)
{
    volatile uint32_t *p_sr;
    volatile uint32_t *p_dr;
    uint32_t start_ms;
    uint32_t idx;

    if (uart_id != 0UL)
    {
        return PLATFORM_ERR_NOT_SUPPORTED;
    }
    if ((p_data == NULL) && (len > 0UL))
    {
        return PLATFORM_ERR_PARAM;
    }

    p_sr = (volatile uint32_t *) (USART1_BASE + USART_SR_OFF);
    p_dr = (volatile uint32_t *) (USART1_BASE + USART_DR_OFF);
    start_ms = platform_tick_get_ms();

    for (idx = 0UL; idx < len; idx++)
    {
        /* 等待 TXE（数据寄存器空）。 */
        while ((*p_sr & USART_SR_TXE) == 0UL)
        {
            if ((platform_tick_get_ms() - start_ms) >= timeout_ms)
            {
                return PLATFORM_ERR_TIMEOUT;
            }
        }
        *p_dr = (uint32_t) p_data[idx];
    }

    /* 等待末字节发送完成（移位寄存器腾空）。 */
    while ((*p_sr & USART_SR_TC) == 0UL)
    {
        if ((platform_tick_get_ms() - start_ms) >= timeout_ms)
        {
            return PLATFORM_ERR_TIMEOUT;
        }
    }

    return PLATFORM_ERR_OK;
}

#else /* STM32F411xE */

/* host 冒烟守卫：非目标端仅保证接口可链接。 */

platform_err_t platform_uart_init(uint32_t uart_id, const platform_uart_cfg_t *p_cfg)
{
    (void) uart_id;
    (void) p_cfg;
    return PLATFORM_ERR_NOT_SUPPORTED;
}

platform_err_t platform_uart_write(uint32_t uart_id, const uint8_t *p_data, uint32_t len,
                                   uint32_t timeout_ms)
{
    (void) uart_id;
    (void) p_data;
    (void) len;
    (void) timeout_ms;
    return PLATFORM_ERR_NOT_SUPPORTED;
}

#endif /* STM32F411xE */
