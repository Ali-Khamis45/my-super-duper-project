# 25 — Implementation Readiness

RC0 deliverable. For each of [16_ENGINEERING_SPRINTS.md](16_ENGINEERING_SPRINTS.md)'s 6 sprints: Prerequisites, Deliverables, Exit criteria, Verification steps, Rollback strategy, Dependencies. Where 16 already states Builds/Depends on/Test independently, this doc adds the two things it didn't cover — hard exit criteria and rollback — rather than repeating the rest.

## Rollback strategy, the general case

Every sprint below is additive and backward-compatible by construction — the entire point of [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md) is that nothing in Milestone 2 changes an existing public contract. That means rollback never needs a feature flag or a staged migration: **reverting the sprint's commits is sufficient**, because nothing downstream depends on the new code existing until a *later* sprint explicitly builds on it, and nothing existing was modified in a way later code assumes. This is stated once here rather than repeated per sprint, with only genuine exceptions called out below.

## Sprint 2.1 — Rendering Core

| | |
|---|---|
| Prerequisites | RC0 approval (this doc set); no tooling gap — everything built here uses dependencies already installed since the Milestone 1 scaffold |
| Deliverables | `createPartRegistry`, `CameraRig` transitions/paths, Environment/Lighting split, `EffectConfig` redesign, `createBridgeStore`/`EventBus`, `useGestureRecognizer` |
| Exit criteria | `tsc`/`eslint`/`build` clean; hero renders and *feels* identical to pre-sprint (drag/touch/keyboard rotation manually verified in a real browser, not headless-only, per the regression-risk note carried over from the old checkpoint plan); a throwaway second camera preset demonstrates transition interpolation, then is removed before merge |
| Verification steps | Manual interaction pass (the highest-regression-risk item in this plan) + automated `tsc`/`eslint`/`build` + visual spot-check in both themes |
| Rollback | General case applies. One nuance: `useCupInteractionState`'s migration onto `useGestureRecognizer` touches a hand-tuned feel (drag sensitivity, inertia) — if reverted, re-verify the reverted state still matches Milestone 1's original feel exactly, since a partial revert could leave sensitivity constants mismatched between the old and new code paths |
| Dependencies | None outside this sprint |

## Sprint 2.2 — Asset System

| | |
|---|---|
| Prerequisites | Sprint 2.1 merged (not functionally required, but sequenced after it per [16_ENGINEERING_SPRINTS.md](16_ENGINEERING_SPRINTS.md)) |
| Deliverables | Shared `GLTFLoader`+`DRACOLoader`+`MeshoptDecoder`, KTX2 policy enforcement, HDR pipeline formalization, streaming/lazy-loading conventions |
| Exit criteria | Loader initializes without throwing against a throwaway test asset; no real production asset depends on this yet, so "exit" means the machinery is provably correct, not that a real GLB loads — that's R-07 in [24_RISK_REGISTER.md](24_RISK_REGISTER.md), explicitly deferred until a real asset exists |
| Verification steps | Unit test against a throwaway `.glb`; confirm `public/draco/` decoder assets are present and self-hosted, not CDN-referenced |
| Rollback | General case applies — zero real assets depend on this sprint yet, so reverting has no cascading effect |
| Dependencies | None functional; sequenced after 2.1 |

## Sprint 2.3 — Material System

| | |
|---|---|
| Prerequisites | None beyond Sprint 0's frozen `MaterialCacheKey` contract |
| Deliverables | LRU-evicted material/texture cache, Theme Bridge formalization, dynamic material update flow |
| Exit criteria | Hero renders identically; a temporary instrumentation log (removed before merge) confirms cache hits return the same instance; no unbounded growth in a scripted repeat-request test |
| Verification steps | The instrumentation-log check above, plus the "switch color 200 times" soak test from [21_TEST_STRATEGY.md](21_TEST_STRATEGY.md) — run even though no real customizer consumes it yet, since the cache mechanism itself is what's being verified |
| Rollback | General case applies |
| Dependencies | None |

## Sprint 2.4 — Shader Infrastructure

| | |
|---|---|
| Prerequisites | Sprint 2.1 (registry consistency) and 2.2 (asset/shader scaffolding pattern) merged |
| Deliverables | `engine/shaders/common/`, the real steam shader replacing the billboard placeholder |
| Exit criteria | Direct visual comparison against both the Milestone 1 placeholder and the specific CDR critique it addresses; FPS budget from [14_PERFORMANCE_STRATEGY.md](14_PERFORMANCE_STRATEGY.md) holds; reduced-motion still disables it exactly as before |
| Verification steps | Manual visual comparison (headless capture has documented flakiness for this project — see the Milestone 1 CDR precedent, real-browser verification preferred); dev-panel FPS spot-check |
| Rollback | **Exception to the general case**: this sprint *replaces* the billboard placeholder rather than purely adding to it. Rollback means reverting to the placeholder, which is a real, tested, working state (not a gap) — safe, but not a no-op the way other sprints' rollbacks are, since a partial revert leaves the R-16 low-tier-fallback design ([24_RISK_REGISTER.md](24_RISK_REGISTER.md)) without its shader-tier alternative to fall back *from* |
| Dependencies | Sprint 2.1, 2.2 |

## Sprint 2.5 — Performance

| | |
|---|---|
| Prerequisites | Sprints 2.1-2.4 landed — needs real scene complexity (the steam shader, at minimum) for a meaningful performance budget to test against |
| Deliverables | Adaptive quality tiers, production FPS sampling (distinct from the dev-only panel collector), GPU budget enforcement, debug overlay tier display |
| Exit criteria | Chrome DevTools CPU throttling (4×-6×) forces a sustained low-FPS session; tier steps down exactly once, never thrashes, never auto-recovers mid-session |
| Verification steps | The throttling test above, run in a real browser session per [16_ENGINEERING_SPRINTS.md](16_ENGINEERING_SPRINTS.md) |
| Rollback | General case applies — the tier system is purely additive; without it, the scene simply always renders at its highest tier (today's Milestone 1 behavior), not a broken state |
| Dependencies | Sprints 2.1-2.4 |

## Sprint 2.6 — Integration & QA

| | |
|---|---|
| Prerequisites | Everything above merged |
| Deliverables | Day/night lighting pass (real presets populating Sprint 2.1's registries), integration testing, the Vitest/Playwright installation decision, performance validation, full accessibility pass, second Creative Director Review |
| Exit criteria | CDR pass across all 4 UI-theme × lighting-preset combinations scores ≥9.5 per [09_CREATIVE_DIRECTOR_REVIEW.md](09_CREATIVE_DIRECTOR_REVIEW.md)'s existing gate; full engineering review (dead code, dependency direction, a11y, docs-vs-code accuracy) clean, matching the [Milestone 1 stabilization review](reviews/milestone-1-stabilization-review.md)'s bar |
| Verification steps | The CDR process itself, plus the engineering review checklist already proven in Milestone 1 |
| Rollback | Day/night presets are additive registry entries (general case). If the CDR pass fails a category, that category's fix is scoped and re-reviewed — not a rollback of the whole sprint, matching Milestone 1's "Improvement Loop" precedent |
| Dependencies | All prior sprints |

## Related

[16_ENGINEERING_SPRINTS.md](16_ENGINEERING_SPRINTS.md) · [24_RISK_REGISTER.md](24_RISK_REGISTER.md) · [09_CREATIVE_DIRECTOR_REVIEW.md](09_CREATIVE_DIRECTOR_REVIEW.md) · [26_API_STABILITY.md](26_API_STABILITY.md)
