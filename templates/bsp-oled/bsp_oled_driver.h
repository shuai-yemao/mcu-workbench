#ifndef __BSP_OLED_DRIVER_H__
#define __BSP_OLED_DRIVER_H__

#include <stdint.h>

// OLED 操作接口（抽象接口）
typedef struct {
    int32_t (*pf_oled_init)(void);
    int32_t (*pf_oled_display_on)(void);
    int32_t (*pf_oled_display_off)(void);
    int32_t (*pf_oled_set_cursor)(uint8_t x, uint8_t y);
    int32_t (*pf_oled_write_string)(const char* str);
    int32_t (*pf_oled_write_data)(uint8_t data);
} oled_operations_t;

// OLED 驱动结构体（抽象部分）
typedef struct bsp_oled_driver {
    oled_operations_t* p_oled_opes_inst;
    uint8_t width;
    uint8_t height;
} bsp_oled_driver_t;

// OLED 驱动函数（跨平台复用）
int32_t oled_driver_inst(bsp_oled_driver_t* self, oled_operations_t* oled_ops, uint8_t width, uint8_t height);
int32_t oled_init(bsp_oled_driver_t* self);
int32_t oled_show_string(bsp_oled_driver_t* self, uint8_t x, uint8_t y, const char* str);

#endif // __BSP_OLED_DRIVER_H__
