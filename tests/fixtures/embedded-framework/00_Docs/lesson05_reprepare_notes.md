# 第 5 课重新备课说明

## 本课重新定位

第 5 课不讲完整设备驱动模型，只讲平台对象模型的第一层公共骨架：

- `platform_object_t`：所有平台对象的共同身份。
- `platform_device_t`：所有硬件设备进入统一管理面的公共基类。
- `platform_service_t`：所有业务服务进入统一管理面的公共基类。
- `platform_lifecycle_ops_t`：对象生命周期入口。

一句话：

> 第 5 课解决“对象如何被统一识别、分类、校验、记录状态和启动”，不解决“每个具体设备到底怎么读写”。

## 为什么不在第 5 课放通用 read/write/control

`open/read/write/control` 这种通用操作表本身不是错误设计，它适合接口形态接近的设备，例如字符设备、块设备、简单总线设备。

但智能手表项目里的设备差异很大：

```text
display    draw_pixel / draw_bitmap / sleep / wakeup
touch      read_touch
imu        read_motion / read_raw / read_done
battery    read_battery
storage    read / write / erase / sleep / wakeup
backlight  set_level
```

如果第 5 课强行把所有设备都讲成 `read/write/control`，学生会误以为所有设备都必须长成同一种操作接口。这样虽然代码也能写，但课程概念会变浑。

因此本课只保留：

```c
typedef struct
{
    platform_object_t object;
    platform_device_class_t dev_class;
    uint32_t caps;
    platform_device_power_state_t power_state;
    const platform_lifecycle_ops_t *lifecycle;
} platform_device_t;
```

## 字段讲法

`object`：
设备首先是一个平台对象，所以拥有 magic、name、type、state。

`dev_class`：
说明这是哪一类设备，例如 display、touch、imu、battery。

`caps`：
表示设备支持哪些系统运行管理能力，例如是否支持休眠、深度休眠、断电、唤醒源、掉电后重初始化、降频、降采样和亮度调节。它是静态能力声明，不是当前状态。

`power_state`：
表示设备当前处于什么功耗状态，例如 off、sleep、idle、active、error。它是运行时状态记录，不负责执行休眠动作。

`lifecycle`：
统一启动和停止入口。启动链路可以不关心具体设备是显示屏还是触摸屏，都可以调用生命周期入口。

注意：第 5 课不把 `suspend/resume/power_off/power_on` 放进代码。因为这属于后续低功耗管理切面，本课先把 `caps` 和 `power_state` 作为伏笔立住。

## 后续课程承接

第 6 课再讲具体设备如何扩展：

```c
struct touch_device
{
    platform_device_t base;
    touch_data_t data;
    const touch_ops_t *ops;
};
```

```c
struct display_device
{
    platform_device_t base;
    const display_ops_t *ops;
};
```

也就是：

> base 负责统一管理，typed ops 负责具体能力。

这个分层能避免过度设计，也能保留后续做 device_manager、board_devices、service 组合多个 device 的空间。
