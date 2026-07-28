# 27 — RC0 Approval

Release Candidate 0: the final architectural validation before Sprint 2.1. This doc records what RC0's consistency audit and contract validation actually found (Tasks 1-2, see below), the Engineering Scorecard (Task 7), and the final go/no-go declaration (Task 8).

## What RC0's audit actually found

RC0 is only worth doing if it's a genuine adversarial pass, not a rubber stamp — consistent with how [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) and [18_ENGINEERING_CONTRACTS.md](18_ENGINEERING_CONTRACTS.md)'s Review sections were run. A grep-level consistency sweep across every doc in this set found **three real contradictions**, all introduced by drift across the multiple sessions this doc set was authored in, all fixed here:

1. **`IInteractionManager`'s `GestureEvent`/`GestureType` shape had two incompatible definitions** — [12_INTERACTION_SYSTEM.md](12_INTERACTION_SYSTEM.md)'s original (7-value lifecycle `GestureType`, `{x,y}` position, optional `delta`/`pressure`, 5-value `PointerKind` including `gamepad`) versus a drifted restatement in an earlier draft of [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md) (a coarser 4-value `GestureType`, a tuple position, a different `bind()`-pattern call signature). **Resolved**: 22 now restates 12's definition verbatim, with an explicit note that this was corrected during RC0.
2. **The Checkout-completion event had two names** — `order:placed` in [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md)'s scenario 9 versus `checkout:completed` in the actually-frozen [19_EVENT_CATALOG.md](19_EVENT_CATALOG.md). **Resolved**: 15 now uses `checkout:completed`, with a note explaining the correction.
3. **The WebGL-unavailable analytics signal had two names and two naming conventions** — `webgl:unavailable` (colon-namespaced, the EventBus convention) in [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) and [01_ARCHITECTURE.md](01_ARCHITECTURE.md), versus the actually-frozen `webgl_unavailable` (snake_case, the Analytics convention matching `hero_cup_rotated`/`theme_toggled`) in [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md)'s `AnalyticsEvent` union. This one mattered beyond naming — it also blurred the Analytics-vs-EventBus boundary [18_ENGINEERING_CONTRACTS.md](18_ENGINEERING_CONTRACTS.md)'s Review had just drawn. **Resolved**: both references corrected to `webgl_unavailable`, with an explicit note distinguishing it from the separate, real EventBus events `webgl:context-lost`/`webgl:context-restored`.

No other terminology, manager name, folder path, or interface name inconsistency was found across the full doc set (`00`-`26`, all ADRs, the RFC, both roadmap docs, and `3d-asset-pipeline.md`) — folder references (`engine/registry/`, `engine/state/`, `engine/events/`, `engine/interaction/`, `engine/performance/`, etc.), `EffectConfig`, and `MaterialCacheKey` were each spot-checked across every doc that references them and found consistent.

## Contract validation (Task 2)

Cross-checked: every manager interface in [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md) against its usage in [19_EVENT_CATALOG.md](19_EVENT_CATALOG.md), [20_PLUGIN_API.md](20_PLUGIN_API.md), and [21_TEST_STRATEGY.md](21_TEST_STRATEGY.md); every store in [18_ENGINEERING_CONTRACTS.md](18_ENGINEERING_CONTRACTS.md) against its consumers named elsewhere; every graphics/shader contract against [03_3D_ENGINE.md](03_3D_ENGINE.md)/[13_SHADER_ARCHITECTURE.md](13_SHADER_ARCHITECTURE.md)'s original design. Beyond the three fixes above, everything agrees.

## Engineering scorecard (Task 7)

RC0's own bar, distinct from the Creative Director Review's 9.5 gate (which governs *creative* quality and is explicitly still Sprint 2.6's job, not RC0's — nothing here scores visual/motion/emotional quality, since nothing renders yet): **no category below 8.5, zero unresolved contradictions.** Written justification per category, honest about real limitations, not uniformly maximal:

