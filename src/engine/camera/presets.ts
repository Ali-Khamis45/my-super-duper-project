/**
 * Every camera state the full 24-phase roadmap will need, typed now so
 * registering a new one later is additive. Only "hero" has a registered
 * config this milestone — see docs/08_MILESTONES.md for when the rest land.
 */
export type CameraPresetName = "hero" | "product" | "checkout" | "ai" | "ingredient" | "exploded";

export interface CameraPreset {
  position: [number, number, number];
  fov: number;
  lookAt: [number, number, number];
}

const registry = new Map<CameraPresetName, CameraPreset>([
  [
    "hero",
    // The cup's vertical extent runs base(0) -> rim(1.58) -> floating lid top
    // (~1.95); lookAt targets that range's midpoint, not the base, so the
    // whole assembly (not just the lower body) sits in frame. Camera sits
    // further above lookAt than a level shot would, so the downward angle
    // peeks through the rim/lid gap at the coffee+foam — the sensory payoff
    // the hero copy explicitly promises ("Drag the cup. Watch the light
    // change.") shouldn't be hidden at the default angle.
    { position: [0, 1.9, 4.4], fov: 30, lookAt: [0, 0.85, 0] },
  ],
  [
    "ai",
    // Sprint 3.5 — the first real second preset `CameraRig`'s
    // preset-to-preset smooth interpolation (built Sprint 2.1, never
    // exercised live until now) actually switches to. A closer, slightly
    // lower "presented to you" framing versus `hero`'s wider establishing
    // shot — the Architecture Freeze's "3D reveal moment" for a completed
    // recommendation (docs/15_ARCHITECTURE_FREEZE.md, scenario 5).
    { position: [0, 1.35, 3.1], fov: 26, lookAt: [0, 0.95, 0] },
  ],
]);

/** Sanctioned extension path (docs/17_ZERO_REWRITE_POLICY.md) — a new preset is one call, zero changes elsewhere. */
export function registerCameraPreset(name: CameraPresetName, preset: CameraPreset): void {
  registry.set(name, preset);
}

export function resolveCameraPreset(name: CameraPresetName): CameraPreset {
  const preset = registry.get(name);
  if (!preset) {
    throw new Error(`Camera preset "${name}" is not registered yet — see docs/08_MILESTONES.md.`);
  }
  return preset;
}
