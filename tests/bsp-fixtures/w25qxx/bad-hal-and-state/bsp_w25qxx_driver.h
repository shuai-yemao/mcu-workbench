#ifndef BSP_W25QXX_DRIVER_H
#define BSP_W25QXX_DRIVER_H

#include "stm32f4xx_hal.h"

typedef struct {
    void *spi_handle;
} bsp_w25qxx_driver_t;

bsp_w25qxx_driver_t *bsp_w25qxx_driver_inst(bsp_w25qxx_driver_t *self);

#endif
