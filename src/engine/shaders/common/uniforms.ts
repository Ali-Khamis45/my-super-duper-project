import * as THREE from "three";

import type { QualityTier } from "@/engine/performance/types";

/**
 * Uniform Manager / Shared Uniform Block. "Each uniform has exactly one
 * owner. Managers publish uniform values. Shaders consume them. Shaders
 * never mutate shared uniforms. Duplicate uniform sources are forbidden."
 * — this module is the single owner of every genuinely scene-wide uniform;
 * every shader material references these same objects (never clones them),
 * so a publish here updates every consumer simultaneously with one write.
 *
 * `uTime` is deliberately NOT here — see `createPerInstanceUniforms` below.
 * A shared, globally-synchronized clock would make every steam wisp (and
 * any future repeated shader instance) pulse in lockstep, which reads as
 * mechanical rather than organic — the exact failure mode
 * docs/18_ENGINEERING_CONTRACTS.md's Shader Contracts already warns against.
 *
 * `uStorytellingProgress`/`uPhysicsIntensity` are typed and present but have
 * no publisher yet — Milestone 6 and Milestone 3 respectively. Camera
 * position is deliberately not published as a separate uniform: Three's
 * built-in `cameraPosition` GLSL variable already covers the common
 * view-dependent case (fresnel, rim lighting) without a second, redundant
 * source of the same data — publishing one anyway would itself violate
 * "duplicate uniform sources are forbidden."
 */
export const sharedUniforms = {
  uResolution: { value: new THREE.Vector2(1, 1) },
  uQualityTier: { value: 3 }, // 0=minimal, 1=low, 2=medium, 3=high, 4=ultra — numeric for cheap GLSL branching, avoids string comparison in-shader
  uThemeMode: { value: 0 }, // 0=light, 1=dark
  uColorTheme: { value: new THREE.Color(1, 1, 1) }, // the active theme's brand accent color, not the scene background
  uLightingIntensity: { value: 1 }, // the active lighting preset's directional intensity
  uIsInteracting: { value: 0 }, // 0/1 — is the hero cup currently being dragged
  uStorytellingProgress: { value: 0 }, // Milestone 6 — typed, unpublished
  uPhysicsIntensity: { value: 0 }, // Milestone 3 — typed, unpublished
};

const TIER_TO_NUMBER: Record<QualityTier, number> = { minimal: 0, low: 1, medium: 2, high: 3, ultra: 4 };

// Publishers — exactly one call site per value (docs/reviews/sprint-2.4-review.md
// names every real call site), matching "each uniform has exactly one owner."
export function publishResolution(width: number, height: number): void {
  sharedUniforms.uResolution.value.set(width, height);
}

export function publishQualityTier(tier: QualityTier): void {
  sharedUniforms.uQualityTier.value = TIER_TO_NUMBER[tier];
}

export function publishTheme(mode: "light" | "dark", accentColor: THREE.Color): void {
  sharedUniforms.uThemeMode.value = mode === "dark" ? 1 : 0;
  sharedUniforms.uColorTheme.value.copy(accentColor);
}

export function publishLightingIntensity(intensity: number): void {
  sharedUniforms.uLightingIntensity.value = intensity;
}

export function publishInteractionState(isInteracting: boolean): void {
  sharedUniforms.uIsInteracting.value = isInteracting ? 1 : 0;
}

/**
 * Sprint 3.7's first real publisher — `features/storytelling/`'s scroll
 * driver (which owns chapter-boundary knowledge — `data/chapters.ts` is
 * its data, not duplicated here) is the single call site. Not the raw
 * global page fraction: the driver publishes 0 whenever scroll is outside
 * whichever chapter currently drives a shader-reactive moment (so
 * every non-story route, which never calls this at all, stays at the
 * initial value 0 — a neutral baseline, not "zero density"), and that
 * chapter's own local 0-1 progress while inside it. Shaders that opt in
 * (steam/coffee/foam) reference `sharedUniforms.uStorytellingProgress` by
 * the same by-reference convention every other shared uniform follows,
 * and treat 0 as "no storytelling effect active" — never as "fully faded
 * out" — so a shader's own baseline look is what every non-story route
 * (and the story route outside the driving chapter) already sees today.
 */
export function publishStorytellingProgress(progress: number): void {
  sharedUniforms.uStorytellingProgress.value = progress;
}

/** Per-instance uniforms — a fresh object per shader material instance, never shared, so repeated instances stay independent. */
export function createPerInstanceUniforms() {
  return {
    uTime: { value: 0 },
  };
}
