/**
 * Every camera state the full 24-phase roadmap will need, typed now so
 * registering a new one later is additive. "origins"/"finale" are new,
 * Sprint 3.7-specific additions (no existing member fit those two
 * chapters); every other Sprint 3.7 chapter reuses an already-typed,
 * previously-unregistered member ("exploded", "product", "checkout") or an
 * already-registered one ("hero", "ai") — see
 * `features/storytelling/data/chapters.ts`. "ingredient" remains
 * unregistered, still a documented future extension point.
 */
export type CameraPresetName = "hero" | "product" | "checkout" | "ai" | "ingredient" | "exploded" | "origins" | "finale";

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
  [
    "origins",
    // Sprint 3.7 — the story's opening establishing shot: wider and further
    // back than "hero" (a bigger fov, a more distant position), evoking a
    // scene being surveyed rather than a product being presented. Slightly
    // elevated look-down angle for the same "survey the scene" read.
    { position: [1.2, 2.6, 5.6], fov: 34, lookAt: [0, 0.7, 0] },
  ],
  [
    "exploded",
    // Sprint 3.7's first real registration of this long-typed-but-dormant
    // name (typed since Milestone 1). Pulled back and raised well beyond
    // any other preset — the Crafting chapter's parts float outward from
    // center, so the frame needs enough room to hold the whole spread
    // without any part leaving view. `lookAt` targets the assembly's
    // vertical middle, same reasoning as "hero"'s own lookAt comment.
    { position: [0, 2.6, 6.8], fov: 38, lookAt: [0, 1.0, 0] },
  ],
  [
    "product",
    // Sprint 3.7's first real registration. The Customization chapter's
    // "on display" framing — closer and more level/front-on than "hero"'s
    // downward-peeking angle, since this chapter is about the cup's
    // surface/finish, not the coffee inside it.
    { position: [0, 1.15, 3.6], fov: 28, lookAt: [0, 1.0, 0] },
  ],
  [
    "checkout",
    // Sprint 3.7's first real registration. Closer still, echoing "ai"'s
    // "presented to you" framing (both are a completed-recommendation-style
    // reveal) but slightly higher and more centered — Commerce is the
    // conversion moment, the cup should feel offered, not just observed.
    { position: [0, 1.5, 2.9], fov: 25, lookAt: [0, 0.95, 0] },
  ],
  [
    "finale",
    // Sprint 3.7 — deliberately close to "hero" (position/lookAt nearly
    // identical) but a narrower fov: the story ends by returning to
    // roughly where it began, the narrower frame reading as a deliberate,
    // slightly-tightened "closing shot" rather than an unmotivated new
    // angle — "every camera move has a purpose," including this one's
    // purpose being restraint.
    { position: [0, 1.9, 4.2], fov: 27, lookAt: [0, 0.85, 0] },
  ],
]);

/**
 * Sprint 3.9 — shared clamp range for `CameraRig`'s optional `zoomSource`
 * distance multiplier (1 = the preset's own authored distance). Lives here,
 * not inside `CameraRig.tsx` or a feature hook, so both the rig and any
 * zoom-control UI clamp against the exact same bounds instead of two
 * independently-guessed numbers drifting apart. `CAMERA_ZOOM_MIN` is close
 * enough to 1 that even the closest allowed zoom never pushes the camera
 * through the cup's own geometry at any registered preset's distance;
 * `CAMERA_ZOOM_MAX` stays inside every preset's frustum far enough out that
 * the contact shadow and environment reflections stay in frame.
 */
export const CAMERA_ZOOM_MIN = 0.65;
export const CAMERA_ZOOM_MAX = 1.7;

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
