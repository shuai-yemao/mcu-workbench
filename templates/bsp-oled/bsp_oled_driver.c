#include "bsp_oled_driver.h"

int32_t oled_driver_inst(bsp_oled_driver_t* self, oled_operations_t* oled_ops, uint8_t width, uint8_t height) {
    if (self == NULL || oled_ops == NULL) {
        return -1;
    }

    self->p_oled_opes_inst = oled_ops;
    self->width = width;
    self->height = height;
    return 0;
}

int32_t oled_init(bsp_oled_driver_t* self) {
    if (self == NULL || self->p_oled_opes_inst == NULL) {
        return -1;
    }

    return self->p_oled_opes_inst->pf_oled_init();
}

int32_t oled_show_string(bsp_oled_driver_t* self, uint8_t x, uint8_t y, const char* str) {
    if (self == NULL || self->p_oled_opes_inst == NULL) {
        return -1;
    }

    self->p_oled_opes_inst->pf_oled_set_cursor(x, y);
    return self->p_oled_opes_inst->pf_oled_write_string(str);
}
