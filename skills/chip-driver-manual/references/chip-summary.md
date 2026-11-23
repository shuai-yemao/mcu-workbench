# 芯片摘要

仅当用户要求可复用提取输出，或任务很可能跨多轮继续时使用。输出一个简洁的 `chip-summary.yaml`；默认不要创建芯片数据库目录。

## 目的

用一个小而可审查的产物捕获驱动工作所需事实，该产物可提交到项目中，或在后续 prompt 中复用。

## 模板

```yaml
chip:
  vendor:
  part_number:
  device_class:
  package:
  supply:
  temperature_range:
  document_sources:
    - file:
      title:
      version:
      date:

document_quality:
  pages:
  risk_labels:
  notes:

interface:
  bus:
  address_or_select:
  max_frequency:
  mode:
  transaction_notes:

driver_facts:
  identity:
  pins:
  reset:
  power:
  interrupts:
  timing:
  operations:
    - name:
      sequence:
      timeout:
      source:

registers_or_commands:
  summary:
  source:

constraints:
  - item:
    value:
    source:

conflicts:
  - item:
    impact:
    recommended_action:

open_questions:
  - question:
    why_it_matters:
```

## 风格

- 保持足够简短，便于人工审查。
- 对影响代码的取值包含来源。
- 优先使用 `not_found`，不要猜测。
- 仅在需要时，将大型寄存器表放到用户请求的单独产物中。
