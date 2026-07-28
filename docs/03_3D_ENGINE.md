# 03 — 3D Engine

The shared, cross-feature 3D machinery. Feature-specific 3D content (the cup itself) lives in `features/hero-cup/` and is documented in its own README.

This doc has two parts. **"Current state"** describes what's actually built and running (Milestone 1 + Sprint 2.1 Rendering Core + Sprint 2.2 Asset & Resource Platform + Sprint 2.3 Material & Surface Platform) — if it disagrees with the code, the code wins and this doc is wrong. **"Target architecture"** is what's designed but not yet implemented, each piece tied to the sprint that builds it (see [16_ENGINEERING_SPRINTS.md](16_ENGINEERING_SPRINTS.md)). Do not write code against the target section without checking the roadmap first.

## Current state (Milestone 1 + Sprint 2.1 + Sprint 2.2 + Sprint 2.3, implemented)

### The generalized registry (`engine/registry/createPartRegistry.ts`)

A small factory any feature can instantiate — `resolve`/`register`, keyed by name × `"procedural" | "model"`. `features/hero-cup/registry/cupPartRegistry.ts` is `createPartRegistry<CupPartName, CupPartProps>()`, unchanged behavior from Milestone 1's hand-written version. Unit-tested (`createPartRegistry.test.ts`) for resolution, fallback-to-procedural, and instance independence — the last one specifically proves it's generic, not a disguised singleton, ahead of the Ingredient System (Milestone 5) reusing it.

### Scene composition — deliberately no global Scene Manager

**Decision, not an oversight** — see [ADR-0006](adr/0006-scene-management-strategy.md), reaffirmed by [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md). Each route keeps its own `<Canvas>` behind its own `ssr:false` boundary. `engine/scene/types.ts`'s `SceneCompositionRoot` types what every route's composition root provides (`route`, `camera`, `environment`, `lighting`, `effects`); `CupScene.tsx` constructs and satisfies it structurally rather than passing the same values as untyped ad hoc props.

### Camera (`engine/camera/`)

`presets.ts` types every camera state the roadmap needs — `CameraPresetName = "hero" | "product" | "checkout" | "ai" | "ingredient" | "exploded"` — registers `hero`, and exposes `registerCameraPreset` as the sanctioned extension path. `CameraRig.tsx` applies the resolved preset on mount, then **smoothly interpolates** (not snaps) whenever the `preset` prop changes to a different registered preset — `camera:transition-start`/`camera:transition-complete` fire on the EventBus around that interpolation, settlement measured against the preset's own base position so continuous parallax drift never blocks the "arrived" signal. FOV damps the same way position does. No second preset is switched to at runtime yet (only `hero` exists), so this is verified by unit test (`presets.test.ts`) plus the transition math itself, not a live second-preset demo — see this sprint's retrospective for why `CameraPath`/scroll-path scaffolding was deliberately **not** built this sprint despite being sketched in earlier design docs.

### Environment Manager & Lighting Manager (`engine/environment/`, `engine/lighting/`)

Split from the old combined `LightingTheme` map into two independent, additive registries — `EnvironmentPresetName -> { source, intensity }` and `LightingPresetName -> { ambient, directional, bloom }` — each with a `register*`/`resolve*` pair. `engine/theme/LightingThemes.ts` is now the thin `themeToPresetMap: Record<ThemeName, { environment, lighting }>` the RFC described. Light/dark UI theme is one caller of these registries selecting a default pairing, not the only axis that can vary — day/night presets populate these same registries in Sprint 2.6 without touching this split again. `HDRManager.ts` was deleted; its resolution logic is now `engine/environment/presets.ts`'s job.

### Effects (`engine/effects/`)

`EffectsStack.tsx` takes `effects: EffectConfig[]` — a discriminated union (`bloom` implemented; `vignette`/`dof` typed, unregistered) — replacing the old `EffectName[] + bloom?: BloomConfig` prop pair. `bloom.ts` was deleted (its `BloomConfig` shape is now inlined in the union). Scope boundary confirmed during the Architecture Freeze: WebGL post-processing only, never DOM effects.

### Event system (`engine/events/`, `engine/state/`)

