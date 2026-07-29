#ifndef BSP_IMU_HANDLE_H
#define BSP_IMU_HANDLE_H

typedef struct {
    void *queue;
} bsp_imu_handle_t;

bsp_imu_handle_t *bsp_imu_handle_inst(bsp_imu_handle_t *self);

#endif
