# 24 — Risk Register

RC0 deliverable. Twenty concrete risks across the ten required categories, each with Probability/Impact rated Low/Medium/High (not a numeric score — this project is too early for false precision), a real mitigation (not "we'll be careful"), an owner (a role, since this isn't a staffed team yet), and current status. Reviewed again at the end of every future sprint/milestone per [16_ENGINEERING_SPRINTS.md](16_ENGINEERING_SPRINTS.md)'s Sprint 2.6 integration pass, not written once and forgotten.

## Performance

| ID | Description | Probability | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|
| R-01 | Steam shader's per-fragment domain-warped noise exceeds the mobile GPU budget in [14_PERFORMANCE_STRATEGY.md](14_PERFORMANCE_STRATEGY.md) | Medium | Medium — janky hero on low-end phones | Tier-based fallback to the retained Milestone 1 billboard technique, orthogonal to asset source (see [03_3D_ENGINE.md](03_3D_ENGINE.md)); FPS budget check is an explicit Sprint 2.4 exit criterion | 3D/Graphics Engineer | Mitigated at design level; verification pending Sprint 2.4 |
| R-02 | Adaptive quality tier thrashes (rapid up/down steps), a worse experience than a fixed lower tier | Low | Medium | `IPerformanceManager`'s frozen contract explicitly forbids auto-stepping up mid-session — [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md) | Performance Engineer | Mitigated |

## GPU

| ID | Description | Probability | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|
| R-03 | Lost GPU context (driver crash, tab backgrounding) leaves the canvas frozen/black with no handling | Low-Medium | High — reads as a broken page, no error surfaced | `webglcontextlost`/`restored` handling specified in [03_3D_ENGINE.md](03_3D_ENGINE.md)'s Robustness section, found during the Architecture Freeze | 3D Engineer | Mitigated at design level; implementation pending Sprint 2.1/2.2 |
| R-04 | Shadow-casting cost grows unmanageably as ingredient count increases (Milestone 5) | Medium | Medium | Real-time shadows reserved for the hero object only; secondary objects use `<ContactShadows>` or none — policy already in [03_3D_ENGINE.md](03_3D_ENGINE.md) | 3D Engineer | Monitoring — policy exists, not yet stress-tested against real ingredient counts |

## Memory

| ID | Description | Probability | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|
| R-05 | Long customizer sessions leak GPU-resident materials/textures despite the LRU cache (cache-correctness bugs are easy to introduce) | Medium | Medium — degraded performance over a long session, not a crash | Capped LRU cache + explicit `disposeUnusedMaterials()` sweep on route exit; soak-tested by the "switch color 200 times" test in [21_TEST_STRATEGY.md](21_TEST_STRATEGY.md) | Graphics Engineer | Open — mitigation designed, not implemented or tested yet |
| R-06 | No reliable cross-browser memory-pressure API exists, so true OOM risk on very low-end devices can't be directly detected | Low | High — worst case is a tab crash/reload | Indirect detection via FPS degradation (Performance Manager); prevention-first design (caps) rather than reactive detection — documented as an accepted limitation in [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md)'s failure-mode table | Performance Engineer | Accepted — no better mitigation exists platform-wide; monitored via the FPS proxy |

## Asset pipeline

| ID | Description | Probability | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|
| R-07 | Draco/KTX2/Meshopt conventions are decided on paper against zero real assets — an export-tool quirk could surface only once a real GLB exists | Medium | Low-Medium — would surface early (Sprint 2.2's own verification), not late in a real feature | Sprint 2.2 explicitly tests the loader machinery against a throwaway test asset before anything real depends on it — [16_ENGINEERING_SPRINTS.md](16_ENGINEERING_SPRINTS.md) | 3D Engineer / Technical Artist | Open, scheduled for Sprint 2.2 |
| R-08 | Self-hosted Draco decoder / KTX2 transcoder WASM adds network weight once real GLBs ship | High (inherent to the approach) | Low — loaded once, cached, only when a real GLB is actually requested | Already the documented default (self-hosted, not CDN; lazy `KTX2Loader` construction) — [ADR-0009](adr/0009-asset-compression-pipeline.md) | Performance Engineer | Accepted trade-off |

## Accessibility

| ID | Description | Probability | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|
| R-09 | A future interactive object ships without its keyboard equivalent, repeating the exact gap that motivated the Interaction Manager in the first place | Medium — this already happened once, under real deadline pressure | High — a real WCAG violation and user exclusion, not a cosmetic gap | [12_INTERACTION_SYSTEM.md](12_INTERACTION_SYSTEM.md)'s explicit rule ("every gesture ships its keyboard equivalent from the start"), enforced via the accessibility column in [21_TEST_STRATEGY.md](21_TEST_STRATEGY.md) for every new interactive feature | Accessibility / Frontend Engineer | Mitigated at the policy level; requires discipline at each future implementation — an ongoing risk, not a one-time fix |
| R-10 | Reduced-motion's "disable outright, don't downgrade" policy gets applied inconsistently as more contributors/sprints add animation modules | Medium | Medium | Policy stated once in [04_MOTION_ENGINE.md](04_MOTION_ENGINE.md), re-verified at every milestone's engineering review — the Milestone 1 stabilization pass is the precedent | Accessibility Engineer | Monitoring |

## Animation

| ID | Description | Probability | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|
| R-11 | GSAP ScrollTrigger + Lenis + R3F's own `useFrame` loop desync or jank if the single-ticker wiring isn't followed exactly (a known common integration mistake in the wider ecosystem) | Medium | Medium — visible scroll jank | Exact wiring already documented in [04_MOTION_ENGINE.md](04_MOTION_ENGINE.md) (`gsap.ticker` as sole driver, `lagSmoothing(0)`); explicit Sprint 2.6 test coverage | Motion Engineer | Mitigated at design level; verification pending Milestone 6 |
| R-12 | Coffee/foam's spring-damper "cosmetic wobble" (deliberately not a real physics engine) reads as unconvincing once actually built | Medium — a creative-quality risk, not a technical one | Medium — needs a CDR-driven iteration, not a rebuild | Expectations set correctly from the start ("cosmetic wobble, not fluid dynamics" — [04_MOTION_ENGINE.md](04_MOTION_ENGINE.md)); the CDR gate ([09_CREATIVE_DIRECTOR_REVIEW.md](09_CREATIVE_DIRECTOR_REVIEW.md)) exists specifically to catch and iterate on exactly this before shipping | Creative Director / Motion Engineer | Accepted — the CDR process is the designed mitigation, not a guarantee of first-try success |

## Shader complexity

| ID | Description | Probability | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|
| R-13 | `onBeforeCompile`-based coffee/foam shaders break silently on a future Three.js version bump (hooks into internal shader-chunk structure, not a fully stable public API) | Low-Medium | High if it happens — a silent visual regression, hard to detect without a diff | [21_TEST_STRATEGY.md](21_TEST_STRATEGY.md)'s Playwright visual regression would catch this on any dependency bump; [ADR-0008](adr/0008-shader-authoring-approach.md) already documents this as an accepted trade-off | Shader Engineer | Accepted, monitored via visual regression once that tooling exists (Sprint 2.6) |
| R-14 | Turbopack's still-maturing GLSL tooling ecosystem makes the "template strings, not `.glsl` files" decision a growing productivity tax as shader count grows (Milestone 2 → 5 families) | Medium | Low — a DX cost, not a functional risk; string-based shaders still work correctly | [ADR-0008](adr/0008-shader-authoring-approach.md) explicitly frames this as reconsiderable later; `common/` utilities already reduce duplication within the current approach | 3D Engineer | Accepted trade-off, revisit trigger documented in the ADR |

## Mobile

| ID | Description | Probability | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|
| R-15 | Touch-drag thresholds tuned for the cup (Milestone 1) may not generalize to ingredient drag-and-drop's smaller targets/precise drop zones | Medium | Medium — a real usability risk on the highest-friction future interaction | Interaction Manager's generic recognizer supports a per-consumer configurable drag-start threshold ([12_INTERACTION_SYSTEM.md](12_INTERACTION_SYSTEM.md)) — the mechanism exists; the actual tuning is Milestone 5 work | Interaction/UX Engineer | Open, scheduled for Milestone 5 |
| R-16 | The low-tier steam fallback (Milestone 1's billboard technique) needs re-evaluation as a *permanent* mobile-tier experience, not a temporary whole-project placeholder — the quality bar differs | Medium | Low-Medium — a polish gap, not a functional bug | Sprint 2.6's CDR pass explicitly evaluates the low-tier fallback, not just the high-tier shader | Creative Director | Open, flagged for Sprint 2.6 |

## Browser compatibility

| ID | Description | Probability | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|
| R-17 | KTX2/Basis Universal transcoding support varies by browser/GPU (relies on WebGL extensions, not universal) | Low, broad support today | Medium | Already covered by the general "missing textures" failure mode in [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) — a failed transcode degrades through the same fallback path, no special-case handling needed | 3D Engineer | Mitigated by an existing, general mechanism |
| R-18 | Safari's historically slower WebGL2/extension adoption could affect steam shader features if it ends up depending on a non-universal extension | Low | Medium | Steam's design ([13_SHADER_ARCHITECTURE.md](13_SHADER_ARCHITECTURE.md)) uses standard, widely-supported techniques with no exotic extension identified — a check to perform during Sprint 2.4 implementation, not a known blocker | 3D Engineer | Monitoring |

## Technical debt

| ID | Description | Probability | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|
| R-19 | Two roadmap documents existed simultaneously ([milestone-2-implementation-plan.md](milestone-2-implementation-plan.md)'s 12 checkpoints and [16_ENGINEERING_SPRINTS.md](16_ENGINEERING_SPRINTS.md)'s 6 sprints) — a future contributor could follow the stale one | Medium — self-inflicted by this project's own iterative planning | Low — cross-referenced docs would surface the conflict quickly, not silently | Already fixed: the checkpoint plan's status line explicitly marks it superseded and points to the sprint plan | Docs maintainer | Mitigated |
| R-20 | AI Barista's data-fetching convention (query keys, loading/error state ownership) is a known, deferred gap, not yet designed | Certain — a known gap, not a probabilistic risk | Low if addressed at Milestone 7 as planned; Medium if skipped under deadline pressure and improvised badly | Explicitly flagged in [08_MILESTONES.md](08_MILESTONES.md)'s Milestone 7 entry as a required short design pass before that milestone's implementation | Architect (Milestone 7's design lead) | Open, scheduled |

## Related

[15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) · [14_PERFORMANCE_STRATEGY.md](14_PERFORMANCE_STRATEGY.md) · [23_TRACEABILITY_MATRIX.md](23_TRACEABILITY_MATRIX.md) · [25_IMPLEMENTATION_READINESS.md](25_IMPLEMENTATION_READINESS.md)
