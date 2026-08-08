/**
 * EngineContract —— 引擎契约(纯类型,厂商无关)。
 * 设计依据:docs/embedded-ai-harness-plan.md §4.2(ADR H02:引擎无关抽象优先)。
 * 引擎差异全部封在实现 EngineAdapter 的插件内,Stage 层只见此契约;
 * capabilities() 用于规划期静态校验,不兼容在规划期失败而非运行期。
 */

import type { ArtifactRef } from './artifact-schema';
import type { TargetAdapter, TargetSpec } from './target-contract';

/** 引擎能力声明 */
export interface EngineCapabilities {
  id: string;
  version: string;
  inputFormats: string[];
  outputFormats: string[];
  quantSchemes: string[];
  ops: string[];
  compatibleTargets: string[];
}

/** 代码生成配置 */
export interface GenConfig {
  outputDir: string;
  [key: string]: unknown;
}

/** 运行结果(推理执行) */
export interface RunResult {
  ok: boolean;
  outputs?: unknown;
  error?: string;
}

/** 引擎适配器 —— 引擎侧唯一实现面 */
export interface EngineAdapter {
  capabilities(): EngineCapabilities;
  /** 模型导入与转换 → converted-model */
  convert(req: { artifact: ArtifactRef; target: TargetSpec }): Promise<ArtifactRef>;
  /** 量化(校准集可选)→ quantized-model */
  quantize(req: { artifact: ArtifactRef; dataset?: ArtifactRef; scheme: string }): Promise<ArtifactRef>;
  /** 代码生成(集成到目标工程)→ generated-code */
  generateCode(req: { artifact: ArtifactRef; config: GenConfig }): Promise<ArtifactRef>;
  /** 在目标上运行推理 */
  run(req: { bundle: ArtifactRef; target: TargetAdapter }): Promise<RunResult>;
  /** 评测(精度/延迟/内存/功耗)→ eval-report */
  evaluate(req: {
    bundle: ArtifactRef;
    target: TargetAdapter;
    dataset: ArtifactRef;
  }): Promise<ArtifactRef>;
}
