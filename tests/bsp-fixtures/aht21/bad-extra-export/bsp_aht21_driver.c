#include "bsp_aht21_driver.h"

int32_t bsp_aht21_driver_read(uint8_t *buffer, uint32_t size)
{
    (void)buffer;
    (void)size;
    return 0;
}

bsp_aht21_driver_t *bsp_aht21_driver_inst(bsp_aht21_driver_t *self)
{
    return self;
}
