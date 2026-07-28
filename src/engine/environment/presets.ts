/**
 * Environment (HDRI source + intensity), independent of Lighting
 * (ambient/directional/bloom) — split from the old combined `LightingTheme`
 * so day/night (Milestone 2 Sprint 2.6) can vary independently of light/dark
 * UI theme. See docs/03_3D_ENGINE.md.
 */
export type EnvironmentPresetName = "studio" | "night";

export interface EnvironmentPresetDefinition {
  source: { type: "drei-preset"; name: "studio" | "night" } | { type: "file"; path: string };
  intensity: number;
}

const registry = new Map<EnvironmentPresetName, EnvironmentPresetDefinition>([
  ["studio", { source: { type: "drei-preset", name: "studio" }, intensity: 0.75 }],
  ["night", { source: { type: "drei-preset", name: "night" }, intensity: 0.45 }],
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
