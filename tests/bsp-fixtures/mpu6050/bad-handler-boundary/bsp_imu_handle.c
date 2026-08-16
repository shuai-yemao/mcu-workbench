#include "bsp_imu_handle.h"
#include "bsp_imu_driver.h"

static void event_callback(void)
{
}

void imu_notify_from_isr(void)
{
    event_callback();
}

void imu_event_ISR(void)
{
    imu_notify_from_isr();
}
