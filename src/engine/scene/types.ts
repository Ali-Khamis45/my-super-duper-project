import type { CameraPresetName } from "@/engine/camera/presets";
import type { EffectConfig } from "@/engine/effects/EffectsStack";
import type { EnvironmentPresetName } from "@/engine/environment/presets";
import type { LightingPresetName } from "@/engine/lighting/presets";

/**
 * The contract every route's scene composition root satisfies — deliberately
 * NOT a persistent, cross-route Scene Manager (see docs/adr/0006-scene-management-strategy.md,
 * reaffirmed by docs/15_ARCHITECTURE_FREEZE.md). Each route keeps its own
 * `<Canvas>` behind its own `ssr:false` boundary; this type exists so a
 * scene root's shape is checked structurally, not just by convention.
 */
export interface SceneCompositionRoot {
  readonly route: string;
  camera: CameraPresetName;
  environment: EnvironmentPresetName;
  lighting: LightingPresetName;
  effects: EffectConfig[];
}
