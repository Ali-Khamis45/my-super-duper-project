import { describe, expect, it } from "vitest";

import { createPerformanceSnapshot, latestSnapshot, recordPerformanceSnapshot } from "./runtimeProfiler";

describe("createPerformanceSnapshot", () => {
  it("derives frameTimeMs from fps", () => {
    const snapshot = createPerformanceSnapshot({ fps: 60, drawCalls: 10, triangles: 1000, geometries: 5 });
    expect(snapshot.frameTimeMs).toBeCloseTo(16.667, 2);
  });

  it("handles a zero-fps reading without dividing by zero", () => {
    const snapshot = createPerformanceSnapshot({ fps: 0, drawCalls: 0, triangles: 0, geometries: 0 });
    expect(snapshot.frameTimeMs).toBe(0);
  });

  it("returns a frozen object — a consumer cannot mutate a measurement in place", () => {
    const snapshot = createPerformanceSnapshot({ fps: 60, drawCalls: 10, triangles: 1000, geometries: 5 });
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(() => {
      // @ts-expect-error -- intentionally violating the readonly contract to prove it's enforced at runtime too
      snapshot.fps = 999;
    }).toThrow();
  });
});

describe("recordPerformanceSnapshot", () => {
  it("is the sole writer of latestSnapshot — a recorded snapshot is immediately readable back", () => {
    const recorded = recordPerformanceSnapshot({ fps: 45, drawCalls: 20, triangles: 2000, geometries: 8 });
    expect(latestSnapshot.getValue()).toBe(recorded);
  });

  it("each call produces a new, distinct snapshot object, never mutating the previous one", () => {
    const first = recordPerformanceSnapshot({ fps: 60, drawCalls: 1, triangles: 1, geometries: 1 });
    const second = recordPerformanceSnapshot({ fps: 30, drawCalls: 2, triangles: 2, geometries: 2 });
    expect(first).not.toBe(second);
    expect(first.fps).toBe(60); // the earlier snapshot is untouched by the later recording
  });
});
