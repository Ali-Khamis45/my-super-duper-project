/**
 * Lighting (ambient/directional/bloom), independent of Environment (HDRI) —
 * see the sibling `engine/environment/presets.ts` and docs/03_3D_ENGINE.md
 * for the split rationale (day/night varying independently of UI theme).
 */
export type LightingPresetName = "studio" | "night";

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
