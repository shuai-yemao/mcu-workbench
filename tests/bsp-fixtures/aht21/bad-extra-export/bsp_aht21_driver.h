#ifndef BSP_AHT21_DRIVER_H
#define BSP_AHT21_DRIVER_H

#include <stdint.h>

typedef struct {
    uint8_t is_inited;
    int32_t (*pf_read)(void *self, uint8_t *buffer, uint32_t size);
} bsp_aht21_driver_t;

bsp_aht21_driver_t *bsp_aht21_driver_inst(bsp_aht21_driver_t *self);
int32_t bsp_aht21_driver_read(uint8_t *buffer, uint32_t size);

#endif
