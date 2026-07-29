#ifndef BSP_W25QXX_DRIVER_H
#define BSP_W25QXX_DRIVER_H

#include <stdint.h>
typedef struct { uint8_t is_inited; int32_t (*pf_read)(void *self); } bsp_w25qxx_driver_t;
bsp_w25qxx_driver_t *bsp_w25qxx_driver_inst(bsp_w25qxx_driver_t *self);
#endif
