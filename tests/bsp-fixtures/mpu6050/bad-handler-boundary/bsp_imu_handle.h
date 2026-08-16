#ifndef BSP_IMU_HANDLE_H
#define BSP_IMU_HANDLE_H

typedef struct {
    int is_inited;
} impl_imu_handle_ctx_t;

typedef struct {
    unsigned int event_count;
} impl_imu_handle_data_t;

typedef struct {
    int (*pf_read)(void *p_context);
} impl_imu_handle_driver_ops_t;

typedef struct {
    int (*pf_start)(void *p_context);
} impl_imu_handle_ops_t;

typedef struct {
    unsigned int driver_count;
    void *p_drivers;
    void *cfg;
    impl_imu_handle_ctx_t ctx;
    impl_imu_handle_data_t data;
    const impl_imu_handle_ops_t *ops;
} impl_imu_handle_t;

#endif