| Category | Score | Justification |
|---|---|---|
| Architecture | 9.5/10 | Registry pattern validated across all 12 [Architecture Freeze](15_ARCHITECTURE_FREEZE.md) scenarios; zero circular dependencies, one explicit rule (Performance Manager one-directionality) preventing the one real risk. Not a 10: two designs are honestly, correctly deferred (scroll/drag coordination, AI data-fetching), not because the architecture can't handle them, but because designing them before their milestone would violate this project's own anti-speculation rule. |
| Documentation | 9.5/10 | 27 docs, every future feature traced ([23_TRACEABILITY_MATRIX.md](23_TRACEABILITY_MATRIX.md)), every doc cross-linked. Not a 10: the three contradictions this RC0 pass found originated *in* the documentation, across sessions — caught before implementation, but their existence is a real (small) process cost worth naming rather than pretending never happened. |
| Contracts | 9.5/10 | Every manager/event/store/plugin contract frozen and typed ([18](18_ENGINEERING_CONTRACTS.md)-[22](22_MANAGER_INTERFACES.md)); the Interaction Manager drift found this cycle is exactly the kind of thing a contract-validation pass exists to catch, and it did, before any code existed to be broken by it. |
| Maintainability | 9/10 | [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md)'s additive-only discipline, validated against 5 concrete extensibility examples. Real, accepted long-term cost: `onBeforeCompile` shader hooks into semi-internal Three.js structure (R-13 in [24_RISK_REGISTER.md](24_RISK_REGISTER.md)) — a deliberate trade-off, not free. |
| Scalability | 9/10 | Demonstrated extension to ingredients, customizer, AI, checkout, day/night without manager changes. Real open question: shadow/GPU cost under high ingredient counts is "monitoring," not proven (R-04) — correctly not claimed as solved before it's tested. |
| Extensibility | 9.5/10 | The architecture's strongest category — validated three separate times (12 scenarios, 5 extensibility examples, the full [Plugin API](20_PLUGIN_API.md)) with consistent results each time. |
| Consistency | 9/10, not higher | Deliberately not a 10: this RC0 pass found and fixed 3 real contradictions across 27 docs. A perfect score would mean none were ever introduced; the honest score reflects that they were, and that the audit process caught them — which is the process working as intended, not evidence it's unnecessary. |
| Readiness | 9.5/10 | Sprint 2.1 has zero blocking prerequisites, explicit exit criteria and rollback strategy per sprint ([25_IMPLEMENTATION_READINESS.md](25_IMPLEMENTATION_READINESS.md)), and [26_API_STABILITY.md](26_API_STABILITY.md) enforces that only Frozen contracts enter Sprint 2. |
| Developer Experience | 9/10 | Functional/hook-based contracts throughout, consistent with the shipped Milestone 1 code style — no new paradigm to learn. Real cost, named honestly: 27 docs is a genuine onboarding load for a new contributor, and shader-as-TS-template-strings (R-14) is an accepted, not free, DX trade-off. |
| Testing Strategy | 9/10 | Per-manager Unit/Integration/Visual/Performance/A11y plan ([21_TEST_STRATEGY.md](21_TEST_STRATEGY.md)), correctly scoped (not forcing tests where they add no signal, per [11_TESTING_QA.md](11_TESTING_QA.md)'s existing philosophy). Not a 10: the strategy is sound but entirely unexecuted — zero tests exist yet, by design, until Sprint 2.6's tooling-installation decision. |

**Every category clears RC0's 8.5 bar.** No category requires an Improvement Loop before Sprint 2.1 — unlike the Creative Director Review's 9.5 gate, which does trigger mandatory iteration below threshold, RC0's job is contradiction-freedom and readiness, both of which are met.

## Final declaration (Task 8)

All three contradictions found by this RC0 pass are resolved above, in documentation only — `git status` confirms zero `src/` changes for the entirety of Sprint 0 and RC0. No contradiction remains unresolved.

**The architecture is frozen.** [16_ENGINEERING_SPRINTS.md](16_ENGINEERING_SPRINTS.md)'s Sprint 2.1 may begin once this document is approved, building only the interfaces marked **Frozen** in [26_API_STABILITY.md](26_API_STABILITY.md).

## A process change, noted for the record

The instruction accompanying RC0 establishes a new default from here forward: **implementation drives documentation, not the reverse.** From Sprint 2.1 onward, docs update to describe what was actually built (matching this project's existing "current state" vs. "target architecture" split in [03_3D_ENGINE.md](03_3D_ENGINE.md)/[04_MOTION_ENGINE.md](04_MOTION_ENGINE.md)), rather than being written ahead of code as this entire RC0/Sprint-0/Architecture-Freeze/RFC sequence has been. No further speculative documentation gets created for unimplemented features unless a specific need arises mid-implementation.

## Related

[15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) · [18_ENGINEERING_CONTRACTS.md](18_ENGINEERING_CONTRACTS.md) · [23_TRACEABILITY_MATRIX.md](23_TRACEABILITY_MATRIX.md) · [24_RISK_REGISTER.md](24_RISK_REGISTER.md) · [25_IMPLEMENTATION_READINESS.md](25_IMPLEMENTATION_READINESS.md) · [26_API_STABILITY.md](26_API_STABILITY.md) · [16_ENGINEERING_SPRINTS.md](16_ENGINEERING_SPRINTS.md)
