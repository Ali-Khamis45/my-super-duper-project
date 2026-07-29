/**
 * Environment (HDRI source + intensity), independent of Lighting
 * (ambient/directional/bloom) — split from the old combined `LightingTheme`
 * so day/night (Milestone 2 Sprint 2.6) can vary independently of light/dark
 * UI theme. See docs/03_3D_ENGINE.md.
 */
/**
 * "golden-hour"/"cafe-ambience" — Sprint 3.7's cinematic storytelling
 * moods, additive per docs/17_ZERO_REWRITE_POLICY.md (a union widen, same
 * category as Sprint 2.5's `QualityTier` 3->5 extension). "finale" reuses
 * the existing "night" preset directly (see `features/storytelling/data/
 * chapters.ts`) rather than adding a redundant near-duplicate.
 */
export type EnvironmentPresetName = "studio" | "night" | "golden-hour" | "cafe-ambience";

export interface EnvironmentPresetDefinition {
  source: { type: "drei-preset"; name: "studio" | "night" | "sunset" | "lobby" } | { type: "file"; path: string };
  intensity: number;
}

const registry = new Map<EnvironmentPresetName, EnvironmentPresetDefinition>([
  ["studio", { source: { type: "drei-preset", name: "studio" }, intensity: 0.75 }],
  ["night", { source: { type: "drei-preset", name: "night" }, intensity: 0.45 }],
  // "sunset" is a real drei/three `Environment` preset — a literal warm,
  // low-angle HDRI, not a renamed studio/night.
  ["golden-hour", { source: { type: "drei-preset", name: "sunset" }, intensity: 0.65 }],
  // "lobby" — a warm, enclosed-space HDRI, the closest real drei preset to
  // an indoor café mood without sourcing a custom HDR file this sprint.
  ["cafe-ambience", { source: { type: "drei-preset", name: "lobby" }, intensity: 0.55 }],
]);

/** Sanctioned extension path (docs/17_ZERO_REWRITE_POLICY.md) — e.g. a future self-hosted HDR mood. */
export function registerEnvironmentPreset(name: EnvironmentPresetName, definition: EnvironmentPresetDefinition): void {
  registry.set(name, definition);
}

export function resolveEnvironmentPreset(name: EnvironmentPresetName): EnvironmentPresetDefinition {
  const preset = registry.get(name);
  if (!preset) {
    throw new Error(`Environment preset "${name}" is not registered.`);
  }
  return preset;
}
