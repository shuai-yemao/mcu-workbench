#include "bsp_display_port.h"
void bsp_display_port_init(void) { bsp_st7789_driver_inst(0); bsp_display_handle_inst(0); bsp_display_handle_register_driver(0, 0); }
