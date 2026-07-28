# 08 — Milestones

The Readme.md spec's 24 phases, grouped into shippable milestones. Each milestone ends with the engineering review + Creative Director Review described in [09_CREATIVE_DIRECTOR_REVIEW.md](09_CREATIVE_DIRECTOR_REVIEW.md). Milestones get their own detailed plan when they start, informed by what the previous one actually taught us — Milestone 1's is the shipped implementation; Milestone 2's is a full architecture/design phase completed *before* implementation (see [milestone-2-architecture-rfc.md](milestone-2-architecture-rfc.md)), stress-tested against twelve future scenarios before implementation begins (see [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md)), specifically so the engine layer doesn't need structural rework across Milestones 3–10 — a constraint now formalized as [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md), binding on every milestone below, not just Milestone 2's own output.

## Milestone 1 — Foundation + Hero *(current)*

Governance docs (this set), design system + tokens, the `engine/` layer (motion, theme, graphics, camera, effects, analytics, dev panel — scoped to what the hero uses), navigation, and a full-viewport hero with a live procedural R3F coffee cup (idle float, natural rotation, mouse parallax, touch drag, PBR materials, HDRI lighting, shadows, bloom). Placeholder-tier steam (billboarded planes). No customizer, no liquid physics, no commerce, no audio.

## Milestone 2 — Steam & Lighting Depth *(RC0 approved, implementation in progress — Sprint 2.1 + 2.2 + 2.3 + 2.4 + 2.5 complete)*

Real steam: shader-based simulation replacing the billboard placeholder (`engine/shaders/steam/`). Independent day/night lighting axis, decoupled from light/dark UI theme (`engine/environment/`, `engine/lighting/`). Full engine-layer generalization (registry, camera transitions/paths, material/texture caching, effect manager redesign, interaction manager, asset-loader machinery) happens in this milestone too — not because those features need it yet, but because doing it now is what lets Milestones 3–10 add features by populating registries instead of restructuring the engine. Full design: [milestone-2-architecture-rfc.md](milestone-2-architecture-rfc.md), [03_3D_ENGINE.md](03_3D_ENGINE.md), [04_MOTION_ENGINE.md](04_MOTION_ENGINE.md), [12_INTERACTION_SYSTEM.md](12_INTERACTION_SYSTEM.md), [13_SHADER_ARCHITECTURE.md](13_SHADER_ARCHITECTURE.md), [14_PERFORMANCE_STRATEGY.md](14_PERFORMANCE_STRATEGY.md). Stress-tested against twelve future-milestone scenarios, a dependency graph, and nine failure modes before being frozen: [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md). Every manager's public interface, the full event catalog, the plugin registration API, and the test strategy are frozen ahead of implementation too (Sprint 0): [18_ENGINEERING_CONTRACTS.md](18_ENGINEERING_CONTRACTS.md), [19_EVENT_CATALOG.md](19_EVENT_CATALOG.md), [20_PLUGIN_API.md](20_PLUGIN_API.md), [21_TEST_STRATEGY.md](21_TEST_STRATEGY.md), [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md). Final validation pass (RC0) — consistency audit, traceability matrix, risk register, implementation readiness, API stability, engineering scorecard: [27_RC0_APPROVAL.md](27_RC0_APPROVAL.md), [23_TRACEABILITY_MATRIX.md](23_TRACEABILITY_MATRIX.md), [24_RISK_REGISTER.md](24_RISK_REGISTER.md), [25_IMPLEMENTATION_READINESS.md](25_IMPLEMENTATION_READINESS.md), [26_API_STABILITY.md](26_API_STABILITY.md). Build order: [16_ENGINEERING_SPRINTS.md](16_ENGINEERING_SPRINTS.md) (supersedes the checkpoint numbering in [milestone-2-implementation-plan.md](milestone-2-implementation-plan.md), which is kept for its dependency reasoning). **From Sprint 2.1 onward, documentation follows implementation rather than preceding it** — this doc's Milestone 3+ entries stay sketch-level until their own milestone starts, per the process change recorded in [27_RC0_APPROVAL.md](27_RC0_APPROVAL.md).

## Milestone 3 — Coffee Physics

Subtle liquid simulation: surface tilt/inertia/ripple on cup rotation, foam reaction. `engine/shaders/coffee/` and `foam/` created. Builds directly on the Milestone-1 `useCupInteractionState` machine (drag/rotate states now drive real physics, not just camera response).

## Milestone 4 — Live Customizer

Cup color/material/texture/finish, logo placement, sleeve, size/temperature, and the full ingredient list (beans/milk/sugar/sweetener/foam/whipped cream/flavors) wired to live 3D updates, price, and nutrition. Real Zustand-backed customizer state is introduced here — no earlier milestone has unused config scaffolding waiting for it.

## Milestone 5 — Ingredient Builder & Menu

Drag-and-drop ingredient interactions with physics/particles/sound (`audio/` created here — first real sound need). Product menu (Espresso/Americano/Latte/.../Seasonal) with morphing cup/lighting/particles per selection.

## Milestone 6 — Scroll Storytelling

Cinematic scroll-driven camera movement, cup exploded view, roasting/grinding/brewing narrative. Camera presets `exploded` and any narrative-specific presets get registered. GSAP ScrollTrigger-driven sequencing on top of the Milestone-1 motion engine.

## Milestone 7 — AI Barista

Recommendation flow (mood/energy/sweetness/temperature/time-of-day questions → animated recommendation). Camera preset `ai` registered. **Known gap, flagged by [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md), deliberately not pre-solved**: this is the first feature needing real async data-fetching (a recommendation call). TanStack Query has been wired since Milestone 1 for exactly this, but no convention yet exists for query keys, loading/error states, or where that logic lives — a short design pass at the start of this milestone, not a retrofit under pressure.

## Milestone 8 — Shopping Experience

`features/commerce/{cart,checkout,orders,payments}/` created here, following the `hero-cup` feature-README template. Animated cart, floating checkout, confetti, order timeline. Camera preset `checkout` registered. `engine/analytics/events.ts` gains real commerce events.

## Milestone 9 — Performance, Accessibility, SEO Hardening

Full audit pass across everything shipped so far: bundle/texture/shader optimization, full keyboard/screen-reader pass beyond what each milestone already required, metadata/OpenGraph/structured data, sitemap/robots. `docs/11_TESTING_QA.md`'s target test stack (Vitest/RTL/Playwright) gets actually installed once there's enough interactive surface to justify it.

## Milestone 10 — Final Polish

Cross-milestone consistency pass, motion/animation refinement, the cumulative Creative Director Review across the whole experience rather than a single milestone.

## Related

[00_SYSTEM_PROMPT.md](00_SYSTEM_PROMPT.md) · [01_ARCHITECTURE.md](01_ARCHITECTURE.md) · [09_CREATIVE_DIRECTOR_REVIEW.md](09_CREATIVE_DIRECTOR_REVIEW.md)
