# Milestone 2 — Implementation Plan

**Status**: Superseded as the build order by [16_ENGINEERING_SPRINTS.md](16_ENGINEERING_SPRINTS.md), which regroups these same 12 checkpoints into 6 sprints so each one ships a visible improvement, not just verifiable plumbing. Kept here because the dependency reasoning below (why each checkpoint can only follow the ones it lists) is still the authoritative source for *why* the sprint order in 16 is safe — the sprints don't re-derive it. Follow [16_ENGINEERING_SPRINTS.md](16_ENGINEERING_SPRINTS.md) for actual build order.

## How this roadmap is ordered

Dependency order, not narrative order: each checkpoint only depends on checkpoints before it, never after. The first several checkpoints are low-risk, mechanical generalizations of patterns Milestone 1 already proved (the registry, the bridge-store shape) — deliberately front-loaded because they're the safest to verify (the hero must render *identically* before and after) and everything later depends on them existing. The two checkpoints that are actually "Milestone 2 — Steam & Lighting Depth" per [08_MILESTONES.md](08_MILESTONES.md) — the steam shader and the day/night lighting pass — sit in the middle, once their dependencies (shader infrastructure, the environment/lighting split) exist under them.

Every checkpoint ends in a state where `npm run build`, `tsc --noEmit`, and `eslint` are clean and the existing hero looks and behaves identically to before the checkpoint started, unless the checkpoint's whole point is a visible change (steam, lighting) — in which case that's the thing being verified instead.

## Checkpoint 1 — Registry generalization

**Builds**: `engine/registry/createPartRegistry.ts` (the generic factory from [03_3D_ENGINE.md](03_3D_ENGINE.md)); migrates `features/hero-cup/registry/cupPartRegistry.ts` to use it.
**Depends on**: nothing new — a refactor of existing Milestone 1 code.
**Test independently**: the hero renders pixel-identical before/after (this is a pure refactor, not a behavior change) — visual check plus `tsc`/`eslint`/`build` clean. This is the checkpoint every later one that touches a registry (camera presets, environment/lighting presets) inherits its pattern from, so getting it right here matters disproportionately to its own small size.

## Checkpoint 2 — Camera Manager: transitions + path scaffolding

**Builds**: preset-to-preset transition interpolation in `CameraRig`; the empty, typed `engine/camera/paths.ts` registry (no paths populated yet — Scroll Storytelling is Milestone 6).
**Depends on**: Checkpoint 1 (same registry pattern, applied to camera presets — no functional dependency, just consistency).
**Test independently**: the hero's existing single-preset behavior is unchanged (still snaps to `"hero"` on mount, since transitioning *from* nothing has no visible difference). A temporary, throwaway second preset registration (removed before merge, or gated behind a dev-only route) proves the transition interpolates instead of snapping — this is the one checkpoint that needs a scratch harness to verify, since no real second preset exists yet to switch to.

## Checkpoint 3 — Environment & Lighting Manager split

**Builds**: `engine/environment/presets.ts`, `engine/lighting/presets.ts`, and reduces `engine/theme/LightingThemes.ts` to the thin `ThemeName -> {environment, lighting}` map described in [03_3D_ENGINE.md](03_3D_ENGINE.md).
**Depends on**: Checkpoint 1 (registry pattern).
**Test independently**: pure refactor — light/dark theme toggling produces identical visual output before and after. This checkpoint's entire value is invisible until Checkpoint 10 (day/night) uses the new independent axis; verification here is strictly "nothing broke."

## Checkpoint 4 — Material & Texture Manager caching

**Builds**: a capped, LRU-evicted cache wrapping `MaterialFactory.ts`'s and `TextureLoader.ts`'s existing factory functions.
**Depends on**: nothing from Checkpoints 1–3.
**Test independently**: hero renders identically; a temporary instrumentation log (removed before merge) confirms a second call with the same params returns the cached instance, not a new one. No customizer exists yet to exercise this for real — this checkpoint proves the mechanism works, not that it's yet load-bearing.

## Checkpoint 5 — Effect Manager redesign

**Builds**: `EffectsStack`'s prop surface changes from `effects: EffectName[] + bloom?: BloomConfig` to `effects: EffectConfig[]` (discriminated union); `CupScene`'s call site migrates.
**Depends on**: nothing new.
**Test independently**: bloom renders identically in both themes; this is a mechanical prop-shape migration with exactly one real call site to update, low risk, fast to verify visually.

## Checkpoint 6 — Event system: bridge store + event bus

**Builds**: `engine/state/createBridgeStore.ts`; `engine/events/EventBus.ts`. Migrates the existing dev-stats store and keyboard-rotation bridge store onto `createBridgeStore` (touching those two files anyway is the trigger, not a forced separate migration pass).
**Depends on**: nothing new.
**Test independently**: dev panel FPS display still works; keyboard cup rotation still works, identically. `EventBus` ships with zero real consumers yet (no discrete cross-manager event exists until a later milestone needs one) — its own unit test (subscribe, emit, receive, unsubscribe) is the verification, not a live consumer.

## Checkpoint 7 — Interaction Manager: gesture recognizer extraction

