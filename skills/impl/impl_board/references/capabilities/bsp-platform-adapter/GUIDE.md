---
name: bsp-platform-adapter
description: 设计和实现 BSP Port，将 Wrapper、Handler、Driver 与 Core Bus、OSAL 和时基装配起来，并支持 Fake 替换与构建验证。用户需要平台绑定或 Port 层测试时使用。
---

# 嵌入式 Adapter

## 工作边界

Port 是 BSP 的装配边界：上层只依赖 Wrapper，Port 构造并注册 Handler/Driver，再注入 Core Bus、OSAL、时基和可选 Trace Ops。HAL、寄存器、GPIO 位操作和软件总线时序属于 Core 私有 Backend，不能在 BSP Port 实现。

先读取 BSP 的接口结构体和状态码，再读取 Core Bus、OSAL、时基的公共接口及目标工程装配代码。AHT21 的历史映射与纠正见 [references/aht21-adapter-pattern.md](references/aht21-adapter-pattern.md)。

## 执行流程

1. **建立映射表**
   - 对每一个函数指针记录：上层语义、平台 API、参数转换、返回值转换和上下文限制。
   - 区分 Core 事务级总线、延时、tick、OSAL 队列/任务/锁和 Driver Ops。
   - 对每一个抽象接口标记是否允许阻塞、是否可在 ISR 调用以及是否需要互斥保护。

2. **实现最小包装**
   - Port 函数只做参数转换、稳定接口调用、状态转换和必要的装配资源管理。
   - 平台初始化应幂等或明确拒绝重复初始化；失败必须返回可诊断状态。
   - 对指针、长度、地址、超时和句柄进行边界检查，避免把非法参数传给 Core Bus 或 OSAL。
   - 用静态接口表组装 Driver/Handler 所需依赖，避免把平台全局对象散落到业务代码。

3. **处理时序与并发边界**
   - Port 只选择 Core Bus 实例，不操作 SDA/SCL、START、STOP 或 ACK；软件 IIC 时序由 Core Software Backend 私有实现。
   - 共享总线锁由 Core Bus 管理，单设备请求串行化由 Handler 管理。
   - Port 只把公开 OSAL 或同形 Fake Ops 注入 Handler，不调用原生 RTOS。
   - 对 tick 溢出、阻塞超时和 ISR/线程上下文分别处理。

4. **支持生产与测试替换**
   - 生产表绑定真实 Core Bus/OSAL/时基；测试表绑定同形 Fake/Mock，不修改 BSP 源码。
   - Fake Core Bus 应可注入事务读写错误、超时、返回数据和调用记录；ACK 等位级故障由 Core Backend 测试覆盖。
   - 不在生产 Adapter 中包含 Unity 测试入口或测试专用全局状态。

5. **验证绑定**
   - 静态检查每个函数指针是否初始化、类型是否匹配、状态码是否完整覆盖。
   - 先用 Mock 验证映射和错误转换，再用 Keil 构建验证 include、源文件分组和宏。
   - 目标板验证真实 Core Bus/OSAL/时基行为，记录 RTT 日志、错误码和关键时序结果。

## 设计禁区

- 不让 Driver 直接 include HAL 或调用 `HAL_*`/GPIO 宏。
- 不在 Port 调用 HAL、实现软件 IIC 或暴露位级总线函数。
- 不用日志替代错误返回，也不在 bit-bang I2C 循环中输出高频日志。
- 不把不同层的状态码强制当作同一个枚举；必须显式转换并保留错误来源。
- 不隐藏初始化顺序、锁策略、线程上下文和资源所有权。
- 不因为目标板暂时可用而省略 Mock、失败路径和正常固件构建。

## 交付检查

- 抽象接口到 Core Bus/OSAL/时基的映射表完整。
- 所有函数指针已初始化且参数/返回值转换明确。
- 生产 Adapter 和 Mock Adapter 可互换。
- 时序、并发、ISR 限制和日志边界有文档记录。
- Keil 构建、测试构建和目标板运行证据与实际配置一致。
