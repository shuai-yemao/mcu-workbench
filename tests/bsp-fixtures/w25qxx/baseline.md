# W25Qxx 当前 Skill 基线

## 压力提示

为 W25Qxx 设计 SPI/timebase 注入的 Driver，拆分 `bsp_w25qxx_config.h`，并让长耗时写入由 Handle 而非 Driver 的队列/线程处理。

## 当前 Skill 可观察输出

现有 `bsp-hal-driver` 说明“不管理跨实例队列或业务状态”，但没有要求配置头、能力选择表或针对长耗时操作的归属决策。

## 失败模式

- 宏、寄存器常量和板级参数可能散落在源文件。
- Driver 可能引入队列、线程或缓存来隐藏写入耗时。
- SPI/timebase 注入字段和验证证据没有固定形式。

## 合理化风险

“Flash 写入在驱动里排队最方便。”这会把资源调度和协议层耦合。
