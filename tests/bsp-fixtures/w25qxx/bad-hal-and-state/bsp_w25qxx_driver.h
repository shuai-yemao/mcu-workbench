#ifndef BSP_W25QXX_DRIVER_H
#define BSP_W25QXX_DRIVER_H

#include "stm32f4xx_hal.h"

typedef struct {
    unsigned int capacity;
} bsp_w25qxx_driver_t;

bsp_w25qxx_driver_t *bsp_w25qxx_driver_inst(void);

#endif
