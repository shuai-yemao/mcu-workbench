# LVGL 移植契约

## 初始化顺序

1. 应用配置并锁定 `lv_conf.h`。
2. 调用 `lv_init()`，确认内存、Tick、OSAL 和基础模块初始化成功。
3. 创建 Display，设置分辨率、颜色格式、绘制缓冲和 Render Mode。
4. 注册 Flush Callback；硬件传输完成后必须调用对应版本的 Flush Ready API。
5. 创建 Input Device，注册 Read Callback，并完成坐标、按键或编码器映射。
6. 由 OS Wrapper 提供 Tick、任务调度、互斥和等待；APP 不直接操作 RTOS 对象。

## 显示契约

- `flush_cb` 只负责把给定区域和像素缓冲交给 BSP Wrapper。
- Partial、Direct、Full 三种 Render Mode 必须与缓冲大小和 DMA 能力匹配。
- 双缓冲允许渲染和传输并行，但必须明确缓存清理、地址切换和完成信号的所有权。
- 旋转、物理分辨率、偏移、RGB565/888 和字节对齐必须写入配置与验收记录。

## 输入与系统契约

- Read Callback 只转换设备状态，不在回调中执行业务逻辑或阻塞式访问。
- Tick 来源必须单调递增，并记录单位、频率、溢出策略和启动时机。
- 多任务模式下，LVGL API 的调用线程、锁范围和 Flush Wait 机制必须明确。
- 中断只产生事件或完成信号，设备读写和 UI 更新交给任务上下文。

## 交付证据

至少保存初始化日志、配置快照、Display/Input 回调位置、缓冲区地址/大小、Flush 完成证据和一次实际刷新测量。
