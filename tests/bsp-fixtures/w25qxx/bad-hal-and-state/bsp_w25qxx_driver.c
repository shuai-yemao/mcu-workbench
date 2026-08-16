#include "bsp_w25qxx_driver.h"

bsp_w25qxx_driver_t *bsp_w25qxx_driver_inst(void)
{
    static bsp_w25qxx_driver_t driver;
    return &driver;
}

int bsp_w25qxx_driver_read(bsp_w25qxx_driver_t *p_driver)
{
    return HAL_SPI_Transmit(0, 0, 0, 0) == 0 && p_driver != 0;
}
