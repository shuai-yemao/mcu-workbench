---
name: debug-jlink
description: 使用 J-Link + probe-rs MCP 工具进行嵌入式 AI 调试。支持探针发现、目标连接、核心控制（halt/run/step）、内存读写、断点管理、Flash 编程、RTT 日志。当用户提到 J-Link 调试、probe-rs 调试、AI 调试、MCP 嵌入式调试、读寄存器、写内存、设断点、RTT 调试时使用。
version: "1.0.0"
---

# J-Link AI 调试（probe-rs MCP）

通过 embedded-debugger-mcp（基于 probe-rs）的 MCP 工具，实现 AI 辅助的 J-Link 嵌入式调试。

## 前置条件

1. 已安装 [embedded-debugger-mcp](https://github.com/Adancurusul/embedded-debugger-mcp)
2. J-Link 探针已连接目标板
3. MCP Server 已在 Claude Code 中配置

### 安装 embedded-debugger-mcp

```bash
# 方式 1: cargo 安装
cargo install embedded-debugger-mcp

# 方式 2: Claude Code 一键安装（推荐）
skill install --target both

# 方式 3: 手动配置 MCP（添加到 ~/.claude/settings.json）
```

MCP 配置示例：
```json
{
  "mcpServers": {
    "embedded-debugger": {
      "command": "embedded-debugger-mcp",
      "args": []
    }
  }
}
```

## 可用 MCP 工具（17 个）

### 探针管理
| 工具 | 功能 | 参数 |
|------|------|------|
| `list_probes` | 发现已连接的调试探针 | 无 |
| `list_serial_ports` | 列出可用串口 | 无 |

### 连接控制
| 工具 | 功能 | 参数 |
|------|------|------|
| `connect` | 连接到目标 MCU | `probe_id`, `chip_name`, `protocol`(SWD/JTAG), `speed` |
| `disconnect` | 断开连接 | 无 |
| `reset_target` | 复位目标 | `reset_type`(HW/SW/SOFT) |

### 核心控制
| 工具 | 功能 | 参数 |
|------|------|------|
| `halt` | 暂停核心 | 无 |
| `resume` | 恢复运行 | 无 |
| `step` | 单步执行 | 无 |

### 内存操作
| 工具 | 功能 | 参数 |
|------|------|------|
| `read_memory_32` | 读 32 位内存 | `address`, `words` |
| `read_memory_8` | 读 8 位内存 | `address`, `bytes` |
| `write_memory_32` | 写 32 位内存 | `address`, `data` |
| `write_memory_8` | 写 8 位内存 | `address`, `data` |

### 断点
| 工具 | 功能 | 参数 |
|------|------|------|
| `set_breakpoint` | 设置断点 | `address`, `kind`(EOL/BP/FP) |
| `clear_breakpoint` | 清除断点 | `address` |

### Flash 编程
| 工具 | 功能 | 参数 |
|------|------|------|
| `flash_erase` | 擦除 Flash | `sector` |
| `flash_program` | 编程 Flash | `path` |

### RTT
| 工具 | 功能 | 参数 |
|------|------|------|
| `rtt_attach` | 连接 RTT | `channel` |
| `rtt_read` | 读取 RTT 数据 | `channel` |

## AI 调试工作流

### 场景 1: HardFault 诊断（AI 增强版）

```
步骤 1: 连接目标
  → connect(probe_id="0", chip_name="STM32F411CE", protocol="SWD")

步骤 2: 暂停核心读取 Fault 寄存器
  → halt()
  → read_memory_32(address="0xE000ED28", words=1)  // CFSR
  → read_memory_32(address="0xE000ED2C", words=1)  // HFSR
  → read_memory_32(address="0xE000ED38", words=1)  // MMFAR
  → read_memory_32(address="0xE000ED3C", words=1)  // BFAR

步骤 3: 读取栈帧（崩溃现场）
  → read_memory_32(address="0x2000XXXX", words=8)  // MSP/PSP 指向的栈帧

步骤 4: AI 语义分析
  → 根据 CFSR 各位域判断故障类型
  → 根据 PC 值 + .map 文件定位到具体函数和行号
  → 结合 embedded-debugger-framework 五层模型给出诊断建议

步骤 5: 可选修复
  → resume() 恢复运行
  → 或 write_memory_32() 修复变量值后继续
```

### 场景 2: 内存/寄存器检查

```
→ connect(...)
→ halt()
→ read_memory_32(address="0x40002000", words=8)  // 读 USART1 寄存器
→ resume()
```

### 场景 3: 运行时修改变量

```
→ connect(...)
→ halt()
→ write_memory_32(address="0x20000100", data=[0x00000001])  // 修改全局变量
→ resume()
```

### 场景 4: RTT 日志查看

```
→ connect(...)
→ rtt_attach(channel=0)
→ rtt_read(channel=0)  // 获取 RTT 输出
```

## 与现有技能包的关系

| 技能包 | 关系 | 说明 |
|--------|------|------|
| `embedded-debugger-framework` | **上层方法论** | 五层诊断模型指导 MCP 工具的使用策略 |
| `cmbacktrace-debug` | **下游分析** | MCP 读取 Fault 寄存器 → CmBacktrace 格式解析 → addr2line |
| `arm-core-registers` | **知识参考** | 寄存器地址和位域定义 |
| `debug-gdb-openocd` | **替代方案** | 当不需要 AI 增强时，使用传统 GDB+OpenOCD |
| `segger-rtt-module` | **互补** | RTT MCU 端集成指南，本技能包负责 PC 端 MCP 读取 |
| `ozone-module` | **互补** | Ozone 提供 GUI 分析，本技能包提供 AI CLI 调试 |

## 调试命令参考

### 通过 mcu-debug 命令启动（推荐）

```bash
# J-Link GDB Server 模式
mcu-debug --device jlink --platform stm32f4 --debugger jlink

# probe-rs GDB Server 模式
mcu-debug --device jlink --platform stm32f4 --debugger probe-rs
```

### 直接使用 MCP 工具

在对话中直接调用 MCP 工具即可，例如：
- "帮我读取 0x40002000 地址的寄存器值" → `read_memory_32`
- "在 main 函数入口设断点" → `set_breakpoint`
- "暂停 MCU" → `halt`

## 错误处理

| 错误 | 原因 | 解决方案 |
|------|------|---------|
| No probes found | J-Link 未连接 | 检查 USB 连接和驱动 |
| Failed to connect | 目标板未供电或 SWD 线序错误 | 检查供电和接线 |
| Target not halted | 核心未暂停就访问内存 | 先调用 halt() |
| RTT init failed | 目标未配置 RTT | 参考 segger-rtt-module 集成 |

## 边界定义

### 不该激活
- 用户没有 J-Link 探针 → 使用 debug-gdb-openocd
- 用户只需要烧录不需要调试 → 使用 flash-jlink
- ESP32 项目 → 使用 debug-platformio

### 不该做
- **禁止**在未连接目标时尝试内存操作
- **禁止**在运行态写内存（必须先 halt）
- **禁止**在 AI 分析 HardFault 时 resume（保留现场）
- **禁止**自动擦除 Flash（需用户确认）

### 不该碰
- **不触碰** Option Bytes
- **不触碰** Bootloader 分区
- **不触碰** 非调试目标的系统进程
