# 提取 Schema

当把芯片手册、SDK 示例或厂商头文件转换为可复用驱动开发事实时，使用此 schema。每个芯片都保留通用章节，然后添加适合该器件的类别扩展。省略无关字段，但当事实不完整时保留 `source`、`conflicts` 和 `open_questions`。

## YAML 模板

```yaml
chip:
  vendor:
  part_number:
  family:
  device_class:
  package:
  temperature_range:
  supply:
    rails:
      - name:
        min:
        typ:
        max:
        unit:
  document:
    title:
    version:
    date:
    source_file:

document_quality:
  pages:
  text_length:
  risk_labels:
  notes:

interface:
  bus:
  address_or_select:
  max_frequency:
  mode:
  address_width:
  transaction_notes:

integration:
  pins:
    - name:
      function:
      direction:
      electrical:
      notes:
  reset:
    pin:
    register:
    sequence:
  clock:
    input:
    output:
    requirements:
  interrupt:
    pin:
    polarity:
    clear_method:
  power:
    startup_delay:
    sequencing:
    low_power:

mcu_peripheral:
  type:
  instance:
  base_address:
  bus_domain:
  clock:
    source:
    gate_register:
    enable_field:
    frequency_limits:
  reset:
    register:
    field:
    polarity:
  irq:
    number:
    name:
    controller:
  dma:
    tx_request:
    rx_request:
    channel:

external_device:
  device_id:
  command_set:
    - name:
      opcode:
      transaction:
      description:
  memory:
    density:
    organization:
    address_range:
    address_width:
    page_size:
    erase_size:
    write_cycle_time:
    endurance:
    retention:
  sensor:
    quantities:
    resolution:
    output_format:
    scale_formula:
    odr:
    range:
    calibration:
  power_ic:
    rails:
    voltage_formula:
    faults:
    sequencing:

registers:
  - name:
    offset:
    address:
    width:
    access:
    reset_value:
    description:
    source:
      file:
      page:
      section:
      table:
    fields:
      - name:
        bits:
        access:
        reset:
        enum:
          - name:
            value:
            description:
        description:
        hazards:
        notes:
        source:
          file:
          page:
          section:
          table:

init_sequence:
  - step:
    action:
    register:
    field:
    value:
    reason:
    wait_or_delay:
    source:
      file:
      page:
      section:

runtime_operations:
  - name:
    transaction:
    preconditions:
    postconditions:
    timeout:
    source:
      file:
      page:
      section:

constraints:
  - item:
    value:
    applies_to:
    source:
      file:
      page:
      section:

conflicts:
  - item:
    source_a:
    value_a:
    source_b:
    value_b:
    impact:

open_questions:
  - question:
    why_it_matters:
    suggested_source:
```

## 扩展规则

- 对内部 MCU/SoC 外设控制器使用 `mcu_peripheral`。
- 对命令驱动型芯片使用 `external_device.command_set`，即使它们也有寄存器。
- 对 EEPROM、flash、FRAM、SRAM、PSRAM 和类似存储器使用 `external_device.memory`。
- 对传感器缩放、输出数据和校准使用 `external_device.sensor`。
- 对电源轨、故障、时序和可编程电压/电流设置使用 `external_device.power_ic`。
- 任何带驱动可见寄存器的器件都保留 `registers`，无论它是内部还是外部器件。
- 对 read/write/program/erase/measure/enable/reset 等更适合表示为总线事务而不是简单寄存器写的操作，保留 `runtime_operations`。

## 来源规则

- 可获得时包含页码和章节。
- 当事实来自代码时，包含 SDK 路径和符号名。
- 当事实来自头文件时，包含厂商头文件路径和 macro/typedef 名。
- 使用 `unverified` 或 `not found in provided sources`，不要猜测。
