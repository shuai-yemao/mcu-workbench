# 测试用例设计

构建测试矩阵时使用本参考。

## 核心用例类别

- Happy path：合法输入和预期正常输出
- Boundary values：min、max、zero、one、length limits、enum edges
- Invalid input：null pointers、bad lengths、invalid enum values、malformed frames
- State transitions：init、idle、active、error、recovery、reset
- Error paths：dependency failure、timeout、checksum error、busy state、resource exhaustion
- Regression：bugfix 或 issue 描述的精确条件
- Idempotence/reentrancy：重复调用、reset 调用、double init、cleanup

## 嵌入式特有用例

- 固定宽度整数 overflow 和 underflow
- Endianness 和 byte packing
- Ring buffer wraparound
- Saturation 和 clamping
- CRC/checksum mismatch
- 协议 frame escaping、length 和 timeout fields
- HAL/BSP failure returns
- 可 mock 时的 RTOS queue/semaphore API failure paths

## 预期结果纪律

只有以下来源之一支持时，才使用具体 expected values：

- 代码逻辑明确且确定
- 既有测试建立了该行为
- 需求或 issue 文本规定了行为
- 用户确认了预期行为

代码和需求冲突时，标出冲突，并在写入断言前请求确认。
