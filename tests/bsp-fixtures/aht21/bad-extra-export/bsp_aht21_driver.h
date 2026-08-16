#ifndef BSP_AHT21_DRIVER_H
#define BSP_AHT21_DRIVER_H

typedef struct {
    unsigned int timeout_ms;
} bsp_aht21_driver_cfg_t;

typedef struct {
    int is_inited;
} bsp_aht21_driver_ctx_t;

typedef struct {
    unsigned int measurement_count;
} bsp_aht21_driver_data_t;

typedef struct {
    int (*pf_read)(void *p_context);
} bsp_aht21_driver_ops_t;

typedef struct {
    const bsp_aht21_driver_cfg_t *cfg;
    bsp_aht21_driver_ctx_t ctx;
    bsp_aht21_driver_data_t data;
    const bsp_aht21_driver_ops_t *ops;
} bsp_aht21_driver_t;

bsp_aht21_driver_t *bsp_aht21_driver_inst(const bsp_aht21_driver_cfg_t *p_cfg,
                                          const bsp_aht21_driver_ops_t *p_ops);
int bsp_aht21_driver_read(bsp_aht21_driver_t *p_driver);

#endif
