import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { appEvents } from "@/engine/events";

import { initMemoryPressureDetection, resetMemoryPressureState } from "./memoryPressure";

describe("initMemoryPressureDetection", () => {
  let teardown: () => void;

  beforeEach(() => {
    resetMemoryPressureState();
    teardown = initMemoryPressureDetection();
  });

  afterEach(() => {
    teardown();
  });

  it("does not report pressure from evictions alone, without degraded performance", () => {
    const listener = vi.fn();
    const unsub = appEvents.on("memory:pressure", listener);

    for (let i = 0; i < 10; i++) appEvents.emit({ name: "resource:evicted", key: `k${i}` });

    expect(listener).not.toHaveBeenCalled();
    unsub();
  });

  it("does not report pressure from degraded performance alone, without a high eviction rate", () => {
    const listener = vi.fn();
    const unsub = appEvents.on("memory:pressure", listener);

    appEvents.emit({ name: "performance:degraded", fps: 20 });
    appEvents.emit({ name: "resource:evicted", key: "only-one" });

    expect(listener).not.toHaveBeenCalled();
    unsub();
  });

  it("reports pressure once both signals cross their thresholds together", () => {
    const listener = vi.fn();
    const unsub = appEvents.on("memory:pressure", listener);

    appEvents.emit({ name: "performance:degraded", fps: 20 });
    for (let i = 0; i < 5; i++) appEvents.emit({ name: "resource:evicted", key: `k${i}` });

    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
  });

  it("does not report a second time until performance recovers and degrades again", () => {
    const listener = vi.fn();
    const unsub = appEvents.on("memory:pressure", listener);

    appEvents.emit({ name: "performance:degraded", fps: 20 });
    for (let i = 0; i < 5; i++) appEvents.emit({ name: "resource:evicted", key: `k${i}` });
    for (let i = 5; i < 10; i++) appEvents.emit({ name: "resource:evicted", key: `k${i}` });

    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
  });

  it("resets and can report again after a recover/degrade cycle", () => {
    const listener = vi.fn();
    const unsub = appEvents.on("memory:pressure", listener);

    appEvents.emit({ name: "performance:degraded", fps: 20 });
    for (let i = 0; i < 5; i++) appEvents.emit({ name: "resource:evicted", key: `a${i}` });
    expect(listener).toHaveBeenCalledTimes(1);

    appEvents.emit({ name: "performance:recovered", fps: 60 });
    appEvents.emit({ name: "performance:degraded", fps: 20 });
    for (let i = 0; i < 5; i++) appEvents.emit({ name: "resource:evicted", key: `b${i}` });

    expect(listener).toHaveBeenCalledTimes(2);
    unsub();
  });

  it("the returned teardown function unsubscribes all listeners", () => {
    const listener = vi.fn();
    const unsub = appEvents.on("memory:pressure", listener);

    teardown();
    appEvents.emit({ name: "performance:degraded", fps: 20 });
    for (let i = 0; i < 5; i++) appEvents.emit({ name: "resource:evicted", key: `k${i}` });

    expect(listener).not.toHaveBeenCalled();
    unsub();
  });
});
