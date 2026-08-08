/**
 * TargetContract —— 目标契约(纯类型,引擎无关)。
 * 设计依据:docs/embedded-ai-harness-plan.md §4.3。
 * 目标 = 推理运行端:host(PC 模拟) / sim(QEMU 等仿真) / board(真实板卡)。
 * EngineContract × TargetContract 正交,任意组合。
 */

import type { ArtifactRef } from './artifact-schema';

/** 目标类型 */
export type TargetKind = 'host' | 'sim' | 'board';

/** 目标规格(规划期绑定用) */
export interface TargetSpec {
  id: string;
  kind: TargetKind;
  mcu?: string;
}

/** 目标能力声明 —— 供规划期静态校验 */
export interface TargetCapabilities {
  id: string;
  kind: TargetKind;
  mcu?: string;
  toolchains: string[];
  /** 可测量指标:accuracy | latency | ram | flash | power */
  measurable: string[];
}

export interface BuildResult {
  ok: boolean;
  artifact?: ArtifactRef;
  error?: string;
}

export interface FlashResult {
  ok: boolean;
  error?: string;
}

export interface ExecReq {
  bundle: ArtifactRef;
  args?: Record<string, unknown>;
}

export interface ExecResult {
  ok: boolean;
  outputs?: unknown;
  error?: string;
}

export interface MeasureReq {
  bundle: ArtifactRef;
  metrics: string[];
}

export interface MeasureResult {
  ok: boolean;
  metrics?: Record<string, number>;
  error?: string;
}

/** 目标适配器 —— 所有引擎差异外的目标差异封在此接口后 */
export interface TargetAdapter {
  capabilities(): TargetCapabilities;
  build(bundle: ArtifactRef): Promise<BuildResult>;
  flash(artifact: ArtifactRef): Promise<FlashResult>;
  exec(req: ExecReq): Promise<ExecResult>;
  measure(req: MeasureReq): Promise<MeasureResult>;
}
