# 嵌入式 AI 协作编程工作流

## 概述

本工作流与 `embedded-ai-collab` 技能配合使用，自动化处理代码审查和构建验证阶段。

## 工作流阶段

| 阶段 | 内容 | 方式 |
|------|------|------|
| 1. 加载规范 | 加载编码规范和审查清单 | 自动 |
| 2. 代码审查 | 三维度并行审查（质量/逻辑/安全） | 3 个 agent 并行 |
| 3. 构建验证 | 编译验证 + 错误修复 | agent 执行 |

## 使用方式

### 在技能中触发

完成 Phase 3（AI 逐函数生成）后，在 `embedded-ai-collab` 技能中触发本工作流进行审查。

### 独立调用

```javascript
Workflow({
  scriptPath: "C:/Users/zhang/.claude/workflows/embedded-ai-collab/workflow.js",
  args: {
    targetFiles: [
      "drivers/bsp_mpu6050_driver.c",
      "drivers/bsp_mpu6050_driver.h"
    ],
    moduleName: "mpu6050",
    mcuModel: "STM32F411CEU6",
    buildCommand: "make clean && make"
  }
})
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `targetFiles` | `string[]` | 否 | 待审查的源文件路径 |
| `moduleName` | `string` | 否 | 模块名（用于报告） |
| `mcuModel` | `string` | 否 | MCU 型号 |
| `buildCommand` | `string` | 否 | 编译命令 |

## 审查维度

| 维度 | 检查内容 |
|------|---------|
| `code-quality` | 缩进、行宽、注释、命名、分层 |
| `logic-correctness` | 判空、返回值、常数位置、循环、越界 |
| `security` | 中断安全、DMA、看门狗、时钟、GPIO |

三个维度并行执行，互不阻塞。
