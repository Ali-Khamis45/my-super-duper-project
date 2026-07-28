import { beforeEach, describe, expect, it, vi } from "vitest";

import { appEvents } from "@/engine/events";

import { evaluateAdaptiveQuality } from "./adaptiveQuality";
import { performanceManager } from "./index";

function resetHysteresis() {
  // A mid-range FPS (between the downgrade and upgrade thresholds) resets
  // both consecutive-sample counters via the public API — no reaching into
  // module-private state from the test.
  evaluateAdaptiveQuality(50);
}

describe("evaluateAdaptiveQuality", () => {
  beforeEach(() => {
    performanceManager.tier.setValue("high");
    performanceManager.mode.setValue("automatic");
    resetHysteresis();
  });

  it("does not step down before 3 consecutive low-FPS samples", () => {
    evaluateAdaptiveQuality(30);
    evaluateAdaptiveQuality(30);
    expect(performanceManager.tier.getValue()).toBe("high");
  });

  it("steps down exactly one tier after 3 consecutive low-FPS samples", () => {
    evaluateAdaptiveQuality(30);
    evaluateAdaptiveQuality(30);
    evaluateAdaptiveQuality(30);
    expect(performanceManager.tier.getValue()).toBe("medium");
  });

  it("never steps down past the lowest tier (minimal)", () => {
    performanceManager.tier.setValue("minimal");
    resetHysteresis();
    evaluateAdaptiveQuality(20);
    evaluateAdaptiveQuality(20);
    evaluateAdaptiveQuality(20);
    expect(performanceManager.tier.getValue()).toBe("minimal");
  });

  it("does not thrash — a single step down consumes the streak, requiring 3 more low samples for a second step", () => {
    evaluateAdaptiveQuality(30);
    evaluateAdaptiveQuality(30);
    evaluateAdaptiveQuality(30);
    expect(performanceManager.tier.getValue()).toBe("medium");
    evaluateAdaptiveQuality(30);
    evaluateAdaptiveQuality(30);
    expect(performanceManager.tier.getValue()).toBe("medium"); // not yet a second step
    evaluateAdaptiveQuality(30);
    expect(performanceManager.tier.getValue()).toBe("low");
  });

  it("requires far more sustained good performance to step up than to step down (asymmetric hysteresis)", () => {
    performanceManager.tier.setValue("medium");
    resetHysteresis();

    for (let i = 0; i < 9; i++) evaluateAdaptiveQuality(60);
    expect(performanceManager.tier.getValue()).toBe("medium"); // 9 samples still isn't enough

    evaluateAdaptiveQuality(60); // the 10th sample crosses the threshold
    expect(performanceManager.tier.getValue()).toBe("high");
  });

  it("never steps up past the highest tier (ultra)", () => {
    performanceManager.tier.setValue("ultra");
    resetHysteresis();
    for (let i = 0; i < 10; i++) evaluateAdaptiveQuality(60);
    expect(performanceManager.tier.getValue()).toBe("ultra");
  });

  it("a borderline FPS reading (between thresholds) resets both streaks rather than counting toward either", () => {
    evaluateAdaptiveQuality(30);
    evaluateAdaptiveQuality(30);
    evaluateAdaptiveQuality(50); // borderline — resets the low-streak
    evaluateAdaptiveQuality(30);
    evaluateAdaptiveQuality(30);
    expect(performanceManager.tier.getValue()).toBe("high"); // never reached 3 consecutive
  });

  it("does nothing in manual mode, regardless of how bad the FPS reading is", () => {
    performanceManager.mode.setValue("manual");
    evaluateAdaptiveQuality(10);
    evaluateAdaptiveQuality(10);
    evaluateAdaptiveQuality(10);
    evaluateAdaptiveQuality(10);
    expect(performanceManager.tier.getValue()).toBe("high");
  });

  it("emits performance:tier-changed and quality:auto-changed with correct tier/previous on a real step", () => {
    const tierChanged = vi.fn();
    const autoChanged = vi.fn();
    const unsub1 = appEvents.on("performance:tier-changed", tierChanged);
    const unsub2 = appEvents.on("quality:auto-changed", autoChanged);

    evaluateAdaptiveQuality(30);
    evaluateAdaptiveQuality(30);
    evaluateAdaptiveQuality(30);

    expect(tierChanged).toHaveBeenCalledWith({ name: "performance:tier-changed", tier: "medium", previous: "high" });
    expect(autoChanged).toHaveBeenCalledWith({ name: "quality:auto-changed", tier: "medium", previous: "high" });
    unsub1();
    unsub2();
  });

  it("emits performance:degraded once at the start of a low-FPS streak, not on every sample", () => {
    const listener = vi.fn();
    const unsub = appEvents.on("performance:degraded", listener);

    evaluateAdaptiveQuality(30);
    evaluateAdaptiveQuality(30);
    evaluateAdaptiveQuality(30);

    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
  });

  it("emits performance:recovered when a real step-up happens", () => {
    performanceManager.tier.setValue("medium");
    resetHysteresis();
    const listener = vi.fn();
    const unsub = appEvents.on("performance:recovered", listener);

    for (let i = 0; i < 10; i++) evaluateAdaptiveQuality(60);

    expect(listener).toHaveBeenCalledWith({ name: "performance:recovered", fps: 60 });
    unsub();
  });
});
