import type { CameraPresetName } from "@/engine/camera/presets";
import type { LightingPresetName } from "@/engine/lighting/presets";
import type { ThemeName } from "@/engine/theme/ThemeEngine";

/**
 * Frozen in docs/19_EVENT_CATALOG.md. Every event a manager or feature will
 * ever emit through EventBus is named and typed here first. Sprint 2.1 only
 * *emits* `camera:transition-start`/`-complete` and
 * `webgl:context-lost`/`-restored` for real — the rest of the union exists
 * as a type with zero runtime footprint, matched to the manager/feature
 * that will emit it once that milestone arrives (see docs/26_API_STABILITY.md).
 */
export type AppEvent =
  | { name: "camera:transition-start"; from: CameraPresetName | null; to: CameraPresetName }
  | { name: "camera:transition-complete"; preset: CameraPresetName }
  | { name: "theme:changed"; to: ThemeName }
  | { name: "lighting:changed"; preset: LightingPresetName }
  | { name: "performance:tier-changed"; tier: "high" | "medium" | "low"; previous: "high" | "medium" | "low" }
  | { name: "webgl:context-lost" }
  | { name: "webgl:context-restored" }
  | { name: "interaction:started"; gesture: string; pointerKind: string }
  | { name: "interaction:ended"; gesture: string; durationMs: number }
  | { name: "cup:rotated"; degrees: number; method: "drag" | "touch" | "keyboard" }
  | { name: "ingredient:dropped"; ingredientId: string; targetSlot: string }
  | { name: "scene:ready"; route: string }
  | { name: "asset:loading"; key: string }
  | { name: "asset:loaded"; key: string; durationMs: number }
  | { name: "asset:load-failed"; key: string; reason: string }
  | { name: "asset:timeout"; key: string; elapsedMs: number }
  | { name: "asset:disposed"; key: string }
  | { name: "resource:evicted"; key: string }
  | { name: "material:created"; key: string }
  | { name: "material:updated"; key: string }
  | { name: "material:disposed"; key: string }
  | { name: "theme:materials-updated"; to: ThemeName }
  | { name: "shader:compiled"; shader: string }
  | { name: "shader:failed"; shader: string; error: string }
  | { name: "ai:recommendation-ready"; recommendationId: string }
  | { name: "checkout:started"; cartTotal: number }
  | { name: "checkout:completed"; orderId: string };

export type AppEventName = AppEvent["name"];
