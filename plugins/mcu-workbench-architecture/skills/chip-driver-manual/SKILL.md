---
name: chip-driver-manual
description: >-
  从芯片 datasheet、reference manual、programming manual、厂商 SDK 示例和寄存器头文件中提取并核验嵌入式驱动开发参数，覆盖 MCU
  外设、外部存储器、传感器、电源 IC、接口芯片、模拟/混合信号器件、显示/触控/音频控制器以及无线/RF 芯片等类型。用于 Codex 需要阅读芯片手册或
  PDF 来开发、审查或调试驱动，提取通信协议细节、地址、寄存器表、命令集、位字段、时序限制、电源/复位/IRQ/引脚数据、初始化序列、约束，或生成基于来源的驱动检查清单和代码。
---

# Chip Driver Manual

## 概述

使用此 skill 将厂商芯片文档转化为结构化的驱动开发事实。优先做分类、可追溯提取和明确的不确定性标注，而不是泛泛总结。

## 轻量边界

保持此 skill 轻量。用 LLM 推理完成芯片分类、语义提取、来源对比、风险判断、驱动流程解释以及 YAML/Markdown 汇总。脚本只用于确定性的文档处理，例如 PDF 文本提取和粗略质量检查。除非用户明确要求，不要创建数据库、OCR 流水线、下载器、索引服务或完整解析器。

## 工作流

1. 确认目标芯片、来源文档、请求的驱动任务和期望输出。
2. 如果必须读取 PDF 且项目中没有更合适的工具，使用 `scripts/extract_pdf_text_node.mjs` 生成保留页码的文本文件。
3. 如果文本来自 PDF/OCR 提取，使用 `scripts/detect_document_quality.mjs` 或 `references/document-quality.md` 评估乱码、表格丢失和 OCR 风险。
4. 阅读 `references/datasheet-triage.md`，判断文档类型、芯片类别、总线/协议和缺失来源风险。
5. 生成结构化提取结果前，阅读 `references/extraction-schema.md`。
6. 当提供多个来源，或 datasheet、SDK、SVD、头文件、errata 的取值可能不一致时，阅读 `references/source-crosscheck.md`。
7. 当器件通过 I2C、SPI、UART、1-Wire、MDIO、parallel、MIPI、USB、CAN 或 Ethernet 通信时，阅读 `references/bus-protocols.md`。
8. 阅读与芯片匹配的器件类别参考：
   - `references/mcu-peripherals.md`：MCU/SoC 外设控制器。
   - `references/external-memory.md`：EEPROM、NOR/NAND flash、FRAM、SRAM、PSRAM 或 eMMC 类存储器。
   - `references/sensors.md`：传感器、监测器、IMU、电量计和测量 IC。
   - `references/power-ics.md`：PMIC、LDO、DCDC 转换器、充电器、监控器和电源开关。
   - `references/interface-ics.md`：桥接器、扩展器、PHY、收发器和协议接口芯片。
   - `references/analog-mixed-signal.md`：ADC、DAC、放大器、比较器、codec 相邻器件和混合信号器件。
   - `references/display-touch-audio.md`：显示驱动、触控控制器、音频 codec 和放大器。
   - `references/wireless-rf.md`：BLE、Wi-Fi、LoRa、sub-GHz、GNSS、NFC 和 RF 收发器。
9. 生成寄存器宏、C 头文件、MMIO 访问器或审查寄存器写入前，阅读 `references/register-model.md`。
10. 生成驱动、审查驱动或准备 bring-up/debug 检查清单前，阅读 `references/driver-checklist.md`。
11. 如果用户需要可复用输出，阅读 `references/chip-summary.md` 并可选择输出一个 `chip-summary.yaml`；默认不要创建持久芯片数据库。
12. 将事实提取为简洁的人类可读摘要，并在有用时附带结构化 YAML 或 JSON。
13. 明确标注不清楚、缺失或冲突的项目。不要编造寄存器位、命令字节、枚举值、时序限制、地址、复位行为或初始化步骤。

## 来源处理

- 保留来源身份：文件名、文档标题、版本、日期、页码、章节、表格、图、SDK 路径和头文件符号，只要可获得就记录。
- 优先使用厂商一手资料，而不是博客文章或推断行为。
- 对重要取值，在引脚表、电气表、时序表、寄存器表、命令描述、初始化章节、SDK 示例和厂商头文件之间交叉核验。
- 在人工核对附近文本前，将 OCR 或 PDF 表格提取结果视为可疑。
- 如果 PDF 提取丢失表格结构，按命令名、寄存器名、偏移、位字段名、引脚名、时序符号和章节标题搜索，而不是依赖一次读取。

## 提取规则

- 对每个器件捕获身份、封装、供电、温度范围、引脚、接口协议、地址/ID、复位/上电时序、时序限制和驱动可见操作。
- 对 MCU/SoC 外设，捕获基地址、寄存器偏移、寄存器宽度、访问类型、复位值、字段位范围、枚举值和保留字段。
- 对外部芯片，捕获总线事务格式、命令字节、寄存器地址宽度、存储地址宽度、自动递增行为、busy 轮询、状态/错误标志和保护引脚/位。
- 捕获通信开始前必需的集成数据：MCU 总线模式、上拉、片选、复位引脚、中断引脚、电源轨、时钟输入、pinmux 和电平要求。
- 捕获行为敏感字段和操作：W1C、read-to-clear、write-only、read-only、自清除、lock/unlock、影子寄存器、busy 标志、FIFO、状态标志、非易失写/擦延迟、校准和低功耗转换。
- 捕获初始化顺序、必要延迟、轮询循环和恢复步骤。
- 保留位保持复位值，或遵循手册明确规则。
- 对影响正确性的缺失事实使用 `open_questions`。

## 输出期望

提取任务应包含：

- 已确认事实的简洁摘要。
- 遵循 `references/extraction-schema.md` 的结构化块。
- 主要取值的来源映射。
- 当来源不一致时提供冲突列表。
- 未核验项目的开放问题列表。
- 当用户请求复用时，可选提供一个遵循 `references/chip-summary.md` 的 `chip-summary.yaml`。

代码生成任务应包含：

- 仅基于已确认事实生成的代码。
- 对来源中未确认的取值添加 `TODO` 标记。
- 针对 W1C、read-to-clear、write-only 和保留位等访问风险的说明。
- 如果代码触及硬件初始化，提供 bring-up 检查清单。

审查任务应包含：

- 发现项优先，并按严重程度排序。
- 每个问题对应的手册来源，或缺失来源的原因。
- 当来源明确时，给出具体修改建议。

## Agent 兼容性

此 skill 与 agent 无关，可供 Codex、Claude Code 或其他能读取此目录的 LLM agent 使用。安装路径、调用示例、预期输入/输出、工作流和证据边界见 `README.md`。
