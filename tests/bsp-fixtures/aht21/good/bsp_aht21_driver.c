#include "bsp_aht21_driver.h"

static int32_t bsp_aht21_driver_init(void *self)
{
    (void)self;
    return 0;
}

static int32_t bsp_aht21_driver_read(void *self, uint8_t *buffer, uint32_t size)
{
    (void)self;
    (void)buffer;
    (void)size;
    return 0;
}

bsp_aht21_driver_t *bsp_aht21_driver_inst(bsp_aht21_driver_t *self)
{
    self->is_inited = 0U;
    self->pf_init = bsp_aht21_driver_init;
    self->pf_read = bsp_aht21_driver_read;
    return self;
}
