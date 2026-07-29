# ST7789 当前 Skill 基线

## 压力提示

通过 Port 注入 SPI/tick/GPIO/OS，Wrapper 仅依赖 Port，显示事件必须描述像素缓冲区的所有权与有效期。

## 当前 Skill 可观察输出

现有 `bsp-adapter` 描述“Wrapper → Port → hal_driver”，但没有规定 Port 的构造/注册顺序、Wrapper include 禁止项、OS 注入或显示缓冲区生命周期。

## 失败模式

- Wrapper 可能直接包含 Driver、Handle、HAL 或 RTOS 头文件。
- Port 未负责 Driver 构造、Handle 构造和注册的就绪门控。
- Flush 回调返回后像素缓冲仍被 DMA/任务使用的风险未被记录。

## 合理化风险

“Wrapper 直接调用 Driver 更短。”这绕过了 Fake Port 和平台替换 seam。
