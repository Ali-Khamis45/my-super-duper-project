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

## Sprint 2.4 — Shader Infrastructure

| | |
|---|---|
| Builds | Common shader utilities (`engine/shaders/common/`: `noise.ts`, `remap.ts`, `uniforms.ts`) · **Steam** shader (`engine/shaders/steam/`, full implementation — Milestone 2's headline feature, replacing the billboard placeholder) · Foam/Coffee **base** scaffolding only (shared utilities both will consume in Milestone 3 — not full foam/coffee shader implementations, which stay Milestone 3 per [08_MILESTONES.md](08_MILESTONES.md)) |
| Depends on | Sprint 2.1 (registry, for consistency) and 2.2 (asset/shader scaffolding pattern) |
| Test independently | Direct visual comparison against the Milestone 1 placeholder and against the specific Milestone 1 CDR critique ("steam isn't very visible/convincing"); FPS budget check against [14_PERFORMANCE_STRATEGY.md](14_PERFORMANCE_STRATEGY.md); reduced-motion still disables it exactly as before |
| Creative budget | The steam shader itself — no byproduct needed, this sprint's core work *is* the visible improvement |

## Sprint 2.5 — Performance

| | |
|---|---|
| Builds | Adaptive quality tiers (Performance Manager, production FPS sampling distinct from the dev-only panel collector) · GPU budgets enforced against [14_PERFORMANCE_STRATEGY.md](14_PERFORMANCE_STRATEGY.md) · Debug overlay extension (existing `DevPanel` gains tier display) · Performance profiling conventions |
| Depends on | Sprints 2.1-2.4 having landed (needs real scene complexity — the steam shader at minimum — for a meaningful budget to test against) |
| Test independently | Chrome DevTools CPU throttling forces a sustained low-FPS session; tier steps down exactly once, doesn't thrash, doesn't auto-recover mid-session |
| Creative budget | Framed honestly as UX smoothness rather than a new visual flourish: lower-end devices get a genuinely better experience (steam degrading gracefully to the retained Milestone 1 technique, per [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) scenario 12) instead of stuttering — a real, noticeable improvement for a real class of users, which counts |

## Sprint 2.6 — Integration & QA

| | |
|---|---|
| Builds | Day/night lighting pass (populates the Sprint 2.1 Environment/Lighting registries with real presets — Milestone 2's other headline feature) · Integration testing pass · Visual regression tooling decision (evaluate whether this is the point [11_TESTING_QA.md](11_TESTING_QA.md)'s target Playwright stack finally gets installed — decided at sprint start based on what shipped, not pre-committed here) · Performance validation against Sprint 2.5's budgets · Full accessibility pass · Second Creative Director Review |
| Depends on | Everything above |
| Test independently | A CDR-style pass across every UI-theme × lighting-preset combination (4 minimum); the full engineering review (dead code, dependency direction, a11y, docs-vs-code accuracy) exactly as [reviews/milestone-1-stabilization-review.md](reviews/milestone-1-stabilization-review.md) did for Milestone 1 |
| Creative budget | Day/night lighting is this sprint's (and arguably the milestone's) other headline visible feature, alongside whatever the CDR pass itself surfaces and fixes |

## Related

[15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) · [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md) · [milestone-2-architecture-rfc.md](milestone-2-architecture-rfc.md) · [milestone-2-implementation-plan.md](milestone-2-implementation-plan.md) · [08_MILESTONES.md](08_MILESTONES.md) · [09_CREATIVE_DIRECTOR_REVIEW.md](09_CREATIVE_DIRECTOR_REVIEW.md)
