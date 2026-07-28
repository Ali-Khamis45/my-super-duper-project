import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  createPerInstanceUniforms,
  publishInteractionState,
  publishLightingIntensity,
  publishQualityTier,
  publishResolution,
  publishTheme,
  sharedUniforms,
} from "./uniforms";

describe("shared uniform block", () => {
  it("publishResolution mutates the shared vector in place, not a new object", () => {
    const ref = sharedUniforms.uResolution.value;
    publishResolution(800, 600);
    expect(sharedUniforms.uResolution.value).toBe(ref); // same object identity
    expect(ref.x).toBe(800);
    expect(ref.y).toBe(600);
  });

  it("publishQualityTier maps tier names to the numeric GLSL-friendly encoding, minimal -> ultra ascending", () => {
    publishQualityTier("minimal");
    expect(sharedUniforms.uQualityTier.value).toBe(0);
    publishQualityTier("low");
    expect(sharedUniforms.uQualityTier.value).toBe(1);
    publishQualityTier("medium");
    expect(sharedUniforms.uQualityTier.value).toBe(2);
    publishQualityTier("high");
    expect(sharedUniforms.uQualityTier.value).toBe(3);
    publishQualityTier("ultra");
    expect(sharedUniforms.uQualityTier.value).toBe(4);
  });

  it("publishTheme sets both mode and color from one call, never two independent writers", () => {
    const accent = new THREE.Color(1, 0, 0);
    publishTheme("dark", accent);
    expect(sharedUniforms.uThemeMode.value).toBe(1);
    expect(sharedUniforms.uColorTheme.value.getHex()).toBe(accent.getHex());

    publishTheme("light", new THREE.Color(0, 1, 0));
    expect(sharedUniforms.uThemeMode.value).toBe(0);
  });

  it("publishLightingIntensity and publishInteractionState update their own single value", () => {
    publishLightingIntensity(0.7);
    expect(sharedUniforms.uLightingIntensity.value).toBe(0.7);

    publishInteractionState(true);
    expect(sharedUniforms.uIsInteracting.value).toBe(1);
    publishInteractionState(false);
    expect(sharedUniforms.uIsInteracting.value).toBe(0);
  });
});

describe("createPerInstanceUniforms", () => {
  it("returns a fresh, independent object every call — never shared across instances", () => {
    const a = createPerInstanceUniforms();
    const b = createPerInstanceUniforms();
    expect(a).not.toBe(b);
    expect(a.uTime).not.toBe(b.uTime);
    a.uTime.value = 5;
    expect(b.uTime.value).toBe(0);
  });
});
