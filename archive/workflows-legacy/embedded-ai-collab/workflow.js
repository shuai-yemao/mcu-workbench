export const meta = {
  name: 'embedded-ai-collab',
  description: '嵌入式 AI 协作编程 — 编排代码审查和构建验证阶段，与 embedded-ai-collab 技能配合使用',
  phases: [
    { title: '加载规范', detail: '加载编码规范和审查清单到上下文' },
    { title: '代码审查', detail: '并行运行三个审查维度' },
    { title: '构建验证', detail: '编译验证并修复错误' },
  ],
}

// ============================================================
// 嵌入式 AI 协作编程工作流
// ============================================================
// 使用场景：
//   在技能 Phase 3（AI 生成）完成后，运行本工作流进行自动化审查和验证。
//
// 调用方式：
//   Workflow({scriptPath: "C:/Users/zhang/.claude/workflows/embedded-ai-collab/workflow.js"})
//
// 输入 (args)：
//   - targetFiles: string[]  — 待审查的源文件路径列表
//   - moduleName: string     — 模块名（如 "mpu6050"）
//   - mcuModel: string       — MCU 型号（如 "STM32F411CEU6"）
//   - buildCommand: string   — 编译命令（如 "make clean && make"）
// ============================================================

phase('加载规范')

log('加载嵌入式编码规范和审查清单...')

// 审查维度定义
const REVIEW_DIMENSIONS = [
  {
    key: 'code-quality',
    prompt: `你是一名嵌入式 C 代码审查专家。请审查以下代码的通用质量：

审查标准（来自 embedded-ai-coding-standard）：
1. 缩进为 4 空格，无 TAB
2. 行宽 ≤ 80 列
3. 所有函数有 doxygen 注释（@brief @param @retval）
4. 函数内有居中格式的逻辑注释（/* --- Step --- */）
5. 命名符合规范：函数 snake_case、宏 UPPER_SNAKE_CASE、类型 snake_case_t
6. 头文件组织顺序正确
7. 分层正确（不越层调用）

输出格式：列出所有违规项，标注严重度（CRITICAL/HIGH/MEDIUM/LOW）和位置。`
  },
  {
    key: 'logic-correctness',
    prompt: `你是一名嵌入式 C 逻辑审查专家。请审查以下代码的逻辑正确性：

重点检查：
1. 所有指针使用前是否判空（NULL == p_xxx）
2. 所有函数调用是否检查返回值
3. 判断语句常数是否放在左边
4. 错误路径是否有 return，不会 fall-through
5. 循环是否有明确的退出条件
6. 数组索引是否会越界
7. 寄存器地址是否正确（需要交叉验证 datasheet 的请标注"待验证"）

输出格式：列出所有逻辑问题，标注严重度和代码行号。`
  },
  {
    key: 'security',
    prompt: `你是一名嵌入式安全审查专家。请审查以下代码的安全性：

重点检查：
1. 中断回调中是否有阻塞调用（I2C 等待、HAL_Delay 等）
2. 中断回调中是否访问了非原子的全局变量
3. DMA 缓冲区是否分配在正确的内存区域（非栈上）
4. 看门狗是否在长操作前喂狗
5. 堆栈大小是否足够（检查任务栈声明）
6. 时钟配置是否合理
7. GPIO 模式配置是否正确
8. 是否有缓冲区溢出风险

输出格式：列出所有安全问题，标注严重度和修复建议。`
  }
]

// ============================================================
// Phase 2: 并行代码审查
// ============================================================
phase('代码审查')

const targetFiles = args?.targetFiles || []
const moduleName = args?.moduleName || 'unknown'

if (targetFiles.length === 0) {
  log('⚠️ 未指定待审查文件（args.targetFiles 为空），跳过审查阶段')
} else {
  log(`审查模块 "${moduleName}" 的 ${targetFiles.length} 个文件...`)

  // 并行运行三个维度的审查
  const reviewResults = await parallel(
    REVIEW_DIMENSIONS.map(dim => () =>
      agent(
        `${dim.prompt}

待审查文件列表：
${targetFiles.map(f => `- ${f}`).join('\n')}

请逐个文件审查，输出结构化报告。`,
        {
          label: `review:${dim.key}`,
          phase: '代码审查',
        }
      )
    )
  )

  // 汇总审查结果
  const validResults = reviewResults.filter(Boolean)
  log(`审查完成：${validResults.length}/${REVIEW_DIMENSIONS.length} 个维度已完成`)
}

// ============================================================
// Phase 3: 构建验证
// ============================================================
phase('构建验证')

const buildCommand = args?.buildCommand

if (!buildCommand) {
  log('⚠️ 未指定编译命令（args.buildCommand 为空），跳过构建验证')
} else {
  log(`执行编译验证：${buildCommand}`)

  const buildResult = await agent(
    `执行编译命令 "${buildCommand}" 并分析结果。
如果编译失败，请提取错误信息并给出修复建议。

注意：这是一个 ${args?.mcuModel || 'STM32'} 嵌入式项目。`,
    {
      label: 'build-verify',
      phase: '构建验证',
    }
  )

  if (buildResult) {
    log('构建验证完成')
  }
}

// ============================================================
// 最终报告
// ============================================================
log(`
========================================
  嵌入式 AI 协作 — 工作流完成
========================================
模块: ${moduleName}
审查维度: ${targetFiles.length > 0 ? REVIEW_DIMENSIONS.map(d => d.key).join(', ') : '未执行'}
构建验证: ${args?.buildCommand ? '已执行' : '未执行'}
========================================
`)
