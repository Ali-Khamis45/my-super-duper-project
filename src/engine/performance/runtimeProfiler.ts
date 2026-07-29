import { createBridgeStore } from "@/engine/state/createBridgeStore";

/**
 * Runtime Profiler — "every runtime metric has exactly one producer...
 * metrics are immutable snapshots... no manager may rewrite another
 * manager's measurements." `recordPerformanceSnapshot` is the *only*
 * function that writes `latestSnapshot`; every field on a returned
 * snapshot is frozen (`Object.freeze`), so a consumer can read it but
 * never mutate it in place — a real, enforced guarantee, not just a
 * naming convention.
 *
 * Deliberately scoped to renderer-level metrics only (`gl.info` — draw
 * calls/triangles/geometries — plus FPS/frame time). Material/texture
 * cache stats are real and available (`engine/materials`,
 * `engine/assets`), but combining them here would mean `engine/performance/`
 * importing from `engine/materials/` — a direct violation of the
 * one-directionality rule (docs/15_ARCHITECTURE_FREEZE.md). That
 * aggregation happens one layer up, in the Debug Overlay
 * (`engine/devpanel/DevPanel.tsx`), which isn't bound by that rule.
 */
export interface PerformanceSnapshot {
  readonly timestamp: number;
  readonly fps: number;
  readonly frameTimeMs: number;
  readonly drawCalls: number;
  readonly triangles: number;
  readonly geometries: number;
  /** `gl.info.memory.textures` — Three's own live GPU texture count. A count, not bytes: no reliable cross-browser API measures actual GPU memory, the same honest limitation documented since Sprint 2.2's cache caps. Still a real, renderer-level `gl.info` reading, so it belongs here, not in the Debug Overlay's aggregation. */
  readonly gpuTextures: number;
}

export interface RawFrameStats {
  fps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  gpuTextures: number;
}

export function createPerformanceSnapshot(input: RawFrameStats): PerformanceSnapshot {
  return Object.freeze({
    timestamp: performance.now(),
    fps: input.fps,
    frameTimeMs: input.fps > 0 ? 1000 / input.fps : 0,
    drawCalls: input.drawCalls,
    triangles: input.triangles,
    geometries: input.geometries,
    gpuTextures: input.gpuTextures,
  });
}

const latestSnapshot = createBridgeStore<PerformanceSnapshot | null>(null);

export function recordPerformanceSnapshot(input: RawFrameStats): PerformanceSnapshot {
  const snapshot = createPerformanceSnapshot(input);
  latestSnapshot.setValue(snapshot);
  return snapshot;
}

export { latestSnapshot };
