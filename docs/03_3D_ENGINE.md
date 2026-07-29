# 03 — 3D Engine

The shared, cross-feature 3D machinery. Feature-specific 3D content (the cup itself) lives in `features/hero-cup/` and is documented in its own README.

This doc has two parts. **"Current state"** describes what's actually built and running (Milestone 1 + Sprint 2.1 Rendering Core + Sprint 2.2 Asset & Resource Platform + Sprint 2.3 Material & Surface Platform + Sprint 2.4 Shader & Rendering Pipeline) — if it disagrees with the code, the code wins and this doc is wrong. **"Target architecture"** is what's designed but not yet implemented, each piece tied to the sprint that builds it (see [16_ENGINEERING_SPRINTS.md](16_ENGINEERING_SPRINTS.md)). Do not write code against the target section without checking the roadmap first.

## Current state (Milestone 1 + Sprint 2.1 + Sprint 2.2 + Sprint 2.3 + Sprint 2.4, implemented)

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

### Performance (`engine/performance/`) — Runtime Optimization & Adaptive Quality, Sprint 2.5

`tier` (a `BridgeStore<QualityTier>`, default `"high"`) and `mode` (a `BridgeStore<QualityMode>`, default `"automatic"`) are the module's two owned bridge stores; `sampleFrame(fps)` records the latest reading. `QualityTier` was extended this sprint from 3 values (`high`/`medium`/`low`) to 5 (`ultra`/`high`/`medium`/`low`/`minimal`) — a deliberate, sanctioned [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md) exception (additive-in-spirit but not in literal union-widening terms, since existing consumers now see two new members to handle) because this sprint's brief named all 5 tiers explicitly.

