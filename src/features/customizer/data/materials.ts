import type { MaterialPresetId } from "@/stores/customizer-store";

export interface MaterialPreset {
  id: MaterialPresetId;
  label: string;
  /** Merged into the cup/sleeve/lid parts' `materialOverrides` alongside whichever color is selected — a finish, not a color. Values chosen relative to `engine/materials/presets.ts`'s existing `SURFACE_PRESETS.ceramic` baseline (roughness 0.12, clearcoat 1 — "glossy" below matches that default look, not a random new number). */
  roughness: number;
  metalness: number;
  clearcoat: number;
}

export const MATERIAL_PRESETS: readonly MaterialPreset[] = [
  { id: "glossy", label: "Glossy", roughness: 0.12, metalness: 0, clearcoat: 1 },
  { id: "matte", label: "Matte", roughness: 0.7, metalness: 0, clearcoat: 0.1 },
  { id: "metallic", label: "Metallic", roughness: 0.25, metalness: 0.85, clearcoat: 0.3 },
];

export function resolveMaterialPreset(id: MaterialPresetId): MaterialPreset {
  const preset = MATERIAL_PRESETS.find((entry) => entry.id === id);
  if (!preset) throw new Error(`Unknown material preset: "${id}"`);
  return preset;
}
