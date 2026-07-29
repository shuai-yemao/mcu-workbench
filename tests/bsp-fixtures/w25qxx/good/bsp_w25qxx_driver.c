#include "bsp_w25qxx_driver.h"
static int32_t bsp_w25qxx_driver_read(void *self) { (void)self; return 0; }
bsp_w25qxx_driver_t *bsp_w25qxx_driver_inst(bsp_w25qxx_driver_t *self) { self->is_inited = 0U; self->pf_read = bsp_w25qxx_driver_read; return self; }
