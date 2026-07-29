import type { CameraPresetName } from "@/engine/camera/presets";
import type { LightingPresetName } from "@/engine/lighting/presets";
import type { QualityTier } from "@/engine/performance/types";
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
  | { name: "performance:tier-changed"; tier: QualityTier; previous: QualityTier }
  | { name: "quality:auto-changed"; tier: QualityTier; previous: QualityTier }
  | { name: "performance:degraded"; fps: number }
  | { name: "performance:recovered"; fps: number }
  | { name: "gpu:budget-warning"; metric: string; value: number; budget: number }
  | { name: "memory:pressure"; reason: string }
  | { name: "shader:compile-time-warning"; shader: string; compileTimeMs: number }
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
  | { name: "shader:reloaded"; shader: string }
  | { name: "uniform:updated"; uniform: string }
  | { name: "ai:recommendation-ready"; recommendationId: string }
  | { name: "checkout:started"; cartTotal: number }
  | { name: "checkout:completed"; orderId: string }
  | { name: "customizer:opened" }
  | { name: "customizer:closed" }
  | { name: "variant:selected"; category: string; variantId: string; via: "click" | "keyboard" }
  | { name: "preset:applied"; presetId: string }
  | { name: "preset:reset" }
  | { name: "ingredient:added"; ingredientId: string }
  | { name: "ingredient:removed"; ingredientId: string }
  | { name: "ingredient:updated"; ingredientId: string; quantity: number }
  | { name: "ingredient:reordered"; ingredientId: string; direction: "up" | "down" }
  | { name: "recipe:changed"; ingredientCount: number }
  | { name: "physics:started" }
  | { name: "physics:settled" }
  | { name: "liquid:disturbed" }
  | { name: "liquid:stabilized" }
  | { name: "ai:recommendation-applied"; recommendationId: string }
  | { name: "taste-profile:updated"; field: string }
  | { name: "cart:item-added"; recipeId: string }
  | { name: "cart:item-removed"; recipeId: string }
  | { name: "cart:updated"; itemCount: number; total: number }
  /**
   * Sprint 3.7 — fires once per chapter-boundary crossing (a real, discrete
   * narrative beat), never per scroll pixel. Continuous scroll position is
   * `engine/state/scrollProgress.ts`'s bridge store, deliberately not an
   * event, for the exact reason `uniform:updated` above is never wired to
   * fire per-frame: an event per continuous-value tick would be a real
   * performance bug, not just noise.
   */
  | { name: "chapter:entered"; chapterId: string }
  | { name: "story:skipped"; fromChapterId: string };

export type AppEventName = AppEvent["name"];
