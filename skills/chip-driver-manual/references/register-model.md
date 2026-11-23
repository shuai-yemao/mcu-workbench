# 寄存器模型

建模寄存器，或生成 C 宏、头文件、访问器、审查说明时，使用这些规则。

## 字段表示

- 单 bit 表示为 `N`。
- 范围表示为 `msb:lsb`，例如 `7:4`。
- 将 offset 和 address 存为十六进制字符串，并保持宽度格式一致。
- 按文档原样记录复位值。如果未知，使用 `unknown`，不要用 `0`。
- 当寄存器级和字段级访问类型都可获得时，分别记录。

## 访问类型

常见访问标签：

- `RO`：read-only
- `WO`：write-only
- `RW`：read/write
- `W1C`：write 1 to clear
- `W0C`：write 0 to clear
- `RC`：read clears
- `RS`：read sets
- `SC`：self-clearing
- `T`：toggle on write

如果手册使用不同名称，在 notes 中保留厂商措辞。

## C 宏规则

优先使用显式位置和掩码宏：

```c
#define PERIPH_REG_FIELD_Pos  4u
#define PERIPH_REG_FIELD_Msk  (0x3u << PERIPH_REG_FIELD_Pos)
```

对单 bit 字段：

```c
#define PERIPH_REG_ENABLE_Pos  0u
#define PERIPH_REG_ENABLE_Msk  (1u << PERIPH_REG_ENABLE_Pos)
```

对枚举值：

```c
#define PERIPH_REG_MODE_DISABLED  (0x0u << PERIPH_REG_MODE_Pos)
#define PERIPH_REG_MODE_ENABLED   (0x1u << PERIPH_REG_MODE_Pos)
```

除非清楚标记为 TODO，否则不要为未确认字段生成宏。

## 保留位

- 不要把保留位命名为可用字段。
- read-modify-write 时保留保留位，除非手册明确要求写固定值。
- 如果复位值未知，除非全部可写字段和保留位行为都已确认，否则避免整寄存器写入。

## Read-Modify-Write 风险

- 除非已证明掩码行为安全，否则避免对包含 W1C 或 read-to-clear 字段的寄存器做 RMW。
- 可用时优先使用专用 set/clear 寄存器。
- 对状态寄存器，将标志清除与配置写入分开。
- 对 write-only 寄存器，生成写辅助函数，但不要生成读回检查。

## MMIO 访问

- 使用 `volatile` 或目标项目既有的 MMIO 访问器。
- 遵循现有项目在 barrier、endianness 和整数类型方面的风格。
- 避免发明 memory barriers；只标注架构或项目可能需要的位置。
