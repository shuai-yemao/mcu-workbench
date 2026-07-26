#ifndef BSP_IMU_HANDLE_H
#define BSP_IMU_HANDLE_H

#include <stdint.h>
typedef struct { int32_t (*pf_read)(void *context); } bsp_imu_handler_driver_ops_t;
typedef struct { uint8_t is_inited; int32_t (*pf_start)(void *self); } bsp_imu_handle_t;
bsp_imu_handle_t *bsp_imu_handle_inst(bsp_imu_handle_t *self);
int32_t bsp_imu_handle_register_driver(bsp_imu_handle_t *self, const bsp_imu_handler_driver_ops_t *ops);
#endif
