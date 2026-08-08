/**
 * ArtifactSchema —— 产物契约(纯类型,引擎无关)。
 * 设计依据:docs/embedded-ai-harness-plan.md §4.1(ADR H04:不可变内容寻址 + 血缘)。
 * 运行时合法值列表见 ../validate/artifact-validator.js(保持同步,checkJs 绑定)。
 */

/** 产物类型 */
export type ArtifactKind =
  | 'dataset'
  | 'model'
  | 'converted-model'
  | 'quantized-model'
  | 'generated-code'
  | 'runtime-bundle'
  | 'eval-report';

/** 流水线阶段标识(默认链:collect → train → quantize → integrate → eval) */
export type StageId = 'collect' | 'train' | 'quantize' | 'integrate' | 'eval';

/** 产物引用(跨阶段传递的最小句柄) */
export interface ArtifactRef {
  id: string;
  path: string;
}

/**
 * 产物元数据 —— 不可变:schemaVersion 语义化;id 内容寻址(sha256 前缀);
 * checksum 防篡改;lineage 血缘链回答"从哪来"。
 */
export interface ArtifactMeta {
  kind: ArtifactKind;
  schemaVersion: string;
  id: string;
  checksum: string;
  size: number;
  lineage: string[];
  producer: {
    stage: StageId;
    runId: string;
    engine?: string;
  };
  createdAt: string;
  labels?: Record<string, string>;
}
