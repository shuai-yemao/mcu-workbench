#include "bsp_aht21_driver.h"

bsp_aht21_driver_t *bsp_aht21_driver_inst(const bsp_aht21_driver_cfg_t *p_cfg,
                                          const bsp_aht21_driver_ops_t *p_ops)
{
    static bsp_aht21_driver_t driver;
    driver.cfg = p_cfg;
    driver.ops = p_ops;
    return &driver;
}

int bsp_aht21_driver_read(bsp_aht21_driver_t *p_driver)
{
    return p_driver != 0;
}
