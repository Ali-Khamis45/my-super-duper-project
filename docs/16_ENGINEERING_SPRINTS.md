# 16 — Engineering Sprints (Milestone 2)

**Status**: Roadmap only. Not started. Supersedes the checkpoint numbering in [milestone-2-implementation-plan.md](milestone-2-implementation-plan.md) (kept for its dependency reasoning, not as the current build order) — same 12 units of work, regrouped into 6 sprints so each one ships something a user can notice, not just something an architect can verify. Waiting for approval of [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) before Sprint 2.1 begins.

## How this differs from the checkpoint plan

The checkpoints were ordered strictly by dependency, which front-loaded five sprints' worth of invisible plumbing before anything a user could see changed. That's correct for risk management but wrong for morale and for demonstrating value every sprint — hence the **Creative Budget** rule: every sprint below ships at least one thing a user can notice, even the plumbing-heavy ones. Where a sprint's core work is genuinely invisible, the creative budget item is named honestly as a byproduct of that work, not manufactured busywork.

Two items from the checkpoint plan — the Event System (bridge store + EventBus) and the Interaction Manager (gesture recognizer extraction) — aren't named in the sprint categories as originally sketched (Rendering/Asset/Material/Shader/Performance/Integration). They're real, approved, validated architecture (see [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md)'s scenario walkthrough — the EventBus has three confirmed future consumers, the Interaction Manager is what Ingredient Drag & Drop and Coffee Physics both build on). Dropping them silently would lose approved work; inventing a 7th sprint would fragment low-risk, closely-related plumbing. Both are folded into **Sprint 2.1**, where the other foundational, low-risk generalizations already live.

Every sprint ends clean: `npm run build`, `tsc --noEmit`, `eslint` pass, and the hero looks/behaves identically to before unless the sprint's whole point is a visible change.

## Sprint 2.1 — Rendering Core *(complete — see [reviews/sprint-2.1-review.md](reviews/sprint-2.1-review.md))*

| | |
|---|---|
| Builds | Registry generalization (`createPartRegistry`, migrates cup parts onto it) · Camera Manager transitions (path scaffolding deliberately **not** built — deferred to Milestone 6, see the review) · Environment & Lighting Manager split · Effect Manager redesign (discriminated-union `EffectConfig`) · Event System (`createBridgeStore`, `EventBus`) · Interaction Manager foundation (`useGestureRecognizer`, for DOM-native targets; `useCupInteractionState` speaks the same vocabulary but keeps its own R3F-native mechanics — see the review) · Performance Manager foundation · Debug Overlay foundation · Scene composition contract · GPU context-loss recovery |
| Depends on | Nothing outside this sprint — all mechanical generalizations of patterns Milestone 1 already proved |
| Test independently | Hero renders and behaves pixel-/feel-identical before and after (pure refactor); a throwaway second camera preset proves transition interpolation works; drag/touch/keyboard rotation verified in a real browser session, not headless-only, since the Interaction Manager migration is this plan's highest regression-risk item |
| Creative budget | Camera transition easing is visibly smoother than a hard snap the moment a second preset exists to demo it against — a real, demonstrable motion-quality improvement, verified live rather than assumed |
| Scene Manager note | No Scene Manager is built — [ADR-0006](adr/0006-scene-management-strategy.md)'s "routes, not a cross-route scene graph" decision is re-confirmed by the Architecture Freeze's scenario pass (see [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md)) rather than silently dropped |

## Sprint 2.2 — Asset & Resource Platform *(complete — see [reviews/sprint-2.2-review.md](reviews/sprint-2.2-review.md))*

| | |
|---|---|
| Builds | `engine/assets/createResourceManager.ts` (generic resource-lifecycle factory — one owner per resource, per this sprint's explicit rule) · GLB pipeline (`gltfLoader.ts`, `glb.ts` — shared `GLTFLoader` + self-hosted `DRACOLoader`/`MeshoptDecoder`) · Texture pipeline (`textures.ts` — self-hosted `KTX2Loader`, mipmap/anisotropy, validation, theme-aware keys) · Asset manifest (`manifest.ts`) · Quality Tier + Memory Budget integration (`engine/performance/assetQuality.ts`, LRU cache caps reasoned from [14_PERFORMANCE_STRATEGY.md](14_PERFORMANCE_STRATEGY.md)) · 5 new EventBus events |
| Depends on | Sprint 2.1 (Performance Manager's `tier`, EventBus) |
| Test independently | 43 new unit tests (mocked loaders — no real GLB/texture file exists in the repo) covering load/cache-hit/concurrent-dedup/error/timeout/retry/dispose/eviction/hot-replacement for both pipelines |
| Creative budget | **N/A — infrastructure sprint, honestly scored, not inflated.** The originally-sketched "raise the hero's HDRI fidelity" creative-budget item did not happen: this sprint's actual brief was explicitly infrastructure-only ("no Steam... no Storytelling"), which superseded the earlier speculative plan — see the sprint review's Creative Director Review section |

## Sprint 2.3 — Material & Surface Platform *(complete — see [reviews/sprint-2.3-review.md](reviews/sprint-2.3-review.md))*

| | |
|---|---|
| Builds | `engine/materials/createSyncCache.ts` (synchronous sibling of Sprint 2.2's `createResourceManager` — materials are created synchronously, an async cache would break every part component's render contract) · `MaterialFactory.ts` (moved from `engine/graphics/`, extended with `createGlassMaterial`/`createMetalMaterial`) · `presets.ts` (named PBR presets per surface) · `cache.ts` (`getOrCreateMaterial`, dynamic update/dispose/validate/serialize) · `themeBridge.ts` (`resolveEnvMapIntensity` — theme-aware reflection calibration) · all 5 real cup parts migrated onto the cache · Logo Decal Pipeline texture caching · 4 new EventBus events |
| Depends on | Sprint 2.1/2.2 (Performance Manager's `tier`, EventBus, the `createResourceManager` precedent this sprint's sync cache mirrors) |
| Test independently | 29 new unit tests (56 total project-wide including Sprints 2.1/2.2); real cache-hit verification via `vi.fn()` call-count assertions, not just instrumentation logs; hero renders identically apart from the deliberate ceramic/liquid reflection change |
| Creative budget | **Delivered, as originally planned**: ceramic clearcoat/roughness tightened (0.15→0.12 roughness, 0.08→0.05 clearcoatRoughness) and `resolveEnvMapIntensity` calibrates ceramic/liquid reflections per lighting preset instead of a flat multiplier — real visual polish, verified via before/after headless-browser screenshots, not scope creep, since the sprint was already elbow-deep in exactly these materials |

## Sprint 2.4 — Shader & Rendering Pipeline *(complete — see [reviews/sprint-2.4-review.md](reviews/sprint-2.4-review.md))*

| | |
|---|---|
| Builds | Shader Manager (Registry/Factory/Diagnostics/Validation, `engine/shaders/`) · Uniform Manager (shared block, single-owner publishers) · common utilities (noise/hash/fbm, rotation, blending, color space, tone mapping, easing) · placeholder shaders for all 6 named families (Steam — real, wired, replaces the Milestone 1 billboard; Coffee/Foam — shared fresnel rim via `onBeforeCompile`; Glow/Distortion/Particles — registered, zero scene consumer, compile-verified via a dev-only diagnostics probe) · Render Pipeline stage-ownership table · 2 new EventBus events |
| Depends on | Sprint 2.1 (registry pattern, EventBus), Sprint 2.3 (Material Manager's cache factory function, where the fresnel hook is applied) |
| Test independently | 31 new unit tests (116 total project-wide) covering registry/factory/diagnostics/validation/uniform-publishing/fresnel-injection; real compilation verified via a real browser session (zero shader-related console errors across multiple loads) — GLSL compilation itself can't be unit-tested in jsdom, same honest limitation as every prior sprint's WebGL-dependent behavior |
| Creative budget | Steam's noise-based shader is a real, visible improvement over the flat radial-gradient placeholder (organic per-pixel variation vs. a uniform blurred circle) — explicitly *not* the final domain-warped simulation, per this sprint's "do not build final effects" constraint |

## Sprint 2.5 — Runtime Optimization & Adaptive Quality *(complete — see [reviews/sprint-2.5-review.md](reviews/sprint-2.5-review.md))*

| | |
|---|---|
| Builds | `QualityTier` extended 3→5 (`ultra`/`high`/`medium`/`low`/`minimal`) + `QualityMode` (`automatic`/`manual`) · `qualityPolicy.ts` (5-tier policy table — DPR, shadow map, bloom, environment resolution, particle budget; "scale, don't disable," `bloomEnabled: false` only at `minimal`) · `runtimeProfiler.ts` (frozen, single-producer `PerformanceSnapshot`) · `adaptiveQuality.ts` (asymmetric-hysteresis stepping: 3-sample fast downgrade, 10-sample slow upgrade) · `gpuBudget.ts` / `memoryPressure.ts` (budget-crossing and cache-pressure detection) · `PerformanceSampler.tsx` (the always-on, production-mounted sampler that finally feeds all of the above — closing a real gap where adaptive quality never ran outside dev builds) · `useSmoothedValue.ts` (damped bloom-intensity transitions, this sprint's Creative Budget item) · 3 new Production Telemetry Hooks in `eventBridge.ts` · 6 new EventBus events |
| Depends on | Sprints 2.1-2.4 having landed (needs real scene complexity — the steam shader at minimum — for a meaningful budget to test against) |
| Test independently | 30 new unit tests (146 total project-wide) covering the policy table, hysteresis edge cases, GPU budget crossing/reset, and memory pressure combination logic; real-browser CPU-throttle stress test (headless Chrome, 25x throttling via CDP `Emulation.setCPUThrottlingRate`) confirmed the live tier stepping `ultra → high → medium → low → minimal`, one step at a time, matching the fast-downgrade cadence, with exactly one recovery step observed in an 8s post-throttle window, matching the slow-upgrade cadence — see the review for the full trace |
| Creative budget | Delivered: bloom intensity damps toward its tier-driven target (`THREE.MathUtils.damp`, the same technique `CameraRig.tsx` established in Sprint 2.1) instead of snapping on a tier change — a real, verified reduction in visible popping during adaptation, not a new visual flourish |

## Sprint 2.6 — Engine Stabilization & Production Readiness *(complete — see [reviews/sprint-2.6-review.md](reviews/sprint-2.6-review.md))*

| | |
|---|---|
| Builds | The actual brief received at sprint start superseded this row's original sketch (below) — implementation drives docs, per the RC0-era process change. Real work: Engine Integration Audit (found and fixed a real Analytics-activation coupling bug) · Playwright installed as this sprint's cross-browser/visual-regression tooling decision ([11_TESTING_QA.md](11_TESTING_QA.md)) — `e2e/stabilization.spec.ts` + `e2e/long-running.spec.ts`, 36 tests × 3 engines · Engine Health Dashboard (`engine/devpanel/engineHealth.ts` + `EngineHealthPanel.tsx`) · additive `size`/`hits`/`misses` instrumentation on `createResourceManager`/`createSyncCache`, `getEmitCount()` on `EventBus` · real-browser memory/GPU/context-recovery/accessibility verification · Creative Budget: a fade instead of an instant pop on WebGL context-loss recovery |
| **Not built this sprint, despite this row's original sketch**: Day/night lighting content and a second Creative Director Review. The received brief was explicit ("No new rendering features. No new shaders. No new visual systems. Only stabilization.") and superseded the earlier speculative plan — the same category of honest deviation as Sprint 2.2's infrastructure-only scope. Both remain real, pending work for a future sprint. | |
| Depends on | Sprints 2.1-2.5 having landed (an integration audit needs real integrated systems to audit) |
| Test independently | Full serial Playwright run (`--workers=1`): 31 passed, 5 documented skips, zero failures; CPU-throttle stress test reproduces Sprint 2.5's exact tier sequence with no drift; `tsc`/`eslint`/`vitest`(150)/`build` all clean |
| Creative budget | Delivered: the WebGL context-loss fallback now fades via the existing `fadeIn` preset instead of popping instantly — small, verified, explicitly polish-only per this sprint's "no new visual systems" constraint |

## Open item: day/night lighting content

Real day/night `EnvironmentPresetDefinition`/`LightingPresetDefinition` entries (the registries Sprint 2.1 built, still populated with placeholder presets only) and a second Creative Director Review were this row's original Sprint 2.6 sketch — not built there, since the brief actually received for that sprint was stabilization-only (see Sprint 2.6's row above). The user's Sprint 2.6 brief separately described the engine as "feature-complete for Phase 2" and gated next steps on Milestone 3 approval, which may mean this item is intentionally deferred past Milestone 2 rather than scheduled as a near-term "Sprint 2.7" — left here as an open item rather than presumed into a numbered future sprint, pending the user's actual next brief.

## Related

[15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) · [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md) · [milestone-2-architecture-rfc.md](milestone-2-architecture-rfc.md) · [milestone-2-implementation-plan.md](milestone-2-implementation-plan.md) · [08_MILESTONES.md](08_MILESTONES.md) · [09_CREATIVE_DIRECTOR_REVIEW.md](09_CREATIVE_DIRECTOR_REVIEW.md)
