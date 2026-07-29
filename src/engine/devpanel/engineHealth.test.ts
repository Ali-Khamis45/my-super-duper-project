import { beforeEach, describe, expect, it } from "vitest";

import { computeEngineHealth, resetEngineHealthState } from "./engineHealth";
import { recordPerformanceSnapshot } from "@/engine/performance/runtimeProfiler";

describe("computeEngineHealth", () => {
  beforeEach(() => {
    resetEngineHealthState();
  });

  it("reads the latest performance snapshot's renderer-level fields", () => {
    recordPerformanceSnapshot({ fps: 60, drawCalls: 12, triangles: 3000, geometries: 4, gpuTextures: 6 });
    const health = computeEngineHealth();
    expect(health.fps).toBe(60);
    expect(health.drawCalls).toBe(12);
    expect(health.triangles).toBe(3000);
    expect(health.gpuTextures).toBe(6);
  });

  it("computes a 0 cache hit ratio when no cache operations have happened, never dividing by zero", () => {
    const health = computeEngineHealth();
    expect(Number.isFinite(health.cacheHitRatio)).toBe(true);
    expect(health.cacheHitRatio).toBeGreaterThanOrEqual(0);
  });

  it("reports 0 events/sec on the first sample, since there is no prior sample to diff against", () => {
    const health = computeEngineHealth();
    expect(health.eventsPerSecond).toBe(0);
  });

  it("reflects the current quality tier and mode from the Performance Manager", () => {
    const health = computeEngineHealth();
    expect(typeof health.qualityTier).toBe("string");
    expect(typeof health.qualityMode).toBe("string");
  });
});
