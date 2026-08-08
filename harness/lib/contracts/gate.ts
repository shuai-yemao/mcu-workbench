/**
 * Gate —— 门禁契约(纯类型)。
 * 设计依据:docs/embedded-ai-harness-plan.md §4.4(ADR H08:三层门禁)。
 * 三层判定(按序,全过才放行):
 *   1. schema 校验:ArtifactMeta 字段 + schemaVersion 兼容
 *   2. checksum 校验:内容哈希与 meta 一致(防篡改)
 *   3. 声明式阈值(pipeline.json gates)+ 可编程验证器(stage.validate)
 */

/** 门禁判定结果 */
export interface GateVerdict {
  pass: boolean;
  reasons: string[];
  evidence?: string;
}

/** 声明式指标阈值(对应 pipeline.json 的 gates 字段,全部可选) */
export interface GateRules {
  minAccuracy?: number;
  maxLatencyMs?: number;
  maxRamBytes?: number;
  maxFlashBytes?: number;
  [key: string]: unknown;
}

/** 带产物上下文的门禁结果 */
export interface StageGateResult extends GateVerdict {
  artifactId?: string;
}

/** 可编程验证器签名(Stage 可选实现,门禁第 3 层) */
export interface GateValidator {
  (context: unknown, artifact: unknown): GateVerdict;
}
