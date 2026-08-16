#include "bsp_display_port.h"

static int display_read(void)
{
    return impl_display_driver_read();
}

int impl_display_handle_port_register(void)
{
    return display_read();
}

int impl_display_handle_port_extra(void)
{
    return 0;
}
