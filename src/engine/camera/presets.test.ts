import { describe, expect, it } from "vitest";

import { registerCameraPreset, resolveCameraPreset } from "./presets";

describe("camera preset registry", () => {
  it("resolves the registered hero preset", () => {
    const preset = resolveCameraPreset("hero");
    expect(preset.position).toEqual([0, 1.9, 4.4]);
    expect(preset.fov).toBe(30);
  });

  it("throws a clear, actionable error for an unregistered preset", () => {
    expect(() => resolveCameraPreset("product")).toThrow(/not registered yet/);
  });

  it("registerCameraPreset makes a new preset resolvable without touching existing ones", () => {
    registerCameraPreset("product", { position: [1, 2, 3], fov: 40, lookAt: [0, 0, 0] });
    expect(resolveCameraPreset("product")).toEqual({ position: [1, 2, 3], fov: 40, lookAt: [0, 0, 0] });
    // The existing "hero" preset is unaffected by registering a new one.
    expect(resolveCameraPreset("hero").fov).toBe(30);
  });
});
