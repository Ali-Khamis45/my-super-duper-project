import { describe, expect, it } from "vitest";

import { registerCameraPreset, resolveCameraPreset } from "./presets";

describe("camera preset registry", () => {
  it("resolves the registered hero preset", () => {
    const preset = resolveCameraPreset("hero");
    expect(preset.position).toEqual([0, 1.9, 4.4]);
    expect(preset.fov).toBe(30);
  });

  it("throws a clear, actionable error for an unregistered preset", () => {
    // "ingredient" — still deliberately unregistered as of Sprint 3.7 (see
    // this file's own doc comment); "product"/"checkout"/"exploded" were
    // this exact kind of typed-but-unregistered placeholder until Sprint
    // 3.7 gave each one a real config.
    expect(() => resolveCameraPreset("ingredient")).toThrow(/not registered yet/);
  });

  it("registerCameraPreset makes a new preset resolvable without touching existing ones", () => {
    registerCameraPreset("ingredient", { position: [1, 2, 3], fov: 40, lookAt: [0, 0, 0] });
    expect(resolveCameraPreset("ingredient")).toEqual({ position: [1, 2, 3], fov: 40, lookAt: [0, 0, 0] });
    // The existing "hero" preset is unaffected by registering a new one.
    expect(resolveCameraPreset("hero").fov).toBe(30);
  });
});
