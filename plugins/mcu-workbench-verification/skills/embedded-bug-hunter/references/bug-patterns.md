# 嵌入式 Bug 模式

深入阅读候选文件时使用本清单。命中某个模式还不够，必须结合周边代码路径确认。

## 1. 内存与字符串处理

- 无边界的 `strcpy`、`strcat`、`sprintf`、`gets`、`scanf`。
- `memcpy`、`memmove` 或 `memset` 使用未校验的外部长度。
- 缓冲区长度使用比数据路径更窄的整数类型保存。
- 有界拷贝后缺少 NUL 结尾。
- RTOS 任务或 callback 中使用过大或变长的栈数组。

## 2. 整数、单位与 tick 溢出

- 边界检查中混用 signed/unsigned。
- 分配或拷贝前进行尺寸乘法但未检查溢出。
- 毫秒/tick 转换溢出或截断。
- 超时判断写成 `now > start + timeout`，而不是回绕安全的减法。
- 混用 ms/us/ticks/bytes/words 等单位但没有命名说明。

## 3. 协议解析与输入校验

- 在检查帧大小前信任长度字段。
- 处理 command ID 时没有版本或兼容性 fallback。
- CRC/checksum 在状态改变后才验证。
- 出错后 parser 仍接受半帧或陈旧缓冲区状态。
- default 分支静默忽略本应复位或报告的非法输入。

## 4. ISR 与 Callback 安全

- 在 ISR 中阻塞等待、delay、printf/logging、malloc/free、文件或 Flash 访问。
- ISR 修改共享变量但缺少 `volatile` 或同步。
- ISR 调用同时被任务或 main loop 使用的非可重入代码。
- callback 更新状态时，另一个任务可能不安全地读写该状态。

## 5. RTOS 并发

- 共享状态访问缺少 mutex、critical section 或 queue 所有权规则。
- queue send/receive 缺少 timeout 处理。
- semaphore/mutex take 路径可能提前返回而不释放资源。
- task stack 对本地缓冲区或嵌套调用来说可能过小。
- 长 critical section 或低优先级锁持有者造成优先级反转风险。

## 6. DMA、Cache 与 Buffer 生命周期

- DMA buffer 分配在栈上，或完成前被复用。
- 启用 cache 的 MCU 上缺少 alignment/cache clean/invalidate。
- CPU 在完成标志前读取 DMA buffer。
- DMA callback 与 task 处理之间缺少所有权移交，存在竞态。

## 7. Flash、EEPROM 与持久化状态

- erase/write 没有掉电恢复策略。
- 持久化结构缺少 version、CRC、length 或 magic。
- 写入前没有 wear leveling 或写次数控制。
- 中断或任务可能在写 Flash 期间访问同一资源。
- 配置读取失败后默认值不安全或未记录。

## 8. 看门狗与错误恢复

- 在阻塞循环中喂狗，掩盖死锁。
- 错误路径无限重试且无退避、复位或告警。
- 初始化失败后继续运行关键功能。
- recovery 只清局部状态，没有清硬件 FIFO、DMA 或协议状态。

## 9. 状态机与模式切换

- 状态切换缺少显式合法边。
- error/recovery 状态无法退出或未清理资源。
- 进入低功耗、升级、bootloader 或校准模式时仍有任务访问旧资源。
- 状态变量在多个上下文中修改但没有单一所有者。

## 10. 构建、配置与条件编译

- 不同 target 或 build type 下的宏改变安全路径。
- debug 宏影响 timing、logging 或 buffer size。
- 链接脚本、startup 或 vector table 与实际芯片不匹配。
- 生成代码和用户代码边界不清，导致再生成覆盖修复。

## 报告提醒

- 只把可到达、可解释、有源码证据的路径标为 `confirmed_issue`。
- 缺少调用链、硬件状态或运行时调度证据时，标为 `suspicious_pattern` 或 `needs_runtime_evidence`。
- 对每项发现写清误报风险，尤其是项目已有封装、宏保护或外部约束可能已经处理风险时。