**Builds**: `engine/interaction/types.ts` (`GestureEvent`), `engine/interaction/useGestureRecognizer.ts`, per [12_INTERACTION_SYSTEM.md](12_INTERACTION_SYSTEM.md). Migrates `useCupInteractionState` to consume it instead of hand-rolling pointer-event recognition inline.
**Depends on**: Checkpoint 6 (if the recognizer emits through the event bus rather than plain callbacks — decide at implementation time based on which reads cleaner; either is consistent with the design).
**Test independently**: the highest-regression-risk checkpoint in this plan — drag (mouse), drag (touch, verify `pointerType` still distinguishes it for analytics), and keyboard rotation must all behave identically to Milestone 1's hand-tuned feel (same sensitivity, same inertia). Full manual pass required, not just a build check; this is the checkpoint most worth a real-browser session, not headless-only verification, given this project's documented headless-capture flakiness.

## Checkpoint 8 — Asset & Shader infrastructure scaffolding

**Builds**: `engine/assets/gltfLoader.ts` (shared `GLTFLoader` + `DRACOLoader` + `MeshoptDecoder`, configured once); `engine/shaders/common/` (`noise.ts`, `remap.ts`, `uniforms.ts`).
**Depends on**: nothing functionally, but naturally follows the manager work above since it's the last piece of "machinery with no real consumer yet."
**Test independently**: the loader configuration doesn't throw when constructed (no real GLB exists to load yet — this is genuinely just "does the machinery initialize correctly," verified with a throwaway test asset or a unit test, not a visual check). The shader common utilities are verified by successfully compiling one trivial shader that imports them (a scratch/dev-only test shader, not shipped) — proving the template-string composition approach (ADR-0008) actually works before the real steam shader depends on it.

## Checkpoint 9 — Steam shader (Milestone 2's headline feature)

**Builds**: `engine/shaders/steam/` (`SteamMaterial.ts`, `steam.vert.ts`, `steam.frag.ts`) per [13_SHADER_ARCHITECTURE.md](13_SHADER_ARCHITECTURE.md); replaces `ProceduralSteam`'s billboard+canvas-texture placeholder with the shader material.
**Depends on**: Checkpoint 8 (common noise utility).
**Test independently**: direct visual comparison against the Milestone 1 placeholder and against the specific critique that motivated this checkpoint ("steam isn't very visible/convincing" — [reviews/milestone-1-creative-director-review.md](reviews/milestone-1-creative-director-review.md)); FPS check via the dev panel (a per-fragment noise shader is more expensive than a static texture — confirm the budget in [14_PERFORMANCE_STRATEGY.md](14_PERFORMANCE_STRATEGY.md) still holds); reduced-motion still disables it exactly as before (the `visible` prop path is unchanged, only what's inside the material changes).

## Checkpoint 10 — Day/night lighting pass (Milestone 2's other headline feature)

**Builds**: populates `LightingPreset`/`EnvironmentPreset` registries (Checkpoint 3's machinery) with real day/night variants, independent of light/dark UI theme.
**Depends on**: Checkpoint 3.
**Test independently**: a Creative Director Review-style pass across every UI-theme × lighting-preset combination (4 combinations minimum: light-UI/day, light-UI/night, dark-UI/day, dark-UI/night) — this is exactly the kind of thing that needs real rendering, not just a build check, matching Milestone 1's discipline of actually looking at the pixels.

## Checkpoint 11 — Performance Manager: adaptive quality

**Builds**: production-mode FPS sampling (separate instance from the dev-only panel collector, per [14_PERFORMANCE_STRATEGY.md](14_PERFORMANCE_STRATEGY.md)'s explicit distinction) and the tier-stepping logic.
**Depends on**: Checkpoints 8–10 having landed (there needs to be enough scene complexity — the steam shader, at minimum — for a meaningful performance budget to test against).
**Test independently**: Chrome DevTools CPU throttling (4×–6× slowdown) forces a sustained low-FPS session; verify the tier steps down exactly once (not thrashing), and that it doesn't step back up automatically within the same session.

## Checkpoint 12 — Integration & full review

**Builds**: nothing new — this is Milestone 1's own end-of-milestone discipline, repeated. Every "target architecture" section in [03_3D_ENGINE.md](03_3D_ENGINE.md), [04_MOTION_ENGINE.md](04_MOTION_ENGINE.md), and the other design docs is moved into "current state" for whatever actually shipped in Checkpoints 1–11 (and only that — anything designed but not built this milestone stays in "target," honestly).
**Depends on**: everything above.
**Test independently**: the full engineering review (dead code, dependency direction, a11y, docs-vs-code accuracy) and a second Creative Director Review, exactly like [reviews/milestone-1-stabilization-review.md](reviews/milestone-1-stabilization-review.md), scored against what Milestone 2 actually delivers.

## Related

[milestone-2-architecture-rfc.md](milestone-2-architecture-rfc.md) · [08_MILESTONES.md](08_MILESTONES.md) · [09_CREATIVE_DIRECTOR_REVIEW.md](09_CREATIVE_DIRECTOR_REVIEW.md)
