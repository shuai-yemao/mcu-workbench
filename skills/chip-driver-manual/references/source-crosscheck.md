# 来源交叉核验

当有多个文档或代码来源，或某个来源看起来不完整时，使用此参考。

## 轻量规则

默认不要构建数据库或索引。只比较请求的驱动任务所需取值，然后报告已确认值、冲突和开放问题。

## 来源优先级

将此优先级作为启发式，而不是自动真理：

1. 精确料号和版本对应的 errata 或 product change notice。
2. Reference manual、programming guide 或 command specification。
3. 精确料号、封装、电压范围和温度等级对应的 datasheet。
4. 厂商 SVD、寄存器 XML、生成头文件或官方寄存器数据库。
5. 厂商 SDK/HAL/LL 驱动和示例。
6. 板级原理图、devicetree、Kconfig 或 BSP 集成文件。
7. 第三方示例或推断行为。

当低优先级来源更新或更具体时，解释为什么它可能覆盖高优先级来源。

## 常见非冲突

未检查表示方式前，不要将这些标为冲突：

- I2C 7-bit 地址 `0x50` 与 8-bit 写地址 `0xA0`。
- 寄存器 offset 与绝对地址。
- bit position 与 bit mask。
- 整寄存器复位值与字段复位值。
- 封装引脚号与信号名。
- 时序/电气表中的 typ 值与 max 值。
- SDK 宏名编码的是移位后的值，而不是原始枚举值。

## 冲突输出

使用此结构：

```yaml
conflicts:
  - item:
    source_a:
      file:
      page:
      section:
      value:
    source_b:
      file:
      page:
      section:
      value:
    likely_reason:
    driver_impact:
    recommended_action:
```

## 审查规则

- 优先使用精确料号和修订版本，而不是系列级数据。
- 将特定电压范围和特定温度范围的取值分开。
- 检查封装选项是否改变引脚、NC 引脚、裸露焊盘或 strap 引脚。
- 将 SDK 示例视为行为线索，而不是完整规格。
- 当 errata 适用于精确硅片版本时，将其视为强制覆盖。
- 如果冲突影响硬件安全、电源时序、erase/program、RF 发射或电压/电流设置，停止代码生成并请求确认。
