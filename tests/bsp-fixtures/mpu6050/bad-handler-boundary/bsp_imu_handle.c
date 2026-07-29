#include "bsp_imu_handle.h"
#include "bsp_mpu6050_driver.h"

void bsp_imu_handle_ISR(bsp_imu_handle_t *self)
{
    xQueueSend(self->queue, 0, 0);
}
