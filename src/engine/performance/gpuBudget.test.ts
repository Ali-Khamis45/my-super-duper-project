import { beforeEach, describe, expect, it, vi } from "vitest";

import { appEvents } from "@/engine/events";

import { checkGpuBudget, resetGpuBudgetState } from "./gpuBudget";
import { createPerformanceSnapshot } from "./runtimeProfiler";

describe("checkGpuBudget", () => {
  beforeEach(() => {
    resetGpuBudgetState();
  });

  it("does not warn when within budget", () => {
    const listener = vi.fn();
    const unsub = appEvents.on("gpu:budget-warning", listener);
    checkGpuBudget(createPerformanceSnapshot({ fps: 60, drawCalls: 10, triangles: 1000, geometries: 5 }));
    expect(listener).not.toHaveBeenCalled();
    unsub();
  });

  it("warns once when draw calls exceed the budget", () => {
    const listener = vi.fn();
    const unsub = appEvents.on("gpu:budget-warning", listener);
    checkGpuBudget(createPerformanceSnapshot({ fps: 60, drawCalls: 150, triangles: 1000, geometries: 5 }));
    expect(listener).toHaveBeenCalledWith({ name: "gpu:budget-warning", metric: "drawCalls", value: 150, budget: 100 });
    unsub();
  });

  it("does not re-warn on every sample while draw calls stay over budget", () => {
    const listener = vi.fn();
    const unsub = appEvents.on("gpu:budget-warning", listener);
    checkGpuBudget(createPerformanceSnapshot({ fps: 60, drawCalls: 150, triangles: 1000, geometries: 5 }));
    checkGpuBudget(createPerformanceSnapshot({ fps: 60, drawCalls: 160, triangles: 1000, geometries: 5 }));
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
  });

  it("warns again after dropping back under budget and crossing over a second time", () => {
    const listener = vi.fn();
    const unsub = appEvents.on("gpu:budget-warning", listener);
    checkGpuBudget(createPerformanceSnapshot({ fps: 60, drawCalls: 150, triangles: 1000, geometries: 5 }));
    checkGpuBudget(createPerformanceSnapshot({ fps: 60, drawCalls: 50, triangles: 1000, geometries: 5 }));
    checkGpuBudget(createPerformanceSnapshot({ fps: 60, drawCalls: 150, triangles: 1000, geometries: 5 }));
    expect(listener).toHaveBeenCalledTimes(2);
    unsub();
  });

  it("warns independently for triangles over budget", () => {
    const listener = vi.fn();
    const unsub = appEvents.on("gpu:budget-warning", listener);
    checkGpuBudget(createPerformanceSnapshot({ fps: 60, drawCalls: 10, triangles: 60_000, geometries: 5 }));
    expect(listener).toHaveBeenCalledWith({ name: "gpu:budget-warning", metric: "triangles", value: 60_000, budget: 55_000 });
    unsub();
  });
});
