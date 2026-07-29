/**
 * Lighting (ambient/directional/bloom), independent of Environment (HDRI) —
 * see the sibling `engine/environment/presets.ts` and docs/03_3D_ENGINE.md
 * for the split rationale (day/night varying independently of UI theme).
 */
/** "golden-hour"/"cafe-ambience" — Sprint 3.7's cinematic storytelling moods, additive (see `engine/environment/presets.ts`'s matching widen for the paired rationale). */
export type LightingPresetName = "studio" | "night" | "golden-hour" | "cafe-ambience";

export interface LightingPresetDefinition {
  ambient: { intensity: number };
  directional: { intensity: number; position: [number, number, number] };
  bloom: { intensity: number; threshold: number };
}

const registry = new Map<LightingPresetName, LightingPresetDefinition>([
  [
    "studio",
    {
      ambient: { intensity: 0.3 },
      directional: { intensity: 1.1, position: [2.5, 4, 3] },
      bloom: { intensity: 0.25, threshold: 0.9 },
    },
  ],
  [
    "night",
    {
      ambient: { intensity: 0.2 },
      directional: { intensity: 0.8, position: [2.5, 4, 3] },
      bloom: { intensity: 0.6, threshold: 0.75 },
    },
  ],
  [
    "golden-hour",
    // Low, warm, low-angle key light — the directional position sits lower
    // and further to the side than "studio"'s overhead-ish angle, the same
    // real-world cue a low sun gives.
    {
      ambient: { intensity: 0.35 },
      directional: { intensity: 1.3, position: [4, 1.5, 2] },
      bloom: { intensity: 0.4, threshold: 0.8 },
    },
  ],
  [
    "cafe-ambience",
    // Warm but dimmer and softer than golden-hour — an indoor, enclosed
    // mood, not an outdoor one; less bloom than night (night's drama comes
    // from contrast against near-darkness, cafe-ambience isn't dark).
    {
      ambient: { intensity: 0.4 },
      directional: { intensity: 0.7, position: [1.5, 2.5, 2.5] },
      bloom: { intensity: 0.3, threshold: 0.85 },
    },
  ],
]);

/** Sanctioned extension path (docs/17_ZERO_REWRITE_POLICY.md) — e.g. a future promotional lighting mood. */
export function registerLightingPreset(name: LightingPresetName, definition: LightingPresetDefinition): void {
  registry.set(name, definition);
}

export function resolveLightingPreset(name: LightingPresetName): LightingPresetDefinition {
  const preset = registry.get(name);
  if (!preset) {
    throw new Error(`Lighting preset "${name}" is not registered.`);
  }
  return preset;
}
