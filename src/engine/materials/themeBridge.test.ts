import { describe, expect, it, vi } from "vitest";

import { appEvents } from "@/engine/events";

import { notifyThemeMaterialsUpdated, resolveEnvMapIntensity, resolveMaterialContext } from "./themeBridge";

describe("resolveEnvMapIntensity", () => {
  it("boosts envMapIntensity for the dimmer 'night' preset relative to 'studio'", () => {
    const studio = resolveEnvMapIntensity("studio", 1.0);
    const night = resolveEnvMapIntensity("night", 1.0);
    expect(night).toBeGreaterThan(studio);
  });

  it("scales the base intensity, not a flat replacement", () => {
    expect(resolveEnvMapIntensity("studio", 2.0)).toBe(2.0);
    expect(resolveEnvMapIntensity("night", 2.0)).toBeCloseTo(2.5, 5);
  });
});

describe("resolveMaterialContext", () => {
  it("bundles theme and the current quality tier", () => {
    const context = resolveMaterialContext("dark");
    expect(context.theme).toBe("dark");
    expect(context.qualityTier).toBe("high"); // default tier, per docs/03_3D_ENGINE.md's Performance foundation
  });
});

describe("notifyThemeMaterialsUpdated", () => {
  it("emits theme:materials-updated once per distinct theme change, not on a repeated call with the same theme", () => {
    const listener = vi.fn();
    const unsub = appEvents.on("theme:materials-updated", listener);

    notifyThemeMaterialsUpdated("light");
    notifyThemeMaterialsUpdated("dark");
    notifyThemeMaterialsUpdated("dark");

    expect(listener).toHaveBeenCalledTimes(2);
    unsub();
  });
});
