# Engine v1.0

This tag (`v1.0.0-engine`) marks the coffee-shop 3D engine's Phase 2 buildout — Sprints 2.1 through 2.6 — as feature-complete and production-hardened. It covers `engine/` only: rendering, assets, materials, shaders, runtime optimization, and the debug/diagnostics layer. It does **not** cover product features (customizer, ingredient physics, AI barista, commerce, audio) or Milestone 2's day/night lighting content, which remains a separate, open item — see [Known Limitations](#known-limitations).

Each section below corresponds to one sprint; full detail, reasoning, and honest retrospectives live in that sprint's review under `docs/reviews/`.

## Rendering Core — Sprint 2.1

[Review](docs/reviews/sprint-2.1-review.md)

- `createPartRegistry` — the name-keyed registration pattern every subsequent "one convention, multiple applications" factory (resource manager, sync cache, shader registry) followed.
- `createBridgeStore` / `createEventBus` (`engine/state/`, `engine/events/`) — the write-here-drain-there continuous-state pattern, and the synchronous, typed, in-subscription-order EventBus for discrete cross-manager events.
- Camera Manager (`engine/camera/`) — preset registry + transition interpolation; only `hero` registered, other preset names typed for future milestones.
- Environment/Lighting Manager split, Effect Manager (`EffectConfig` discriminated union), Interaction Manager foundation (`useGestureRecognizer`), Performance Manager foundation, Debug Overlay foundation, Scene Composition contract, GPU context-loss recovery (`useWebGLContextRecovery`).

## Resource Platform — Sprint 2.2

[Review](docs/reviews/sprint-2.2-review.md)

- `createResourceManager` — the generic async resource-lifecycle factory (load/retry/preload/replace/dispose/clear, LRU-capped, dedup-on-concurrent-load).
- GLB pipeline (`gltfLoader.ts`, `glb.ts`) — shared `GLTFLoader` + self-hosted `DRACOLoader`/`MeshoptDecoder`; never throws to its caller, resolves to a fallback status instead.
- Texture pipeline (`textures.ts`) — self-hosted `KTX2Loader`, tier-aware anisotropy/mipmaps, theme-scoped cache keys.
- Asset manifest and Quality Tier/Memory Budget integration (`engine/performance/assetQuality.ts`).

## Material Platform — Sprint 2.3

[Review](docs/reviews/sprint-2.3-review.md)

- `createSyncCache` — the synchronous sibling of the resource manager, for materials created inline inside `useMemo` rather than fetched.
- `MaterialFactory.ts` (`createCeramicMaterial`/`createLiquidMaterial`/`createFoamMaterial`/`createSleeveMaterial`/`createLidMaterial`, plus `createGlassMaterial`/`createMetalMaterial` ahead of a current consumer), `presets.ts`, `cache.ts` (`getOrCreateMaterial`, validation with clamped fallback, in-place update, dispose).
- `themeBridge.ts` — `resolveEnvMapIntensity` (theme-aware reflection calibration), `resolveMaterialContext`.
- All 5 real cup materials (ceramic/sleeve/lid/liquid/foam) migrated onto the cache.

## Shader Pipeline — Sprint 2.4

[Review](docs/reviews/sprint-2.4-review.md)

- Shader Manager (`engine/shaders/`) — Registry/Factory (`unlit` vs `physically-lit` discriminated shader definitions), Diagnostics (doubling as the shader cache — per-definition compile state, not per-instance GPU resources), structural Validation, versioned hot reload.
- Uniform Manager (`common/uniforms.ts`) — one shared uniform block, named `publish*` functions as the only writers.
- Common GLSL utilities — noise/hash/FBM, rotation, blending, color space, tone mapping, easing.
- Real shaders: Steam (wired, replaces the Milestone 1 billboard), Coffee/Foam (shared fresnel rim via `onBeforeCompile`), Glow/Distortion/Particles (registered, compile-verified, no scene consumer yet).

## Runtime Optimization — Sprint 2.5

[Review](docs/reviews/sprint-2.5-review.md)

- `QualityTier` (`ultra`/`high`/`medium`/`low`/`minimal`) + `QualityMode` (`automatic`/`manual`).
- `qualityPolicy.ts` — per-tier DPR/shadow-map/bloom/environment-resolution/particle-budget table; "scale, don't disable" (`bloomEnabled: false` at exactly one tier).
- `runtimeProfiler.ts` — frozen, single-producer `PerformanceSnapshot`.
- `adaptiveQuality.ts` — asymmetric-hysteresis stepping (fast downgrade, slow upgrade), verified live against real CPU-throttled frame rates, not just unit-tested.
- `gpuBudget.ts` / `memoryPressure.ts` — budget-crossing and cache-pressure detection.
- `PerformanceSampler.tsx` — the always-on, production-mounted sampler that closed a real gap (adaptive quality previously never ran outside dev builds).
- Damped bloom-intensity transitions on tier change (`useSmoothedValue.ts`).

## Production Hardening — Sprint 2.6

[Review](docs/reviews/sprint-2.6-review.md)

- Engine Integration Audit — found and fixed a real bug: Analytics's EventBus subscriptions only activated because a hero-cup-specific hook happened to import the module; moved activation to the app root (`app/providers.tsx`).
- Playwright cross-browser/visual-regression suite (Chromium/Firefox/WebKit) — 36 e2e tests, committed screenshot baselines.
- Engine Health Dashboard (`engine/devpanel/engineHealth.ts`) — live frame time/draw calls/triangles/texture-material-model counts/shader compile state/cache hit ratio/quality tier/GPU texture count/event throughput, correctly placed in the Debug Layer to respect one-directionality.
- Additive `size`/`hits`/`misses` on both cache factory families, `EventBus.getEmitCount()`.
- Verified: zero performance regression against Sprint 2.5's baseline, real GPU-resource disposal at every cache eviction path, WebGL context-loss recovery under simulated real context loss, no server-bundle leakage of `three`/R3F.
- Creative Budget: WebGL context-loss fallback fades instead of popping instantly.

## Known Limitations

- **Safari**: no real macOS/Safari testing exists or is possible in this environment — WebKit via Playwright is the closest available proxy. A confirmed, documented Safari platform quirk (links excluded from the default Tab order) is not an app bug and is not "fixed."
- **Screen readers**: no real assistive-technology pass has been run; ARIA role/label structure is verified programmatically, which is a proxy, not a substitute.
- **Long-running soak**: the 30-minute idle scenario was scaled to 20 seconds for session-time reasons; a real unattended soak is recommended as a scheduled/nightly job, not yet run.
- **Repeated camera transitions / asset disposal**: no real feature surface exists yet to stress — only one camera preset (`hero`) is registered, and no real `.glb`/texture files exist anywhere in `public/`.
- **Dependency vulnerabilities**: `npm audit` flags 3 high-severity CVEs, all transitive inside Next.js's own bundled `postcss`/`sharp`. Confirmed unreachable in this app's actual usage (no `next/image` import anywhere, all processed CSS is first-party). No fix is available short of a major Next.js downgrade; tracked for the next routine Next.js version bump.
- **Visual regression determinism**: the Playwright visual-regression project is 100% deterministic run serially or in isolation; running the full suite in parallel on a single dev machine occasionally shows timing-sensitive flakiness from real resource contention, not app behavior.
- **Day/night lighting**: the Environment/Lighting Manager registries (Sprint 2.1) are still populated with placeholder presets only — real day/night content was sketched for a future sprint but not built as part of this engine tag.
- **No manual quality-tier picker**: `QualityMode`'s `"manual"` value is typed and load-bearing in `adaptiveQuality.ts`'s logic, but no UI ever sets it — quality is always automatic today.

## Future Extension Points

- `engine/shaders/{glow,distortion,particles}` — registered, compile-verified `unlit` shader definitions with zero scene consumer.
- `engine/materials`'s `createGlassMaterial`/`createMetalMaterial` — zero current cup-part consumer.
- `engine/interaction/useGestureRecognizer` — DOM-native Pointer Events gesture recognition, awaiting the first DOM-native interactive control (the cup itself uses R3F raycasting, not this hook).
- `engine/camera`'s `CameraPresetName` — `product`/`checkout`/`ai`/`ingredient`/`exploded` are typed, unregistered; path/transition scaffolding is deferred to Milestone 6.
- `performanceManager.mode`'s `"manual"` tier — awaiting a settings UI to ever write it.
- `registerDevPanel` — a live material/lighting tweak panel is a named future consumer; library choice deliberately undecided.
- `engine/shaders/common/uniforms.ts`'s `uStorytellingProgress`/`uPhysicsIntensity` — typed, unpublished, awaiting Milestone 6/3.
- Environment/Lighting Manager — real day/night preset population.

## Related

[docs/16_ENGINEERING_SPRINTS.md](docs/16_ENGINEERING_SPRINTS.md) · [docs/17_ZERO_REWRITE_POLICY.md](docs/17_ZERO_REWRITE_POLICY.md) (governs this engine's public API stability from here forward) · [docs/reviews/](docs/reviews/)
