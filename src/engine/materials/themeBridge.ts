import { appEvents } from "@/engine/events";
import type { LightingPresetName } from "@/engine/lighting/presets";
import { resolveLightingPreset } from "@/engine/lighting/presets";
import { performanceManager } from "@/engine/performance";
import type { ThemeName } from "@/engine/theme/ThemeEngine";

import type { MaterialContext } from "./types";

/**
 * Theme Bridge: materials react to theme (and quality tier) *without*
 * recreating unnecessary GPU resources — the cache in `cache.ts` already
 * ensures a previously-compiled combination is reused, not recompiled, on
 * a revisit; this module is the other half, calibrating *what* a material
 * should look like for the active context.
 *
 * `resolveEnvMapIntensity` is this sprint's real consumer *and* its
 * Creative Budget item: the studio (light) and night (dark) lighting
 * presets have meaningfully different ambient/directional intensity
 * (docs/03_3D_ENGINE.md's Environment/Lighting split), so a flat, hardcoded
 * `envMapIntensity` either under-reacts against a bright environment or
 * over-blows highlights against a dim one. Night's lower light intensity
 * needs a *higher* relative envMapIntensity to keep ceramic/liquid
 * reflections legible, not lower — the inverse of the scene's own light
 * level, not a naive same-direction scale.
 */
export function resolveEnvMapIntensity(lightingPresetName: LightingPresetName, baseIntensity: number): number {
  const preset = resolveLightingPreset(lightingPresetName);
  const calibration = preset.directional.intensity < 1 ? 1.25 : 1;
  return baseIntensity * calibration;
}

export function resolveMaterialContext(theme: ThemeName): MaterialContext {
  return { theme, qualityTier: performanceManager.tier.getValue() };
}

let lastNotifiedTheme: ThemeName | null = null;

/** Called once per real theme change (not per render) — the batch signal a future Debug Overlay or Analytics consumer subscribes to instead of every individual material update. */
export function notifyThemeMaterialsUpdated(theme: ThemeName): void {
  if (lastNotifiedTheme === theme) return;
  lastNotifiedTheme = theme;
  appEvents.emit({ name: "theme:materials-updated", to: theme });
}