- **Continuous state**: `createBridgeStore<T>()` (`engine/state/createBridgeStore.ts`) generalizes the write-here-drain-there pattern Milestone 1 solved three times independently. The dev-stats store and the keyboard-rotation store are migrated onto it. A `scrollProgress` instance was deliberately **not** created this sprint (see retrospective) — it has zero real consumers until GSAP ScrollTrigger exists (Milestone 6), and a zero-logic, zero-consumer file would be exactly the dead scaffolding this project's standards reject, RC0's prior approval of it as a Sprint 2.1 deliverable notwithstanding.
- **Discrete events**: `createEventBus<TEvent>()` (`engine/events/EventBus.ts`) — synchronous, in-subscription-order, a throwing listener caught and logged without affecting other listeners or the emitter, no replay. `engine/events/index.ts` exports the app-wide `appEvents = createEventBus<AppEvent>()` instance. Real emitters this sprint: `CameraRig` (`camera:transition-start`/`-complete`), `useWebGLContextRecovery` (`webgl:context-lost`/`-restored`), and `useCupInteractionState` (`interaction:started`/`-ended`, `cup:rotated`) — the bus's first three real production consumer paths, not just a unit-tested mechanism with nothing plugged in.

### Interaction (`engine/interaction/`)

`types.ts` defines `GestureType`/`PointerKind`/`GestureEvent` (frozen in [12_INTERACTION_SYSTEM.md](12_INTERACTION_SYSTEM.md), reconciled with a drifted restatement during RC0 — see [27_RC0_APPROVAL.md](27_RC0_APPROVAL.md)) and `classifyPointerKind`. `normalizePointer` moved here from `engine/motion/gestures.ts` (pure coordinate math, not motion timing — a naming-driven implicit dependency flagged during RC0's contract review, fixed here rather than deferred since it was a zero-behavior-change move). `useGestureRecognizer.ts` recognizes tap/drag/hover/press-hold on a DOM element via the Pointer Events API — real, tested (`useGestureRecognizer.test.ts`, 6 cases covering hover, tap-vs-drag threshold, drag lifecycle, touch classification, press-hold timing).

**`useCupInteractionState` does NOT consume `useGestureRecognizer`** — a genuine architectural finding from this sprint, not a shortcut: the cup is hit-tested by R3F's raycaster on a `<group>` (`ThreeEvent` handlers), never a DOM element, so `useGestureRecognizer`'s `RefObject<HTMLElement>` shape doesn't fit 3D hit-testing. `useCupInteractionState` keeps its own proven pointer mechanics (identical drag sensitivity/inertia math to Milestone 1) but now speaks the same `GestureType`/`PointerKind` vocabulary and emits the same `interaction:started`/`-ended` events, so a future DOM-native interactive control and the cup are consistent at the event-vocabulary level without forcing a wrong shared implementation. `useGestureRecognizer` is real infrastructure for the *next* genuinely DOM-native interactive object (e.g. a future 2D customizer control), not dead code today — it's fully tested against real Pointer Events, independent of having a production caller yet.

### Performance (`engine/performance/`) — foundation only

`tier` (a `BridgeStore<QualityTier>`, default `"high"`) and `sampleFrame(fps)` exist and are wired for real: `DevPanelStatsCollector` calls `sampleFrame` every ~500ms alongside its existing FPS sample. The adaptive stepping algorithm (sustained-low-FPS detection, step-down-never-auto-step-up hysteresis) is **not** built yet — deliberately deferred to Sprint 2.5, once the steam shader gives the scene enough complexity for a meaningful budget to test against; building it now against an empty scene would be unverifiable. One-directionality rule (from [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md)) is upheld: this module imports nothing from Effect/Shader/Material Managers.

### Debug panel (`engine/devpanel/`)

`DevPanelStatsCollector` takes a generic `preset: string` (no longer imports `CameraPresetName` directly). `DevPanel` reads `devStats` (now a bridge store) and `performanceManager.tier`, displaying both. `registerDevPanel(name, render)` is a real, exercised extension point — `DevPanel` iterates and renders whatever's registered — with zero panels registered yet (the live-tweak library choice stays deferred, per [26_API_STABILITY.md](26_API_STABILITY.md)).

### Robustness: lost GPU context — implemented

`features/hero-cup/hooks/useWebGLContextRecovery.ts` attaches `webglcontextlost`/`webglcontextrestored` listeners via R3F's `onCreated`, calling `event.preventDefault()` (required by spec) and emitting the corresponding EventBus events. `CupCanvas.tsx` keeps the `<Canvas>` mounted (not torn down) while context is lost — `webglcontextrestored` only fires on the *same* canvas element, so unmounting would make recovery undetectable — and layers `CupStaticFallback` on top, hiding (not removing) the Canvas beneath it.

### Asset & Resource Platform (`engine/assets/`) — Sprint 2.2

**One owner per resource, per Sprint 2.2's rule**: `engine/assets/createResourceManager.ts` is the generic factory — one convention, applied twice (GLB, texture), same "one convention, multiple applications" pattern as the registry/bridge-store/event-bus factories. It fulfills both "Resource Registry" (lifecycle state — `unregistered → loading → ready | error`, `retry`, `dispose`) and "Asset Cache" (the loaded value, deduped and LRU-evicted by key) as one structure, not two redundant ones. `load()` dedups concurrent calls, returns cached values without reloading, and races a timeout; `preload()` is the fire-and-forget streaming primitive; `replace()` is hot-replacement (swaps a ready value, disposing the old one). 13 unit tests cover load/cache-hit/concurrent-dedup/error/timeout/retry/dispose/clear/hot-replacement/LRU-eviction.

- **GLB pipeline** (`engine/assets/gltfLoader.ts`, `glb.ts`): a shared, singleton `GLTFLoader` + `DRACOLoader` (self-hosted decoder at `public/draco/`, copied from `three`'s own bundled decoder — see [ADR-0009](adr/0009-asset-compression-pipeline.md)) + `MeshoptDecoder`. `loadModel(key)` never throws to its caller — a failure or timeout resolves to `{ status: "fallback" }`, the mesh-swap contract's runtime half (see [3d-asset-pipeline.md](3d-asset-pipeline.md)). Tested against a mocked `GLTFLoader` (no real `.glb` file exists in the repo — see "What's deliberately not built" below).
- **Texture pipeline** (`engine/assets/textures.ts`): `THREE.TextureLoader` for PNG/JPG/AVIF (browser-native decode — no format-specific code needed, the browser sniffs AVIF the same as any other raster format handed to `Image()`), a lazily-constructed `KTX2Loader` (self-hosted Basis transcoder at `public/basis/`) for `.ktx2`. Validates loaded textures have non-zero image dimensions before caching. `anisotropy` defaults to `min(quality-tier cap, renderer's actual max)`, not just the renderer's raw capability. `themedAssetKey(base, theme)` scopes a logical texture by theme so light/dark variants cache independently.
- **Quality Tier Integration** (`engine/performance/assetQuality.ts`): `resolveAssetQualityOptions(tier)` — a pure, tested function mapping `QualityTier` to `{ maxAnisotropy, maxTextureSize, preloadEnabled }`, read one-directionally from `performanceManager.tier` (never writes to it, upholding the one-directionality rule). Applies uniformly to textures and to a future self-hosted HDR (see "What's deliberately not built").
- **Memory Budget Integration**: each `createResourceManager` instance's `maxEntries` is a *count-based proxy* for [14_PERFORMANCE_STRATEGY.md](14_PERFORMANCE_STRATEGY.md)'s byte budgets (no reliable cross-browser API measures actual GPU memory — an already-documented limitation), reasoned from the budget doc's own numbers: 24 for textures, 8 for GLBs (fewer, much heavier objects). Eviction emits `resource:evicted`; any release (explicit dispose, eviction, or hot-replacement of an old value) emits `asset:disposed`.
- **Events**: `asset:loading` (new), `asset:loaded`/`asset:load-failed`/`asset:timeout` (already frozen in Sprint 0, now with real emitters), `asset:disposed` (new), `resource:evicted` (new) — see [19_EVENT_CATALOG.md](19_EVENT_CATALOG.md).

**What's deliberately not built this sprint, and why:**

- **No `ModelCup`/etc. component, no populated manifest entries.** Zero real `.glb`/texture/HDR files exist anywhere in `public/` — this was true before this sprint and remains true after it. Building a component that references a file path that doesn't exist would be broken code, not infrastructure. What's real and tested is the *machinery* (loader configuration, cache/lifecycle mechanics, fallback logic), verified against mocked loaders — exactly the bar [25_IMPLEMENTATION_READINESS.md](25_IMPLEMENTATION_READINESS.md) set for this sprint before any implementation happened.
- **No hand-rolled HDR loader.** drei's `<Environment files={...}>` (already in use via `SceneEnvironment`) already lazy-loads HDR files internally (`RGBELoader`/`EXRLoader` + `PMREMGenerator`) — building a second, custom loader through `createResourceManager` would duplicate a mechanism that already works correctly, not add real capability. The seam this platform contributes is `resolveAssetQualityOptions`, ready for a future self-hosted HDR to consult when one exists.
- **No Audio Pipeline**, despite being named in this sprint's brief. [01_ARCHITECTURE.md](01_ARCHITECTURE.md) has stated since Milestone 1 that `audio/` arrives with the milestone that first needs a real sound (ingredient-drop, checkout success) — neither exists this sprint (explicitly excluded from scope: "No Ingredient System. No Commerce."). No `IAudioManager` was ever frozen in [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md) during RC0 either — building one now would mean designing and implementing a manager with zero frozen contract and zero possible real consumer in the same sprint, the exact combination this project's standards exist to prevent. See this sprint's review for the full reasoning.

### Theme bridge (`engine/theme/`)

`ThemeEngine.ts`'s `useActiveTheme()` unchanged. `ColorSchemes.ts`'s OKLCH → linear-sRGB conversion unchanged (see the Milestone 1 incident note preserved below). `LightingThemes.ts` is now the thin `themeToPresetMap` described above, not a combined lighting-value map.

### Graphics utilities (`engine/graphics/`)

- `TextureLoader.ts` — `createRadialGradientTexture()`/`createLogoTexture()` are runtime canvas generators, a different concern from `engine/assets/textures.ts`'s file-loading pipeline — one generates pixels, the other fetches and caches them. Gains `getOrCreateLogoTexture()` (Sprint 2.3's Logo Decal Pipeline — caches the generated badge by size via `engine/materials/createSyncCache`).
- `MaterialFactory.ts` — **moved to `engine/materials/MaterialFactory.ts`** in Sprint 2.3; nothing remains here under this name.
- `EnvironmentFactory.tsx` — `<SceneEnvironment preset={...}>` takes a resolved `EnvironmentPresetDefinition` (from the Environment Manager) instead of a raw `theme`.

### Note on lint and R3F's imperative model

Unchanged from Milestone 1 — `eslint.config.mjs` scopes `react-hooks/immutability`/`purity` off for `engine/camera/**`, `engine/devpanel/**`, `features/**`. The one new rule interaction found this sprint: React's `react-hooks/refs` rule flags mutating a ref *during render* (not inside an effect) — `useGestureRecognizer`'s "latest handlers" ref is written inside a dependency-free `useEffect` rather than inline during render, the idiomatic fix, not a suppression.

### Cup-specific architecture

The `CupPartProps` contract, geometry/material choices, and the interaction state machine are documented in [features/hero-cup/README.md](../src/features/hero-cup/README.md) and [state-machine.md](state-machine.md).

### Material & Surface Platform (`engine/materials/`) — Sprint 2.3

Moved here from `engine/graphics/MaterialFactory.ts` (mechanical relocation, zero behavior change — `engine/graphics/` now holds only `TextureLoader.ts` and `EnvironmentFactory.tsx`, matching the Sprint 2.1 precedent of splitting Environment/Lighting out of that same grab-bag folder). Fourth "one convention, multiple applications" factory family, alongside registry/bridge-store/event-bus/resource-manager:

- **`createSyncCache<T>()`** (`createSyncCache.ts`) — the *synchronous* sibling of Sprint 2.2's `createResourceManager`, same LRU/dispose/eviction shape. Deliberately a separate factory, not a forced reuse of the async one: every cup part creates its material synchronously inside `useMemo`, assigning it directly to a `<mesh material={...}>` prop. Routing that through an async `load()` would make every part component's render path asynchronous — a breaking change [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md) forbids. Also backs the Logo Decal Pipeline's texture cache (`engine/graphics/TextureLoader.ts`'s `getOrCreateLogoTexture`).
- **`presets.ts`** — named PBR parameters per surface (`ceramic`/`liquid`/`foam`/`sleeve`/`lid`/`glass`/`metal`), the single source `MaterialFactory.ts`, validation, and fallback all read from, replacing inline magic numbers.
- **`MaterialFactory.ts`** — `create*Material()` per surface, now including `createGlassMaterial`/`createMetalMaterial` (production-ready, zero current cup-part consumer — a cheap, safe, pure function, unlike a subsystem with no possible consumer; contrast the Audio Pipeline decision in [reviews/sprint-2.2-review.md](reviews/sprint-2.2-review.md)).
- **`cache.ts`** — `getOrCreateMaterial(key, factory)` (the frozen `IMaterialManager` contract, cache-wrapped, keyed by the structured `MaterialCacheKey`), `updateMaterialParams`/`updateMaterialColor` (in-place mutation, no disposal, no identity change), `validateSurfaceParams` (clamps out-of-range values, falls back to the surface's preset — a real bug this caught: [engine/materials/cache.ts](../src/engine/materials/cache.ts)'s validation is what a customizer's bad input hits first), `disposeMaterialCacheEntry`/`clearMaterialCache`, `materialCacheKeyToString` (serialization). LRU cap: 32 entries, the same count-based-proxy-for-byte-budget caveat as Sprint 2.2's asset caches.
- **`themeBridge.ts`** — `resolveEnvMapIntensity(lightingPreset, base)` calibrates ceramic/liquid reflections per lighting preset rather than a flat multiplier (this sprint's Creative Budget item — see [reviews/sprint-2.3-review.md](reviews/sprint-2.3-review.md)); `resolveMaterialContext(theme)` bundles theme + quality tier (the "Uniform Binding Layer" reframed — no shader exists yet to bind a GLSL uniform to, so this is the material-creation-context equivalent, real and consumed, not speculative shader plumbing); `notifyThemeMaterialsUpdated` emits the batch `theme:materials-updated` signal once per real theme change.
- **All 5 real cup parts migrated** (`ProceduralCup`/`Sleeve`/`Lid`/`Coffee`/`Foam`): the common (no-`materialOverrides`) case routes through `getOrCreateMaterial`; a `materialOverrides`-bearing instance is created directly, never cached — mutating a shared cached instance per-consumer would corrupt it for every other consumer requesting the same base key. `materialOverrides` has no real caller yet (Milestone 4), so this branch is exercised by tests, not production traffic, same as everything else this sprint that anticipates a not-yet-arrived feature.

---

## Target architecture (Sprint 2.4+, designed, not yet implemented)

### Shader Manager (`engine/shaders/`, new) — Sprint 2.4

`common/` utilities (noise, remap, uniform helpers) plus the real steam shader, replacing the billboard+canvas-texture placeholder. Full design in [13_SHADER_ARCHITECTURE.md](13_SHADER_ARCHITECTURE.md).

### Performance Manager: adaptive stepping — Sprint 2.5

The tier-stepping algorithm itself (sustained-low-FPS detection → step down; never auto-step-up mid-session), reading the `lastFps`/`tier` foundation built this sprint. Full budget detail in [14_PERFORMANCE_STRATEGY.md](14_PERFORMANCE_STRATEGY.md).

### Day/night lighting content — Sprint 2.6

Real day/night `EnvironmentPresetDefinition`/`LightingPresetDefinition` entries populating the registries built this sprint, independent of light/dark UI theme.

### Camera paths / Scroll Storytelling — Milestone 6

Deliberately not scaffolded this sprint (see retrospective in [reviews/sprint-2.1-review.md](reviews/sprint-2.1-review.md)) — a `CameraPath` registry and `CameraRig`'s `path` prop arrive with Milestone 6, when GSAP ScrollTrigger and `scrollProgress` actually exist to drive them.

---

## Rendering pipeline

### Render loop & frameloop strategy

Unchanged: **`frameloop="always"` when the scene has continuous ambient animation; `frameloop="demand"` otherwise.** Discrete interactions call `invalidate()` explicitly regardless of mode.

### Post-processing order

Render pass (implicit, includes tone mapping) → screen-space reflections, if ever used → Bloom → DOF → Vignette → Chromatic Aberration → Noise/grain.

**Tone mapping gotcha, from a real Milestone 1 incident**: never pass an explicit tone-mapping override to `<Canvas>` when `EffectsStack` is active — verified still true this sprint (no override was reintroduced).

### Shadows

Unchanged: real-time shadow-casting reserved for the scene's primary hero object(s) only.

### GPU optimization, forward-looking

- **Instancing**: repeated geometry (future ingredient particles) uses `InstancedMesh`.
- **Disposal on route change**: each route's own `Canvas` disposes its WebGL context on unmount.
- **Frustum culling**: automatic, never disabled.
- Full budgets in [14_PERFORMANCE_STRATEGY.md](14_PERFORMANCE_STRATEGY.md).

## Related

[16_ENGINEERING_SPRINTS.md](16_ENGINEERING_SPRINTS.md) · [reviews/sprint-2.1-review.md](reviews/sprint-2.1-review.md) · [reviews/sprint-2.2-review.md](reviews/sprint-2.2-review.md) · [reviews/sprint-2.3-review.md](reviews/sprint-2.3-review.md) · [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) · [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md) · [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md) · [04_MOTION_ENGINE.md](04_MOTION_ENGINE.md) · [12_INTERACTION_SYSTEM.md](12_INTERACTION_SYSTEM.md) · [13_SHADER_ARCHITECTURE.md](13_SHADER_ARCHITECTURE.md) · [14_PERFORMANCE_STRATEGY.md](14_PERFORMANCE_STRATEGY.md) · [3d-asset-pipeline.md](3d-asset-pipeline.md) · [adr/0002](adr/0002-r3f-architecture.md) · [adr/0003](adr/0003-theme-system.md) · [adr/0006](adr/0006-scene-management-strategy.md)
