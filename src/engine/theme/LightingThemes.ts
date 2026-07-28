import type { EnvironmentPresetName } from "@/engine/environment/presets";
import type { LightingPresetName } from "@/engine/lighting/presets";

import type { ThemeName } from "./ThemeEngine";

export interface ThemePresetPair {
  environment: EnvironmentPresetName;
  lighting: LightingPresetName;
}

/**
 * Theme -> {environment, lighting} preset pair. Reduced from the old
 * combined `LightingTheme` map now that Environment and Lighting are
 * independent registries (docs/03_3D_ENGINE.md) — light/dark UI theme is
 * one *caller* of those registries selecting a default pairing, not the
 * only axis that can. See ADR-0003. Day/night auto-mode (independent of UI
 * theme) arrives in Sprint 2.6.
 */
export const themeToPresetMap: Record<ThemeName, ThemePresetPair> = {
  light: { environment: "studio", lighting: "studio" },
  dark: { environment: "night", lighting: "night" },
};
