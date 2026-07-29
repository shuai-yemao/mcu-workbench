# AHT21 当前 Skill 基线

## 压力提示

为 AHT21 设计可切换硬件/软件 IIC 的 BSP Driver：仅导出构造函数，注入 IIC、timebase、yield、IRQ，并禁止 HAL/FreeRTOS 依赖。

## 当前 Skill 可观察输出

`bsp-hal-driver/SKILL.md` 仅要求“最小状态机”和“用 Wrapper/Port 注入总线和时间接口验证”；没有规定模块级导出白名单、`is_inited`、Ops 结构体或硬件/软件总线替换的验证。

## 失败模式

- 容易把 `init/read/write` 作为模块级函数导出。
- IIC、timebase、yield、IRQ 的注入契约未被列为必需产物。
- 无法机械审计 Driver 是否直接包含 HAL 或 FreeRTOS。

## 合理化风险

“函数数量很少，额外导出不会影响封装。”这会破坏多实例和 Fake 注入边界。
