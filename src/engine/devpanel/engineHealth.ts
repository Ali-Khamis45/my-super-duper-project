import { getModelCacheStats } from "@/engine/assets/glb";
import { getTextureCacheStats } from "@/engine/assets/textures";
import { appEvents } from "@/engine/events";
import { getMaterialCacheStats } from "@/engine/materials/cache";
import { performanceManager } from "@/engine/performance";
import { latestSnapshot } from "@/engine/performance/runtimeProfiler";
import { getShaderDiagnostics } from "@/engine/shaders/diagnostics";
import { shaderRegistry } from "@/engine/shaders/registry";

/**
 * Engine Health Dashboard aggregation (Sprint 2.6) — deliberately lives in
 * the Debug Layer, not `engine/performance/`. `runtimeProfiler.ts`'s own
 * doc comment already drew this boundary before this sprint existed:
 * combining material/texture/shader stats inside `engine/performance/`
 * would mean the Performance Manager importing from Materials/Assets/
 * Shaders — a direct violation of the one-directionality rule
 * (docs/15_ARCHITECTURE_FREEZE.md: "Performance Manager never imports
 * Effect/Shader/Material Managers"). The Debug Layer isn't bound by that
 * rule — it's a pure sink that nothing else depends on, so it's the
 * correct place for a cross-cutting read of every manager's already-public
 * stats accessors. Every field below is read through an existing public
 * export (`getTextureCacheStats`, `getMaterialCacheStats`, `shaderRegistry`,
 * `getShaderDiagnostics`, `latestSnapshot`, `performanceManager`,
 * `appEvents.getEmitCount`) — nothing here reaches into another manager's
 * internals.
 */
export interface EngineHealthSnapshot {
  fps: number;
  frameTimeMs: number;
  drawCalls: number;
  triangles: number;
  textureCount: number;
  materialCount: number;
  modelCount: number;
  registeredShaders: number;
  compiledShaders: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRatio: number;
  qualityTier: string;
  qualityMode: string;
  gpuTextures: number;
  eventsPerSecond: number;
}

let lastEmitCount = 0;
let lastSampleAt = 0;

/** Test-only reset — mirrors `resetGpuBudgetState`'s purpose, since the events/sec rate is derived from module-level counter state. */
export function resetEngineHealthState(): void {
  lastEmitCount = 0;
  lastSampleAt = 0;
}

/**
 * Computed on demand, not continuously polled — called from `DevPanel`'s
 * render, which itself only re-renders when `latestSnapshot` changes
 * (~500ms cadence via `PerformanceSampler`), so this naturally samples at
 * the same rate without a second timer.
 */
export function computeEngineHealth(): EngineHealthSnapshot {
  const snapshot = latestSnapshot.getValue();
  const textureStats = getTextureCacheStats();
  const modelStats = getModelCacheStats();
  const materialStats = getMaterialCacheStats();

  const compiledShaders = Array.from(getShaderDiagnostics().values()).filter((entry) => entry.state === "compiled").length;

  const cacheHits = textureStats.hits + modelStats.hits + materialStats.hits;
  const cacheMisses = textureStats.misses + modelStats.misses + materialStats.misses;
  const totalCacheOps = cacheHits + cacheMisses;

  const now = performance.now();
  const emitCount = appEvents.getEmitCount();
  const elapsedSeconds = lastSampleAt > 0 ? (now - lastSampleAt) / 1000 : 0;
  const eventsPerSecond = elapsedSeconds > 0 ? Math.max(0, (emitCount - lastEmitCount) / elapsedSeconds) : 0;
  lastEmitCount = emitCount;
  lastSampleAt = now;

  return {
    fps: snapshot?.fps ?? 0,
    frameTimeMs: snapshot?.frameTimeMs ?? 0,
    drawCalls: snapshot?.drawCalls ?? 0,
    triangles: snapshot?.triangles ?? 0,
    textureCount: textureStats.size,
    materialCount: materialStats.size,
    modelCount: modelStats.size,
    registeredShaders: shaderRegistry.list().length,
    compiledShaders,
    cacheHits,
    cacheMisses,
    cacheHitRatio: totalCacheOps > 0 ? cacheHits / totalCacheOps : 0,
    qualityTier: performanceManager.tier.getValue(),
    qualityMode: performanceManager.mode.getValue(),
    gpuTextures: snapshot?.gpuTextures ?? 0,
    eventsPerSecond,
  };
}
