#include "bsp_imu_handle.h"
void bsp_imu_handle_ISR(bsp_imu_handle_t *self) { (void)self; xQueueSendFromISR(0, 0, 0); }