- **`PerformanceSampler.tsx`** — the real production sampler, mounted unconditionally in `CupScene` (not `NODE_ENV`-gated, unlike the DOM overlay). This closes a genuine gap `03_3D_ENGINE.md` previously left open: Sprint 2.1 built `tier`/`sampleFrame` but nothing fed them outside of `DevPanelStatsCollector`, which is dev-only — meaning adaptive quality never actually ran in a production build. One `gl.info` sample per ~500ms tick (via `useFrame`, so it correctly reflects R3F's real render rate under `frameloop="demand"`) feeds `recordPerformanceSnapshot`, `evaluateAdaptiveQuality`, and `checkGpuBudget` in one place — one producer, three consumers.
- **`runtimeProfiler.ts`** — `PerformanceSnapshot` (`fps`, `frameTimeMs`, `drawCalls`, `triangles`, `geometries`, and since Sprint 2.6, `gpuTextures` — `gl.info.memory.textures`, Three's own live GPU texture count, a real renderer-level reading rather than a byte estimate), `Object.freeze()`'d at construction and exposed only through the `latestSnapshot` bridge store. "Every runtime metric has exactly one producer... metrics are immutable snapshots" (Sprint 2.5's stated constraint) is enforced structurally, not just by convention — a consumer that tries to mutate a snapshot throws.
- **`adaptiveQuality.ts`** — `evaluateAdaptiveQuality(fps)`, a no-op unless `mode === "automatic"`. Asymmetric hysteresis: stepping *down* is fast (3 consecutive samples below 45 FPS, ~1.5s) to protect the user quickly; stepping *up* requires 10 consecutive samples at/above 55 FPS (~5s) before it's trusted. This is a deliberate, documented evolution of Sprint 2.1's original "never auto-step-up mid-session" rule, not a silent reversal — see [14_PERFORMANCE_STRATEGY.md](14_PERFORMANCE_STRATEGY.md) and this sprint's review for the reasoning and the real-browser CPU-throttle verification. Always steps one tier at a time, matching `QUALITY_TIER_ORDER`.
- **`qualityPolicy.ts`** — `resolveQualityPolicy(tier)`, a pure lookup table (DPR range, shadow map size, bloom enabled/intensity multiplier, environment resolution, particle budget) per tier. "Scale, don't disable": `bloomEnabled` is `false` at exactly one tier (`minimal`); every other parameter scales continuously across all 5 tiers rather than flipping off — the literal reading of this sprint's "Adaptive Quality may reduce quality. It must never reduce correctness... Never disable a feature if it can instead scale" constraint.
- **`gpuBudget.ts`** — `checkGpuBudget(snapshot)` compares the latest snapshot against `DRAW_CALL_BUDGET`/`TRIANGLE_BUDGET` (100 / 55,000, matching [14_PERFORMANCE_STRATEGY.md](14_PERFORMANCE_STRATEGY.md)'s table) and emits `gpu:budget-warning` on a transition into over-budget, not on every sample over budget.
- **`memoryPressure.ts`** — `initMemoryPressureDetection()` combines `resource:evicted` rate with the `performance:degraded` signal to emit `memory:pressure`; no reliable cross-browser memory-measurement API exists (same documented limitation as Sprint 2.2's count-based cache caps), so this is a derived heuristic, not a direct measurement.
- **`useSmoothedValue.ts`** — this sprint's Creative Budget item's mechanism: a `THREE.MathUtils.damp`-based hook (the same technique `CameraRig.tsx` established in Sprint 2.1), reused in `CupScene.tsx` to damp bloom intensity toward its tier-driven target instead of snapping on a tier change. Reduced-motion skips the transition (snap, per this project's "disable outright, don't downgrade" motion policy) rather than animating it.
- **Quality Tier Integration** (`engine/performance/assetQuality.ts`): `TIER_OPTIONS` extended to cover all 5 tiers (`ultra` above the old `high` ceiling, `minimal` below the old `low` floor).

One-directionality rule (from [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md)) remains upheld: this module imports nothing from Effect/Shader/Material Managers — `qualityPolicy`'s output is consumed one-directionally by `CupScene.tsx`/`CupCanvas.tsx`, never the reverse.

### Debug panel (`engine/devpanel/`)

`DevPanelStatsCollector` takes a generic `preset: string` (no longer imports `CameraPresetName` directly) and, since Sprint 2.5, only tracks that display-only label — the real measurements it used to sample itself now live in `runtimeProfiler.ts`'s `latestSnapshot`, produced once by the always-on `PerformanceSampler`, not sampled a second time here. `DevPanel` reads `latestSnapshot`, `performanceManager.tier`, and `performanceManager.mode`, displaying fps/frame-time/draw-calls/triangles/geometries alongside the current tier and automatic/manual mode. `registerDevPanel(name, render)` is a real, exercised extension point — `DevPanel` iterates and renders whatever's registered; its first two real consumers are Sprint 2.4's `"shaders"` panel and Sprint 2.6's `"engine-health"` panel below (the live-tweak material/lighting panel this extension point was originally built for stays deferred, per [26_API_STABILITY.md](26_API_STABILITY.md)).

### Engine Health Dashboard (`engine/devpanel/engineHealth.ts` + `EngineHealthPanel.tsx`) — Sprint 2.6

Deliberately lives in the Debug Layer, not `engine/performance/` — `runtimeProfiler.ts`'s own doc comment (written a sprint earlier) had already drawn this exact boundary: combining material/texture/shader stats inside the Performance Manager would mean it importing from Materials/Assets/Shaders, a direct one-directionality violation. The Debug Layer is a pure sink nothing else depends on, so it's the correct owner of a cross-cutting read across every manager's already-public stats accessors — nothing here reaches into another manager's internals.

`computeEngineHealth()` aggregates: fps/frame-time/draw-calls/triangles/GPU-texture-count (from `latestSnapshot`), texture/model/material counts and cache hit ratio (`getTextureCacheStats`/`getModelCacheStats`/`getMaterialCacheStats` — the first two are new this sprint, added symmetrically to `createSyncCache`'s pre-existing `hits`/`misses`/`size`), compiled-vs-registered shader counts (`shaderRegistry.list()` + `getShaderDiagnostics()`), current quality tier/mode, and event throughput (`appEvents.getEmitCount()`, a new additive `EventBus` method — a monotonic counter, with events/sec derived from the delta between two samples, the same pattern `PerformanceSampler` already uses for FPS). `EngineHealthPanel.tsx` registers this as a `"engine-health"` panel, dev-only (self-gated, mirroring `DevPanel`'s own convention), mounted alongside `<DevPanel />` in `Hero.tsx`.

### Analytics activation (`engine/analytics/`) — a Sprint 2.6 integration fix

`eventBridge.ts`'s EventBus subscriptions (Analytics's only real entry point) previously activated only because `useCupInteractionState.ts` — a hero-cup-specific feature hook — imported the module for its side effect. This "worked" only because the sole route (`/`) always mounts the hero cup; a future route without it would silently run with Analytics never wired up. Fixed by moving the side-effect import to `app/providers.tsx` (the actual app root, wrapping every route). Found by Sprint 2.6's Engine Integration Audit tracing the real activation call graph, not assumed from the file tree — see [reviews/sprint-2.6-review.md](reviews/sprint-2.6-review.md).

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

### Shader Manager (`engine/shaders/`) — Sprint 2.4

Infrastructure, not final effects — this sprint's brief explicitly excluded the final steam simulation, coffee physics, and ingredient physics; what's real is the pipeline every one of those will eventually sit on.

- **Registry/Factory** (`registry.ts`, `factory.ts`) — the same name-keyed registration pattern as `createPartRegistry`; a `ShaderDefinition` is one of two discriminated shapes: `unlit` (`create()` returns a fresh `THREE.ShaderMaterial` instance — drei's `shaderMaterial()` helper wasn't needed since nothing here is consumed declaratively via JSX, matching the existing imperative `useMemo` pattern every cup part already uses) or `physically-lit` (`apply()` mutates an existing `MeshPhysicalMaterial` via `onBeforeCompile`). `createShaderMaterial`/`applyShader` dispatch to the correct one and throw a clear error if a caller picks the wrong entry point for a given shader's path.
- **Diagnostics** (`diagnostics.ts`) — doubles as this sprint's "Shader Cache," reframed deliberately: a per-*instance* GPU resource cache doesn't fit shader materials the way it fit Sprint 2.3's PBR materials (two steam wisps need independent `uTime`, so caching *instances* by key would be wrong); what's real and shared is compile *state* per shader *definition*, which is exactly what diagnostics needs anyway. Real emitters of `shader:compiled`/`shader:failed`.
- **Validation** (`validation.ts`) — static/structural checks only (name, version, non-empty source, `uTime` present on unlit shaders) — real GLSL compilation needs a live WebGL context jsdom can't provide; see `DevDiagnosticsProbe.tsx` below for how that half is actually verified.
- **Versioning + Hot Reload** (`registry.ts`'s `bumpVersion`) — real hot reload is inherited free from Next.js Fast Refresh, since shader source lives in normal `.ts` modules ([ADR-0008](adr/0008-shader-authoring-approach.md)'s whole reason for that choice); `bumpVersion` is the one piece Fast Refresh can't do alone — forcing a cache/instance keyed on `${name}@${version}` to construct fresh rather than reuse stale state, emitting `shader:reloaded`.
- **Uniform Manager** (`common/uniforms.ts`) — a shared uniform block (`sharedUniforms`: resolution, quality tier, theme mode/color, lighting intensity, interaction state, plus `uStorytellingProgress`/`uPhysicsIntensity` typed but unpublished until Milestone 6/3) with named `publish*` functions as the *only* writers — "each uniform has exactly one owner," upheld literally. `uTime` is deliberately per-instance (`createPerInstanceUniforms`), not shared — a shared clock would make every repeated shader instance pulse in lockstep. Camera position is deliberately **not** published as a separate uniform — Three's built-in `cameraPosition` GLSL variable already covers the common view-dependent case; publishing a second source of the same data would itself violate "duplicate uniform sources are forbidden."
- **Common utilities** (`common/`) — `noise.ts` (hash + value noise + FBM — "random generators" folded into `hash`, not a separate module), `rotation.ts`, `blending.ts`, `colorSpace.ts` (linear/sRGB, a documented gamma-2.2 approximation, not a duplicate of the JS-side exact conversion), `toneMapping.ts` (Reinhard, for self-tonemapping unlit/additive effects before Bloom), `easing.ts`.
- **Steam** (`steam/`) — real, wired, replaces the Milestone 1 billboard+canvas-texture placeholder in `ProceduralSteam.tsx`. Single-octave `noise2D`, deliberately not the domain-warped FBM the *final* steam simulation (still Milestone 2+ per [13_SHADER_ARCHITECTURE.md](13_SHADER_ARCHITECTURE.md)) will use. The exact same rise/fade/scale animation curve as Milestone 1, unchanged — only the material changed. Falls back to the original `MeshBasicMaterial`+canvas-texture technique if shader construction throws (a real try/catch, not a placebo — see this sprint's review for the honest limit of what's synchronously catchable).
- **Coffee & Foam** (`coffee/`, `foam/`) — a shared `applyFresnelRim` (`surfaces/applyFresnelRim.ts`) applied via `onBeforeCompile`, injected immediately before `#include <opaque_fragment>` (verified against this project's exact installed Three.js source, not assumed from memory — see the file's own doc comment). A subtle rim brighten, proving the physically-lit path compiles and renders correctly; explicitly not the tilt/ripple liquid physics or live-animated foam displacement [13_SHADER_ARCHITECTURE.md](13_SHADER_ARCHITECTURE.md) designs for later milestones. Applied only inside the Material Manager's cache factory function (a real cache *hit* never re-triggers `onBeforeCompile`, which would force a wasted recompile).
- **Glow, Distortion, Particles** (`glow/`, `distortion/`, `particles/`) — real, registered, `unlit`-path shader definitions with zero scene consumers (no current feature needs them). Verified compiling via `DevDiagnosticsProbe.tsx`, not a production render — see below.
- **`DevDiagnosticsProbe.tsx`** — dev-only (same `NODE_ENV !== "production"` gating as `DevPanelStatsCollector`), mounted in `CupScene`. Positions a tiny mesh per registered *unlit* shader far outside the camera frustum (not `visible={false}`, which would skip rendering — and skip compilation — entirely) so Three.js actually attempts to compile each one on first render. Registers a `"shaders"` panel via `registerDevPanel` — the Debug Overlay extension point's first real consumer since it was built in Sprint 2.1.

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

## Target architecture (Sprint 2.6+, designed, not yet implemented)

### Day/night lighting content — Sprint 2.6

Real day/night `EnvironmentPresetDefinition`/`LightingPresetDefinition` entries populating the registries built this sprint, independent of light/dark UI theme.

### Camera paths / Scroll Storytelling — Milestone 6

Deliberately not scaffolded this sprint (see retrospective in [reviews/sprint-2.1-review.md](reviews/sprint-2.1-review.md)) — a `CameraPath` registry and `CameraRig`'s `path` prop arrive with Milestone 6, when GSAP ScrollTrigger and `scrollProgress` actually exist to drive them.

---

## Rendering pipeline

### Stage ownership (Sprint 2.4)

Finalized order, one owner per stage — no stage's job is split across two managers:

| Stage | Owner | Notes |
|---|---|---|
| Geometry | Feature code (`features/hero-cup/geometry/`) | Not engine-owned — geometry is domain-specific per feature; the *pattern* (LatheGeometry silhouettes, TubeGeometry handles) is documented, not centralized |
| Materials | Material Manager (`engine/materials/`) | `getOrCreateMaterial`, cached by structured key |
| Textures | Asset Manager's texture pipeline (`engine/assets/textures.ts`) for real files; `engine/graphics/TextureLoader.ts` for canvas-generated ones | Two owners, two genuinely different sources — not a violation of "one owner per stage," since they own disjoint texture *origins*, never the same texture |
| Uniform Binding | Shader Manager's Uniform Manager (`engine/shaders/common/uniforms.ts`) | Publishes the shared block; per-instance uniforms are owned by whichever component constructs that shader instance |
| Lighting | Lighting Manager (`engine/lighting/`) | Resolves `LightingPresetDefinition`; also the publisher of `uLightingIntensity` into the shared uniform block |
| Shader Execution | Shader Manager (`engine/shaders/`) | Both paths — `create()`/`apply()` |
| Effects | Effect Manager (`engine/effects/`) | `EffectConfig[]` → `EffectComposer`; WebGL post-processing only, never DOM effects |
| Tone Mapping | The `WebGLRenderer` default (never an explicit `<Canvas>` override — see the gotcha below) | Applied before `EffectComposer` sees the frame, not a separate late-pipeline step |
| Bloom | Effect Manager, as one `EffectConfig` variant | Not a separate stage from "Effects" architecturally, listed separately here only because the sprint's brief named it explicitly |
| Output | The `WebGLRenderer`/`<Canvas>` itself | Final composited frame to the DOM canvas element |

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
- **Budget enforcement** (Sprint 2.5): `engine/performance/gpuBudget.ts`'s `checkGpuBudget` compares each live `PerformanceSnapshot` against the draw-call/triangle budgets below and emits `gpu:budget-warning` on a transition into over-budget.
- Full budgets in [14_PERFORMANCE_STRATEGY.md](14_PERFORMANCE_STRATEGY.md).

## Related

[16_ENGINEERING_SPRINTS.md](16_ENGINEERING_SPRINTS.md) · [reviews/sprint-2.1-review.md](reviews/sprint-2.1-review.md) · [reviews/sprint-2.2-review.md](reviews/sprint-2.2-review.md) · [reviews/sprint-2.3-review.md](reviews/sprint-2.3-review.md) · [reviews/sprint-2.4-review.md](reviews/sprint-2.4-review.md) · [reviews/sprint-2.5-review.md](reviews/sprint-2.5-review.md) · [reviews/sprint-2.6-review.md](reviews/sprint-2.6-review.md) · [11_TESTING_QA.md](11_TESTING_QA.md) · [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) · [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md) · [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md) · [04_MOTION_ENGINE.md](04_MOTION_ENGINE.md) · [12_INTERACTION_SYSTEM.md](12_INTERACTION_SYSTEM.md) · [13_SHADER_ARCHITECTURE.md](13_SHADER_ARCHITECTURE.md) · [14_PERFORMANCE_STRATEGY.md](14_PERFORMANCE_STRATEGY.md) · [3d-asset-pipeline.md](3d-asset-pipeline.md) · [adr/0002](adr/0002-r3f-architecture.md) · [adr/0003](adr/0003-theme-system.md) · [adr/0006](adr/0006-scene-management-strategy.md)
